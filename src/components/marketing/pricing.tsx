import Link from 'next/link'
import { Check, Minus } from 'lucide-react'
import { PLANS } from '@/lib/domain'
import { cn } from '@/lib/utils'

/**
 * Pricing renders directly from the PLANS object that also enforces limits on
 * the server, so the published numbers and the enforced numbers cannot drift.
 */
export function PricingTable({ compact = false }: { compact?: boolean }) {
  const plans = [PLANS.free, PLANS.pro]

  return (
    <div className="grid gap-px overflow-hidden rounded-preview border border-line bg-line md:grid-cols-2">
      {plans.map((plan) => {
        const isPro = plan.id === 'pro'
        return (
          <div key={plan.id} className={cn('bg-canvas p-6 lg:p-9', isPro && 'bg-page')}>
            <div className="flex items-baseline justify-between">
              <h3 className="text-[19px] font-semibold tracking-tight text-ink">{plan.name}</h3>
              {isPro && (
                <span className="rounded-full border border-evidence-border bg-evidence-soft px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wide text-evidence-deep">
                  For ongoing work
                </span>
              )}
            </div>

            <p className="mt-4 flex items-baseline gap-1.5">
              <span className="tabular text-[42px] font-semibold leading-none tracking-tight text-ink">
                ${plan.priceMonthly}
              </span>
              <span className="text-[13.5px] text-ink-secondary">/ month</span>
            </p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-ink-secondary">{plan.blurb}</p>

            <Link
              href="/sign-up"
              className={cn(
                'mt-6 inline-flex h-11 w-full items-center justify-center rounded-control text-[14.5px] font-medium transition-colors duration-200 ease-editorial',
                isPro
                  ? 'bg-ink text-white hover:bg-ink/90'
                  : 'border border-line-strong bg-canvas text-ink hover:bg-surface',
              )}
            >
              {isPro ? 'Start with Pro' : 'Start free'}
            </Link>

            <ul className="mt-7 space-y-3 border-t border-line pt-6">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-ink">
                  <Check className={cn('mt-0.5 h-4 w-4 shrink-0', isPro ? 'text-evidence' : 'text-ink-muted')} />
                  {feature}
                </li>
              ))}
              {!isPro && !compact && (
                <>
                  <li className="flex items-start gap-2.5 text-[13.5px] leading-snug text-ink-muted">
                    <Minus className="mt-0.5 h-4 w-4 shrink-0" />
                    PDF dossiers
                  </li>
                  <li className="flex items-start gap-2.5 text-[13.5px] leading-snug text-ink-muted">
                    <Minus className="mt-0.5 h-4 w-4 shrink-0" />
                    Public evidence rooms
                  </li>
                </>
              )}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

export function PlanLimitsTable() {
  const rows: { label: string; free: string; pro: string }[] = [
    { label: 'Active cases', free: String(PLANS.free.activeCases), pro: String(PLANS.pro.activeCases) },
    {
      label: 'Processed pages per month',
      free: PLANS.free.processedPagesPerMonth.toLocaleString('en-US'),
      pro: PLANS.pro.processedPagesPerMonth.toLocaleString('en-US'),
    },
    {
      label: 'AI operations per month',
      free: PLANS.free.aiOperationsPerMonth.toLocaleString('en-US'),
      pro: PLANS.pro.aiOperationsPerMonth.toLocaleString('en-US'),
    },
    {
      label: 'Storage',
      free: `${Math.round(PLANS.free.storageBytes / (1024 * 1024))} MB`,
      pro: `${Math.round(PLANS.pro.storageBytes / (1024 * 1024 * 1024))} GB`,
    },
    { label: 'Public evidence rooms', free: '—', pro: String(PLANS.pro.publicEvidenceRooms) },
    { label: 'Advanced contradiction analysis', free: '—', pro: 'Included' },
    { label: 'PDF dossier export', free: '—', pro: 'Included' },
    { label: 'Markdown export', free: 'Included', pro: 'Included' },
    { label: 'Priority processing', free: '—', pro: 'Included' },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse">
        <caption className="sr-only">Plan limits compared</caption>
        <thead>
          <tr className="border-b border-line-strong text-left">
            <th scope="col" className="py-3 pr-4 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
              Limit
            </th>
            <th scope="col" className="w-[140px] py-3 pr-4 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
              Free
            </th>
            <th scope="col" className="w-[140px] py-3 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
              Pro
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="py-3 pr-4 text-[13.5px] text-ink">{row.label}</td>
              <td className="tabular py-3 pr-4 text-[13.5px] text-ink-secondary">{row.free}</td>
              <td className="tabular py-3 text-[13.5px] text-ink">{row.pro}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
