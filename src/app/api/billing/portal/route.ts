import { eq } from 'drizzle-orm'
import Stripe from 'stripe'

import { appUrl, capabilities, env } from '@/lib/env'
import { requireSession } from '@/server/auth/session'
import { AuthorizationError, toClientError } from '@/server/auth/errors'
import { getDb } from '@/server/db'
import { subscriptions } from '@/server/db/schema'

/**
 * Stripe Billing Portal.
 *
 * The customer is read from the subscription row for the session's
 * organization; a customer id is never accepted from the client.
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
      throw new AuthorizationError('Only an owner or admin can manage billing for this workspace.')
    }

    const db = await getDb()
    const rows = await db
      .select({ stripeCustomerId: subscriptions.stripeCustomerId })
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, session.organization.id))
      .limit(1)

    const customerId = rows[0]?.stripeCustomerId
    if (!customerId) {
      return Response.json(
        {
          ok: false,
          error:
            'This workspace has no billing account yet. Start a Pro checkout first — the billing portal becomes available once a subscription exists.',
          code: 'no_customer',
        },
        { status: 400 },
      )
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY!, { maxNetworkRetries: 2 })
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/app/settings/billing`,
    })

    return Response.json({ ok: true, url: portal.url })
  } catch (error) {
    const { message, code, status } = toClientError(error)
    return Response.json({ ok: false, error: message, code }, { status })
  }
}
