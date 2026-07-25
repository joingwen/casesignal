import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight } from 'lucide-react'
import { AnnotatedRule, Eyebrow, Section, SectionHeading } from '@/components/marketing/section'
import { PlanLimitsTable, PricingTable } from '@/components/marketing/pricing'
import { Faq, type FaqItem } from '@/components/marketing/faq'
import { PLANS } from '@/lib/domain'

export const metadata: Metadata = {
  title: 'Pricing — CaseSignal',
  description:
    'CaseSignal pricing: a free plan with two active cases and no time limit, and a Pro plan at $24 per month for continuing investigations, PDF dossiers and public evidence rooms.',
}

const PRICING_FAQ: FaqItem[] = [
  {
    question: 'How is CaseSignal billed?',
    answer:
      'Monthly, in advance, with no annual commitment and no setup fee. Pro is charged per workspace, not per seat, so adding colleagues to a workspace does not change the price. Billing is handled by our payment provider; card details are entered in their checkout and are never handled by CaseSignal.',
  },
  {
    question: 'What counts as a “processed page”?',
    answer: (
      <>
        <p>
          One page of extracted source material. A PDF page is one page. For records without printed pages, CaseSignal
          normalises to a comparable unit: roughly three thousand characters of extracted text from a DOCX, text file,
          note, paste or webpage counts as one page, and a spreadsheet is counted from the rows it actually contains
          rather than from its empty grid. One image counts as one page.
        </p>
        <p className="mt-3">
          Pages are counted once, when a record is first processed. Re-reading a record you already indexed, opening its
          citations, exporting it or asking further questions about it does not consume pages again. Re-uploading the same
          file as a new source does, because it is processed again.
        </p>
      </>
    ),
  },
  {
    question: 'What happens when I reach a limit?',
    answer: (
      <>
        <p>
          The operation that would exceed the limit stops, and nothing that already exists is altered, hidden or deleted.
          You are told which limit was reached, what the limit is, what it applies to, and when it resets. Existing cases
          stay fully readable, exportable and deletable on any plan, including after a downgrade.
        </p>
        <p className="mt-3">
          Monthly counters — processed pages and AI operations — reset at the start of each billing period. Capacity
          limits, such as active cases and storage, are relieved by archiving or deleting, or by upgrading.
        </p>
      </>
    ),
  },
  {
    question: 'Is the free plan a trial?',
    answer: `No. The free plan is not time-limited and does not expire. It includes ${PLANS.free.activeCases} active cases, ${PLANS.free.processedPagesPerMonth.toLocaleString('en-US')} processed pages and ${PLANS.free.aiOperationsPerMonth.toLocaleString('en-US')} AI operations per month, the full case map, source-backed questions and Markdown export. No card is required to start, and none is requested until you choose to upgrade.`,
  },
  {
    question: 'What does Pro add?',
    answer: `Scale and publication. Pro raises active cases to ${PLANS.pro.activeCases}, processed pages to ${PLANS.pro.processedPagesPerMonth.toLocaleString('en-US')} per month and storage to ${Math.round(
      PLANS.pro.storageBytes / (1024 * 1024 * 1024),
    )} GB, and adds advanced contradiction analysis, PDF dossier export, public evidence rooms and priority processing. The evidence model, the citation guarantees and the neutrality of the analysis are identical on both plans.`,
  },
  {
    question: 'Can I cancel, and what happens to my cases?',
    answer:
      'Cancel at any time from workspace settings. Your workspace stays on Pro until the end of the period you have already paid for, then returns to the free plan. Cases above the free limit are not deleted: they become read-only until you archive or delete enough of them to fit, and you can export or delete any case at any time regardless of plan. There is no cancellation fee and no lock-in on your data.',
  },
  {
    question: 'Do you offer refunds?',
    answer:
      'If something goes wrong on our side, write to us and we will make it right, including a refund of the period affected. We do not automatically refund unused time on a cancelled month, because the free plan means you can evaluate CaseSignal on real records before paying anything.',
  },
  {
    question: 'Are there discounts for newsrooms, nonprofits or academics?',
    answer:
      'We do not publish a discount programme, and we would rather not advertise one we cannot honour consistently. If the price is the obstacle for accountability work, get in touch and describe the work — we will give you a straight answer.',
  },
]

