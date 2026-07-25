import type { Metadata } from 'next'
import { Check, Minus } from 'lucide-react'

import { Badge } from '@/components/ui'
import { PLANS } from '@/lib/domain'
import { capabilities } from '@/lib/env'
import { requireSession } from '@/server/auth/session'
import { getPlanState, getUsageSnapshot } from '@/server/billing/limits'
import { cn, formatDate } from '@/lib/utils'
import { BillingActions } from '@/components/app/billing-actions'
import { UsageStrip } from '@/components/app/usage-meter'

export const metadata: Metadata = {
  title: 'Billing',
  description: 'Your plan, its limits and current usage.',
}

export default async function BillingSettingsPage() {
  const session = await requireSession()
  const [planState, usage] = await Promise.all([
    getPlanState(session.organization.id),
    getUsageSnapshot(session.organization.id),
  ])

  const plans = [PLANS.free, PLANS.pro]

  return (
    <div className="flex flex-col gap-8">
      {/* --------------------------------------------------------- current */}
      <section aria-labelledby="plan-heading">
        <h2 id="plan-heading" className="text-[17px] font-medium tracking-tight text-ink">
          Current plan
        </h2>

        <div className="mt-4 rounded-panel border border-line bg-canvas p-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-[20px] font-medium tracking-tight text-ink">{planState.plan.name}</p>
            <p className="tabular text-sm text-ink-secondary">
              {planState.plan.priceMonthly === 0
                ? 'No charge'
                : `$${planState.plan.priceMonthly} per month`}
            </p>
            {planState.status !== 'active' ? (
              <Badge variant="outline">{planState.status.replace(/_/g, ' ')}</Badge>
            ) : null}
            {planState.cancelAtPeriodEnd ? <Badge variant="signal">Cancels at period end</Badge> : null}
          </div>

          <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">
            {planState.plan.blurb}
          </p>

          {planState.currentPeriodEnd ? (
            <p className="mt-2 text-[12.5px] text-ink-muted">
              {planState.cancelAtPeriodEnd ? 'Access ends' : 'Renews'}{' '}
              {formatDate(planState.currentPeriodEnd)}.
            </p>
          ) : null}

          <div className="mt-4">
            <BillingActions
              stripeEnabled={capabilities.stripe}
              planId={planState.planId}
              hasCustomer={Boolean(planState.stripeCustomerId)}
            />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- usage */}
      <section aria-labelledby="usage-heading" className="border-t border-line pt-8">
        <h2 id="usage-heading" className="text-[17px] font-medium tracking-tight text-ink">
          Usage this period
        </h2>
        <div className="mt-4 overflow-hidden rounded-panel border border-line">
          <UsageStrip
            usage={usage}
            metrics={['active_cases', 'processed_pages', 'ai_operations']}
            className="border-b-0 px-4 lg:px-4"
          />
        </div>
      </section>

      {/* --------------------------------------------------------- compare */}
      <section aria-labelledby="compare-heading" className="border-t border-line pt-8">
        <h2 id="compare-heading" className="text-[17px] font-medium tracking-tight text-ink">
          What each plan includes
        </h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {plans.map((plan) => {
            const current = plan.id === planState.planId
            return (
              <div
                key={plan.id}
                className={cn(
                  'rounded-panel border p-4',
                  current ? 'border-evidence-border bg-evidence-soft' : 'border-line bg-canvas',
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[15px] font-medium text-ink">{plan.name}</p>
                  {current ? <Badge variant="evidence">Current</Badge> : null}
                </div>
                <p className="tabular mt-1 text-sm text-ink-secondary">
                  {plan.priceMonthly === 0 ? 'Free' : `$${plan.priceMonthly}/month`}
                </p>

                <ul className="mt-3.5 flex flex-col gap-1.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-[13px] text-ink">
                      <Check
                        className="mt-0.5 size-3.5 shrink-0 text-status-supported"
                        aria-hidden="true"
                      />
                      {feature}
                    </li>
                  ))}
                  {plan.publicEvidenceRooms === 0 ? (
                    <li className="flex items-start gap-2 text-[13px] text-ink-muted">
                      <Minus className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      No public evidence rooms
                    </li>
                  ) : null}
                  {!plan.pdfExport ? (
                    <li className="flex items-start gap-2 text-[13px] text-ink-muted">
                      <Minus className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      No PDF dossier export
                    </li>
                  ) : null}
                </ul>
              </div>
            )
          })}
        </div>

        <p className="mt-4 text-[12.5px] leading-relaxed text-ink-muted">
          Limits are enforced from a single definition shared by this page and the server, so what is
          listed here is exactly what is checked when you create a case or process a record.
        </p>
      </section>
    </div>
  )
}
