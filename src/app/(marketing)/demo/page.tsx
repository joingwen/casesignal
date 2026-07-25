import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, TriangleAlert } from 'lucide-react'
import { HeroPreview } from '@/components/marketing/hero-preview'
import { CitationStage } from '@/components/marketing/citation-stage'
import { AnnotatedRule, Eyebrow, Section, SectionHeading } from '@/components/marketing/section'
import { CopilotPanel, DiscrepancyPanel, SpreadsheetPanel, TimelinePanel } from '@/components/marketing/panels'
import { DEMO_BANNER, NEUTRALITY_DISCLAIMER } from '@/lib/domain'
import { XIcon } from '@/components/brand/x-icon'
import { X_HANDLE, X_URL } from '@/lib/social'

export const metadata: Metadata = {
  title: 'Interactive demo — CaseSignal',
  description:
    'Walk through a complete CaseSignal case using the Northstar County Equipment Procurement Review — a fictional record set built for demonstration. Inspect citations, differences, the timeline and a source-backed answer.',
}

const SEQUENCE = [
  {
    index: '01',
    title: 'Create the case',
    body: 'Name the case and choose the Public Procurement Review template. The template sets the objective — trace a procurement from request through award, invoice and delivery — and the focus areas the analysis will pay attention to.',
  },
  {
    index: '02',
    title: 'Upload the records',
    body: 'Add the purchase request, the vendor proposal, the notice of award, the committee minutes, the invoice register and the receiving report. Point at the county procurement page by URL, and paste your own interview notes as a source.',
  },
  {
    index: '03',
    title: 'Build the case map',
    body: 'Run extraction. Claims, dated events and named parties come out of the excerpts, each carrying the page, sheet row or section it came from. Read the claim ledger before reading anything else.',
  },
  {
    index: '04',
    title: 'Inspect a difference',
    body: 'Open the delivery-date difference. Read both excerpts side by side, open each in its original record, and decide whether a further document explains it. Mark it needs follow-up if it does not.',
  },
  {
    index: '05',
    title: 'Ask a source-backed question',
    body: 'Ask the copilot which records disagree about the delivery date, then check each citation it returns by opening it. The answer is only as good as the passages behind it — so read them.',
  },
  {
    index: '06',
    title: 'Export the dossier',
    body: 'Assemble the brief, include the claims and differences you have reviewed, and export it as Markdown or PDF — or publish a read-only evidence room containing only the items you selected.',
  },
]

