import { eq } from 'drizzle-orm'
import Stripe from 'stripe'

import { appUrl, capabilities, env } from '@/lib/env'
import { requireSession } from '@/server/auth/session'
import { AuthorizationError, toClientError } from '@/server/auth/errors'
import { recordAudit } from '@/server/auth/guard'
import { getDb } from '@/server/db'
import { subscriptions } from '@/server/db/schema'

/**
 * Stripe Checkout.
 *
 * The organization is taken from the server session, never from the request
 * body, and it travels to Stripe as `client_reference_id` plus metadata so the
 * webhook can resolve it without trusting anything the browser sent.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NOT_CONFIGURED = 'Billing is not configured in this environment.'

export async function POST() {
  if (!capabilities.stripe) {
    return Response.json({ ok: false, error: NOT_CONFIGURED, code: 'not_configured' }, { status: 400 })
  }

  try {
    const session = await requireSession()
    if (session.membershipRole === 'viewer') {
      throw new AuthorizationError('Only an owner or admin can change the plan for this workspace.')
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY!, { maxNetworkRetries: 2 })
    const db = await getDb()

    const rows = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, session.organization.id))
      .limit(1)
    let row = rows[0]
    if (!row) {
      const inserted = await db
        .insert(subscriptions)
        .values({ organizationId: session.organization.id, plan: 'free' })
        .returning()
      row = inserted[0]
    }

    let customerId = row?.stripeCustomerId ?? null
    if (customerId) {
      // A customer deleted in the Stripe dashboard must not wedge checkout.
      const existing = await stripe.customers.retrieve(customerId).catch(() => null)
      if (!existing || ('deleted' in existing && existing.deleted)) customerId = null
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.profile.email,
        name: session.organization.name,
        metadata: { organizationId: session.organization.id },
      })
      customerId = customer.id
      await db
        .update(subscriptions)
        .set({ stripeCustomerId: customerId, updatedAt: new Date() })
        .where(eq(subscriptions.organizationId, session.organization.id))
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
      success_url: `${appUrl}/app/settings/billing?upgraded=1`,
      cancel_url: `${appUrl}/app/settings/billing`,
      client_reference_id: session.organization.id,
      metadata: { organizationId: session.organization.id },
      subscription_data: { metadata: { organizationId: session.organization.id } },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    })

    if (!checkout.url) {
      return Response.json(
        { ok: false, error: 'Stripe did not return a checkout link. Try again in a moment.', code: 'checkout_failed' },
        { status: 502 },
      )
    }

    await recordAudit({
      organizationId: session.organization.id,
      profileId: session.profile.id,
      action: 'billing.checkout_started',
      targetType: 'subscription',
      targetId: session.organization.id,
      detail: { summary: 'Started a Pro checkout session' },
    })

    return Response.json({ ok: true, url: checkout.url })
  } catch (error) {
    const { message, code, status } = toClientError(error)
    return Response.json({ ok: false, error: message, code }, { status })
  }
}
