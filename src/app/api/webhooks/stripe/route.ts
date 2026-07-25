import { eq } from 'drizzle-orm'
import Stripe from 'stripe'

import { capabilities, env } from '@/lib/env'
import { getDb } from '@/server/db'
import { organizations, subscriptions } from '@/server/db/schema'
import { isUuid } from '@/server/auth/guard'

/**
 * Stripe webhook.
 *
 * Entitlements are only ever granted here, from a signature-verified payload
 * read as the exact raw bytes Stripe signed. Nothing in this file trusts a
 * value that could have been supplied by a browser: the organization is
 * resolved from subscription metadata that the server itself set at checkout,
 * or from the customer id already stored on the subscription row.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Statuses that keep Pro entitlements switched on. */
const ENTITLED_STATUSES = new Set(['active', 'trialing', 'past_due'])

type PlanId = 'free' | 'pro'

interface SubscriptionPatch {
  plan?: PlanId
  status?: string
  stripeSubscriptionId?: string | null
  stripeCustomerId?: string | null
  currentPeriodEnd?: Date | null
  cancelAtPeriodEnd?: boolean
}

export async function POST(request: Request) {
  if (!capabilities.stripe || !env.STRIPE_WEBHOOK_SECRET) {
    return Response.json({ received: false, error: 'Billing is not configured.' }, { status: 400 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return Response.json({ received: false, error: 'Missing signature.' }, { status: 400 })
  }

  // The raw body is required: any re-serialisation invalidates the signature.
  const body = await request.text()

  const stripe = new Stripe(env.STRIPE_SECRET_KEY!, { maxNetworkRetries: 2 })

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, env.STRIPE_WEBHOOK_SECRET)
  } catch {
    // The reason is deliberately not echoed back or logged — it would describe
    // the shape of a valid signature to whoever is probing the endpoint.
    return Response.json({ received: false, error: 'Invalid signature.' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        if (session.mode !== 'subscription') break
        const customerId = idOf(session.customer)
        const organizationId = await resolveOrganization({
          candidate: session.metadata?.organizationId ?? session.client_reference_id,
          customerId,
        })
        if (!organizationId) break

        const subscriptionId = idOf(session.subscription)
        const patch: SubscriptionPatch = {
          plan: 'pro',
          status: 'active',
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
        }

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId).catch(() => null)
          if (subscription) {
            patch.plan = ENTITLED_STATUSES.has(subscription.status) ? 'pro' : 'free'
            patch.status = subscription.status
            patch.currentPeriodEnd = periodEnd(subscription)
            patch.cancelAtPeriodEnd = subscription.cancel_at_period_end
          }
        }

        await applyPatch(organizationId, patch)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const customerId = idOf(subscription.customer)
        const organizationId = await resolveOrganization({
          candidate: subscription.metadata?.organizationId,
          customerId,
        })
        if (!organizationId) break

        const removed = event.type === 'customer.subscription.deleted'
        await applyPatch(organizationId, {
          plan: removed || !ENTITLED_STATUSES.has(subscription.status) ? 'free' : 'pro',
          status: removed ? 'canceled' : subscription.status,
          stripeCustomerId: customerId,
          stripeSubscriptionId: removed ? null : subscription.id,
          currentPeriodEnd: periodEnd(subscription),
          cancelAtPeriodEnd: removed ? false : subscription.cancel_at_period_end,
        })
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const customerId = idOf(invoice.customer)
        const details = invoice.parent?.subscription_details ?? null
        const organizationId = await resolveOrganization({
          candidate: details?.metadata?.organizationId,
          customerId,
        })
        if (!organizationId) break

        // The plan is left in place: Stripe retries, and access should not drop
        // out from under an analyst mid-case on the first failed charge.
        await applyPatch(organizationId, {
          status: 'past_due',
          stripeCustomerId: customerId,
          stripeSubscriptionId: idOf(details?.subscription ?? null),
        })
        break
      }

      default:
        break
    }
  } catch {
    // A handler failure must not be reported as success, or Stripe will stop
    // retrying. Nothing about the payload is logged.
    return Response.json({ received: false }, { status: 500 })
  }

  return Response.json({ received: true }, { status: 200 })
}

/* ------------------------------------------------------------------ helpers */

function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : value.id
}

/**
 * Period end moved onto subscription items in recent API versions. Both shapes
 * are read so the handler survives an account pinned to an older version.
 */
function periodEnd(subscription: Stripe.Subscription): Date | null {
  const legacy = (subscription as Stripe.Subscription & { current_period_end?: number | null }).current_period_end
  let seconds: number | null = typeof legacy === 'number' ? legacy : null

  if (seconds === null) {
    for (const item of subscription.items?.data ?? []) {
      if (typeof item.current_period_end === 'number' && (seconds === null || item.current_period_end > seconds)) {
        seconds = item.current_period_end
      }
    }
  }

  return seconds === null ? null : new Date(seconds * 1000)
}

/**
 * Resolves the organization from metadata the server wrote at checkout, falling
 * back to the customer id already recorded on a subscription row. A metadata
 * value that does not name a real organization is discarded rather than trusted.
 */
async function resolveOrganization(input: {
  candidate?: string | null
  customerId: string | null
}): Promise<string | null> {
  const db = await getDb()

  if (input.candidate && isUuid(input.candidate)) {
    const rows = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, input.candidate))
      .limit(1)
    if (rows[0]) return rows[0].id
  }

  if (input.customerId) {
    const rows = await db
      .select({ organizationId: subscriptions.organizationId })
      .from(subscriptions)
      .where(eq(subscriptions.stripeCustomerId, input.customerId))
      .limit(1)
    if (rows[0]) return rows[0].organizationId
  }

  return null
}

async function applyPatch(organizationId: string, patch: SubscriptionPatch) {
  const db = await getDb()
  const values: Record<string, unknown> = { updatedAt: new Date() }
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) values[key] = value
  }

  const existing = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, organizationId))
    .limit(1)

  if (existing[0]) {
    await db.update(subscriptions).set(values).where(eq(subscriptions.organizationId, organizationId))
    return
  }

  await db
    .insert(subscriptions)
    .values({
      organizationId,
      plan: patch.plan ?? 'free',
      status: patch.status ?? 'active',
      stripeCustomerId: patch.stripeCustomerId ?? null,
      stripeSubscriptionId: patch.stripeSubscriptionId ?? null,
      currentPeriodEnd: patch.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: patch.cancelAtPeriodEnd ?? false,
    })
    .onConflictDoNothing()
}