export default function DemoPage() {
  return (
    <>
      {/* --------------------------------------------------------- banner */}
      <div className="border-b border-signal-border bg-signal-soft">
        <div className="mx-auto flex max-w-[1280px] items-start gap-3.5 px-5 py-4 lg:px-10 lg:py-5">
          <TriangleAlert className="mt-0.5 h-[18px] w-[18px] shrink-0 text-signal" aria-hidden />
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-signal">{DEMO_BANNER}</p>
            <p className="mt-1.5 max-w-[860px] text-[13.5px] leading-relaxed text-ink">
              Northstar County, Halvorsen Office Systems, every person named and every document shown on this page are
              invented for demonstration. They refer to no real jurisdiction, agency, company, person, election, contract
              or allegation. Nothing here is a finding about anyone.
            </p>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------ hero */}
      <section className="px-5 pb-14 pt-12 sm:pt-16 lg:px-10 lg:pb-20 lg:pt-20">
        <div className="mx-auto max-w-[1280px]">
          <div className="max-w-[860px]">
            <Eyebrow>Interactive demo · Fictional case</Eyebrow>
            <h1 className="text-display-sm mt-5 text-balance font-semibold text-ink sm:text-display-md">
              Northstar County Equipment Procurement Review
            </h1>
            <p className="text-lede mt-6 max-w-[660px] text-pretty text-ink-secondary">
              Seven records describe one purchase of 240 workstations. They do not entirely agree with one another. This
              page walks through what an analyst sees at each step — and, at every step, where the statement on screen came
              from.
            </p>
          </div>

          <dl className="mt-10 grid gap-x-8 gap-y-5 border-t border-line pt-6 sm:grid-cols-2 lg:mt-12 lg:grid-cols-4">
            {[
              { label: 'Case template', value: 'Public Procurement Review' },
              { label: 'Records', value: '7' },
              { label: 'Objective', value: 'Reconcile what was ordered, invoiced and received' },
              { label: 'Status', value: 'Two differences open' },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-muted">{item.label}</dt>
                <dd className="mt-1.5 text-[14px] leading-snug text-ink">{item.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-12 lg:mt-14">
            <HeroPreview />
          </div>

          <p className="mt-5 max-w-[760px] text-[13px] leading-relaxed text-ink-muted">
            This is the case workspace in miniature. Select a citation to move the highlight in the document, select a
            record to open it, or hover an edge in the graph to name the relationship it represents.
          </p>
        </div>
      </section>

      {/* --------------------------------------------------- discrepancy */}
      <Section tone="canvas">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Step one · What the analyst notices"
              title="Two records give a different delivery date."
              description="Nothing in the case flags this as wrongdoing. It flags that two documents state different things about the same event, and shows you both."
            />
            <p className="mt-8 border-t border-line pt-8 text-[13.5px] leading-relaxed text-ink-secondary">
              The vendor proposal commits to September 10. The committee minutes record September 18 and note that no
              formal amendment was tabled. Either the schedule changed and the change was documented somewhere not yet in
              this case, or it changed without being documented. The record set does not settle which — so the difference
              stays open and is marked as needing follow-up.
            </p>
          </div>
          <DiscrepancyPanel />
        </div>
      </Section>

      {/* ------------------------------------------------------- timeline */}
      <Section tone="page">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-20">
          <TimelinePanel />
          <div>
            <SectionHeading
              eyebrow="Step two · Where it sits in the sequence"
              title="The disputed date appears twice, marked as disputed."
              description="The timeline does not silently choose one date over the other. Both stated dates appear, both are marked conflicting, and both keep the citation that produced them."
            />
            <p className="mt-8 border-t border-line pt-8 text-[13.5px] leading-relaxed text-ink-secondary">
              Read down the chronology and the shape of the question changes: the award was issued on August 2, delivery
              was committed for September 10, stated to the committee as September 18, and recorded as received on
              September 21 — with 228 of 240 units. The date difference is not the only thing that needs an explanation.
            </p>
          </div>
        </div>
      </Section>

      {/* -------------------------------------------------------- copilot */}
      <Section tone="canvas">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div>
            <SectionHeading
              eyebrow="Step three · Asking the case"
              title="A question answered only from these seven records."
              description="The copilot has no access to the open web and no memory of any real procurement. It reads this case's excerpts and cites them."
            />
            <p className="mt-8 border-t border-line pt-8 text-[13.5px] leading-relaxed text-ink-secondary">
              Notice what the answer does not do. It does not decide which date is correct, it does not explain why they
              differ, and it does not characterise the difference. It states each record's position, attaches the citation,
              and reports how many citations survived verification against the retrieved excerpts.
            </p>
          </div>
          <CopilotPanel />
        </div>
      </Section>

      {/* ---------------------------------------------------- spreadsheet */}
      <Section tone="page">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-16">
          <SpreadsheetPanel />
          <div>
            <SectionHeading
              eyebrow="Step four · Opening the citation"
              title="A spreadsheet citation lands on the row."
              description="“Sheet ‘Invoices,’ row 221” is not a label. It is an address, and following it opens the register at that row with the row highlighted."
            />
            <p className="mt-8 border-t border-line pt-8 text-[13.5px] leading-relaxed text-ink-secondary">
              Row 221 records 240 units invoiced at $178,080.00. The receiving report records 228 units received and 12
              back-ordered. Both numbers are now traceable to an exact location in a specific record — which is the
              difference between a finding and an assertion.
            </p>
          </div>
        </div>
      </Section>

      {/* --------------------------------------------------------- stage */}
      <Section tone="surface">
        <SectionHeading
          align="center"
          eyebrow="Step five · The evidence behind one claim"
          title="Every conclusion stays connected to its source."
          description="Select any excerpt to open its full citation: the record, the exact location inside it, the verbatim passage, its relationship to the claim, and the confidence of the extraction."
        />
        <div className="mt-12 lg:mt-16">
          <CitationStage />
        </div>
        <p className="mx-auto mt-8 max-w-[760px] text-center text-[13px] leading-relaxed text-ink-muted">
          The claim reads “partially supported” because that is what the citations add up to — two supporting, one
          conflicting, one context. Change the evidence and the status changes with it.
        </p>
      </Section>

      {/* ------------------------------------------------------ sequence */}
      <Section tone="canvas">
        <SectionHeading
          align="split"
          eyebrow="Run it yourself"
          title="The same six steps, on your own records."
          description="This is the whole workflow. Nothing here requires a schema, a taxonomy or a data-preparation step first."
        />

        <ol className="mt-12 grid gap-px overflow-hidden rounded-preview border border-line bg-line lg:mt-16 lg:grid-cols-3">
          {SEQUENCE.map((step) => (
            <li key={step.index} className="bg-canvas p-6 lg:p-7">
              <div className="flex items-baseline gap-3">
                <span className="tabular font-mono text-[12px] text-ink-muted">{step.index}</span>
                <h3 className="text-[16.5px] font-semibold tracking-tight text-ink">{step.title}</h3>
              </div>
              <p className="mt-3 text-[13.5px] leading-relaxed text-ink-secondary">{step.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 rounded-panel border border-signal-border bg-signal-soft/60 p-5 lg:p-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-signal">{DEMO_BANNER}</p>
          <p className="mt-2 max-w-[860px] text-[13.5px] leading-relaxed text-ink">
            Everything on this page — the county, the vendor, the officials, the invoice numbers and the documents — is
            invented. It exists to show how the product behaves, not to describe anything that happened. {NEUTRALITY_DISCLAIMER}
          </p>
        </div>

        <AnnotatedRule label="Ask the case · Inspect the evidence" className="mt-14 lg:mt-20" />
      </Section>

      {/* ------------------------------------------------------ final CTA */}
      <section className="border-t border-line bg-page">
        <div className="mx-auto max-w-[1280px] px-5 py-20 text-center lg:px-10 lg:py-28">
          <h2 className="text-section-sm mx-auto max-w-[720px] text-balance font-semibold text-ink lg:text-section">
            Start your own case.
          </h2>
          <p className="text-lede mx-auto mt-5 max-w-[540px] text-pretty text-ink-secondary">
            Bring one record set. CaseSignal will show you what it says, where it disagrees with itself, and what is still
            missing.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-control bg-ink px-7 text-[15px] font-medium text-white transition-colors duration-200 ease-editorial hover:bg-ink/90 sm:w-auto"
            >
              Start your own case
              <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-editorial group-hover:translate-x-0.5" />
            </Link>
            <a
              href={X_URL}
              rel="noreferrer noopener"
              target="_blank"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-control border border-line-strong px-7 text-[15px] font-medium text-ink transition-colors duration-200 ease-editorial hover:bg-surface sm:w-auto"
            >
              <XIcon className="h-4 w-4" />
              Follow {X_HANDLE}
            </a>
            <Link
              href="/product"
              className="inline-flex h-12 w-full items-center justify-center rounded-control border border-line-strong bg-canvas px-7 text-[15px] font-medium text-ink transition-colors duration-200 hover:bg-surface sm:w-auto"
            >
              See the full product tour
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