export default function PricingPage() {
  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <section className="px-5 pb-14 pt-12 text-center sm:pt-16 lg:px-10 lg:pb-20 lg:pt-24">
        <div className="mx-auto max-w-[760px]">
          <Eyebrow>Pricing</Eyebrow>
          <h1 className="text-display-sm mt-5 text-balance font-semibold text-ink sm:text-display-md">
            Start free. Upgrade when the case grows.
          </h1>
          <p className="text-lede mx-auto mt-6 max-w-[600px] text-pretty text-ink-secondary">
            Two plans, monthly billing, no seat count. The numbers below are read from the same configuration the server
            enforces them from, so what is published and what is enforced cannot drift apart.
          </p>
          <p className="mt-5 text-[12.5px] text-ink-muted">
            No credit card required · The free plan is not time-limited
          </p>
        </div>
      </section>

      {/* ----------------------------------------------------------- plans */}
      <Section tone="canvas">
        <div className="mx-auto max-w-[900px]">
          <PricingTable />
        </div>
        <p className="mx-auto mt-6 max-w-[620px] text-center text-[13px] leading-relaxed text-ink-muted">
          Pro is priced per workspace. Adding colleagues to a workspace does not change what you pay.
        </p>
      </Section>

      {/* ----------------------------------------------------------- limits */}
      <Section tone="page">
        <SectionHeading
          align="split"
          eyebrow="Limits in detail"
          title="Exactly what each plan includes."
          description="Every limit here is enforced on the server from this same configuration. Nothing on this table is aspirational."
        />
        <div className="mt-12 lg:mt-16">
          <PlanLimitsTable />
        </div>
        <p className="mt-6 text-[13px] leading-relaxed text-ink-muted">
          An AI operation is one analysis step: summarising a source, extracting claims, extracting a timeline, comparing
          records for differences, answering a question, or drafting a brief section. Reading, editing and exporting what
          has already been produced costs nothing.
        </p>
      </Section>

      {/* ------------------------------------------------ reaching a limit */}
      <Section tone="canvas">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:gap-20">
          <SectionHeading
            eyebrow="When a limit is reached"
            title="Work in progress is never destroyed."
            description="Hitting a limit should be an interruption you understand, not a failure you have to reverse-engineer."
          />
          <div className="grid gap-px overflow-hidden rounded-preview border border-line bg-line sm:grid-cols-2">
            <LimitStep
              index="01"
              title="The operation stops before it starts"
              body="The request that would exceed the limit is declined at the boundary. Nothing is partially processed, and nothing that already exists in the case is altered."
            />
            <LimitStep
              index="02"
              title="You are told which limit, and what it is"
              body="The message names the specific limit — active cases, processed pages, AI operations, storage or evidence rooms — states your plan's number for it, and shows where you currently stand."
            />
            <LimitStep
              index="03"
              title="You are told how to clear it"
              body="Monthly counters reset at the start of the next billing period, and the message says when that is. Capacity limits are cleared by archiving or deleting — both of which stay available on every plan."
            />
            <LimitStep
              index="04"
              title="Upgrading is offered, not forced"
              body="An upgrade path is shown alongside the alternatives. Declining it leaves the workspace exactly as it was: readable, exportable and deletable."
            />
          </div>
        </div>

        <AnnotatedRule label="Named limit · Preserved work · Reversible choice" className="mt-14 lg:mt-20" />
      </Section>

      {/* -------------------------------------------------------------- FAQ */}
      <Section tone="page">
        <SectionHeading align="split" eyebrow="Billing questions" title="What you are paying for, in plain terms." />
        <div className="mt-10 lg:mt-14">
          <Faq items={PRICING_FAQ} />
        </div>
        <p className="mt-8 text-[13px] leading-relaxed text-ink-muted">
          Product questions are answered on the{' '}
          <Link href="/product" className="text-ink underline underline-offset-4">
            product tour
          </Link>
          , and the handling of your records is set out in the{' '}
          <Link href="/security" className="text-ink underline underline-offset-4">
            security overview
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-ink underline underline-offset-4">
            privacy policy
          </Link>
          .
        </p>
      </Section>

      {/* ------------------------------------------------------- final CTA */}
      <section className="border-t border-line bg-canvas">
        <div className="mx-auto max-w-[1280px] px-5 py-20 text-center lg:px-10 lg:py-28">
          <h2 className="text-section-sm mx-auto max-w-[720px] text-balance font-semibold text-ink lg:text-section">
            Try it on a real record set first.
          </h2>
          <p className="text-lede mx-auto mt-5 max-w-[540px] text-pretty text-ink-secondary">
            The free plan is enough to run a complete case from upload to exported brief. Upgrade only once the work
            outgrows it.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-control bg-ink px-7 text-[15px] font-medium text-white transition-colors duration-200 ease-editorial hover:bg-ink/90 sm:w-auto"
            >
              Start free
              <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-editorial group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/demo"
              className="inline-flex h-12 w-full items-center justify-center rounded-control border border-line-strong px-7 text-[15px] font-medium text-ink transition-colors duration-200 hover:bg-surface sm:w-auto"
            >
              Explore the demo
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

function LimitStep({ index, title, body }: { index: string; title: string; body: string }) {
  return (
    <div className="bg-canvas p-6 lg:p-7">
      <div className="flex items-baseline gap-3">
        <span className="tabular font-mono text-[12px] text-ink-muted">{index}</span>
        <h3 className="text-[16px] font-semibold tracking-tight text-ink">{title}</h3>
      </div>
      <p className="mt-3 text-[13.5px] leading-relaxed text-ink-secondary">{body}</p>
    </div>
  )
}
