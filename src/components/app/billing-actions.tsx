'use client'

import * as React from 'react'

import { Button, toast } from '@/components/ui'

interface BillingResponse {
  url?: string
  error?: string
  data?: { url?: string }
}

async function post(endpoint: string) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
  })
  const payload = (await response.json().catch(() => null)) as BillingResponse | null
  const url = payload?.url ?? payload?.data?.url
  if (!response.ok || !url) {
    throw new Error(payload?.error ?? 'Billing is unavailable right now. Please try again.')
  }
  return url
}

/**
 * Checkout and portal handoffs. When Stripe has no credentials the buttons are
 * rendered disabled with the reason stated beside them — never a control that
 * silently does nothing.
 */
export function BillingActions({
  stripeEnabled,
  planId,
  hasCustomer,
}: {
  stripeEnabled: boolean
  planId: 'free' | 'pro'
  hasCustomer: boolean
}) {
  const [pending, setPending] = React.useState<'checkout' | 'portal' | null>(null)

  async function run(kind: 'checkout' | 'portal') {
    setPending(kind)
    try {
      const url = await post(`/api/billing/${kind}`)
      window.location.href = url
    } catch (error) {
      setPending(null)
      toast.error(error instanceof Error ? error.message : 'Something went wrong.')
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {planId === 'free' ? (
          <Button
            variant="primary"
            disabled={!stripeEnabled}
            loading={pending === 'checkout'}
            onClick={() => void run('checkout')}
          >
            Upgrade to Pro
          </Button>
        ) : null}

        <Button
          variant="secondary"
          disabled={!stripeEnabled || !hasCustomer}
          loading={pending === 'portal'}
          onClick={() => void run('portal')}
        >
          Manage subscription
        </Button>
      </div>

      {!stripeEnabled ? (
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-secondary">
          Billing is not configured in this environment (STRIPE_SECRET_KEY is unset).
        </p>
      ) : !hasCustomer ? (
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-secondary">
          The subscription portal opens once there is a Stripe customer for this workspace — that
          happens at your first checkout.
        </p>
      ) : null}
    </div>
  )
}
