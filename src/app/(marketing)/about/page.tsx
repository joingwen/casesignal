import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight } from 'lucide-react'
import { AnnotatedRule, Eyebrow, Section, SectionHeading } from '@/components/marketing/section'
import { NEUTRALITY_DISCLAIMER } from '@/lib/domain'
import { env } from '@/lib/env'

export const metadata: Metadata = {
  title: 'About — CaseSignal',
  description:
    'CaseSignal is an evidence-first investigation workspace. What it is, the problem it addresses, the principles it is built on, and an honest statement of what it is not.',
}

const PRINCIPLES = [
  {
    index: '01',
    title: 'Traceability before everything',
    body: 'Nothing is asserted without the excerpt behind it. Every claim, event, entity and answer resolves to a stored passage at an exact location in a specific record, shown verbatim. If a statement cannot be traced, it does not belong in the product.',
  },
  {
    index: '02',
    title: 'Neutral description, not conclusion',
    body: 'Where two records differ, CaseSignal reports that they differ. It does not decide which is right, infer intent, weigh credibility or characterise a difference as an error or as wrongdoing. Naming a discrepancy is a description; explaining it is the analyst’s work.',
  },
  {
    index: '03',
    title: 'The analyst outranks the model',
    body: 'Everything the analysis produces is editable, and a human decision is recorded as a human decision. Once you set a status, later analysis will not silently overwrite it. The model drafts; you decide what the case says.',
  },
  {
    index: '04',
    title: 'Private by default',
    body: 'A case is visible to its workspace and to nobody else. Files are never publicly addressable, access is re-checked on the server for every read, and material leaves the workspace only through an export or an evidence room you deliberately publish, item by item.',
  },
]

const NOT = [
  {
    title: 'Not a verdict machine',
    body: 'CaseSignal does not determine whether something happened, who is responsible, or whether any conduct was lawful. It shows what the records state and where they conflict.',
  },
  {
    title: 'Not a source of facts',
    body: 'It brings no outside knowledge to a case. It has no access to the open web at answer time and no view of any other case. If the records do not establish a point, the answer says so.',
  },
  {
    title: 'Not a replacement for the record',
    body: 'Extraction is imperfect, especially on scanned and photographed pages. The citation exists so you can check the product against the original — which you should do before publishing anything.',
  },
  {
    title: 'Not a certified processor',
    body: 'CaseSignal holds no third-party compliance certifications today. Material that requires certified handling belongs in a system built for that obligation.',
  },
]

export default function AboutPage() {
  const contactEmail = env.NEXT_PUBLIC_CONTACT_EMAIL

  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <section className="px-5 pb-14 pt-12 sm:pt-16 lg:px-10 lg:pb-20 lg:pt-24">
        <div className="mx-auto max-w-[1280px]">
          <div className="max-w-[820px]">
            <Eyebrow>About</Eyebrow>
            <h1 className="text-display-sm mt-5 text-balance font-semibold text-ink sm:text-display-md">
              Every claim. Every source. One auditable trail.
            </h1>
            <p className="text-lede mt-6 max-w-[640px] text-pretty text-ink-secondary">
              CaseSignal is a workspace for people whose conclusions have to survive being checked. It reads the records
              you already have and keeps every sentence it produces connected to the passage it came from.
            </p>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- problem */}
      <Section tone="canvas">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-20">
          <SectionHeading
            eyebrow="The problem"
            title="The records exist. Connecting them is the slow part."
          />
          <div className="max-w-[640px] space-y-5 text-[15px] leading-relaxed text-ink-secondary">
            <p>
              Public-records work rarely fails for lack of documents. A disclosure arrives, a production lands, a set of
              filings is downloaded — and then the real work begins: reading several hundred pages closely enough to know
              which sentence on which page supports the statement you are about to make.
            </p>
            <p>
              That work is not hard because it is complicated. It is hard because it is long, and because the connection
              between a statement and the passage behind it lives in the analyst’s memory and a spreadsheet of page numbers
              until the moment someone asks for it. Under deadline, the citation is the first thing to decay.
            </p>
            <p className="text-ink">
              CaseSignal exists to make that connection a property of the workspace rather than a discipline the analyst
              has to sustain. Every excerpt keeps its page, sheet row, section or timecode. Every claim carries the
              excerpts for and against it. Every answer is checked against the excerpts that were actually retrieved
              before it is shown, and anything that cannot be traced is removed.
            </p>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------------ principles */}
      <Section tone="page">
        <SectionHeading
          align="split"
          eyebrow="Principles"
          title="Four commitments the product is built around."
          description="These are design constraints, not values statements. Each one shows up as behaviour you can check."
        />

        <div className="mt-12 grid gap-px overflow-hidden rounded-preview border border-line bg-line lg:mt-16 lg:grid-cols-2">
          {PRINCIPLES.map((principle) => (
            <div key={principle.index} className="bg-canvas p-6 lg:p-9">
              <div className="flex items-baseline gap-3">
                <span className="tabular font-mono text-[12px] text-ink-muted">{principle.index}</span>
                <h3 className="text-[18px] font-semibold tracking-tight text-ink">{principle.title}</h3>
              </div>
              <p className="mt-3.5 max-w-[520px] text-[14px] leading-relaxed text-ink-secondary">{principle.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* --------------------------------------------------- what it isn't */}
      <Section tone="canvas">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-20">
          <SectionHeading
            eyebrow="What it is not"
            title="The limits are part of the design."
            description="A tool that overstates what it can do makes its user less careful. We would rather be plainly bounded."
          />
          <div className="grid gap-x-12 gap-y-8 sm:grid-cols-2">
            {NOT.map((item) => (
              <div key={item.title}>
                <h3 className="text-[15px] font-medium text-ink">{item.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-12 max-w-[760px] border-t border-line pt-6 text-[13px] leading-relaxed text-ink-muted">
          {NEUTRALITY_DISCLAIMER}
        </p>
      </Section>

      {/* ------------------------------------------------------- who it is */}
      <Section tone="page">
        <div className="mx-auto max-w-[760px]">
          <Eyebrow>Who it is for</Eyebrow>
          <h2 className="text-section-sm mt-4 text-balance font-semibold text-ink lg:text-section">
            Investigate records, not rumors.
          </h2>
          <div className="mt-6 space-y-5 text-[15px] leading-relaxed text-ink-secondary">
            <p>
              CaseSignal is designed for journalists, public-records investigators, legal and compliance teams, watchdog
              organizations and policy researchers — people who work from documents and who are expected to show their
              work. It is deliberately not a general-purpose research assistant, and it is deliberately unhelpful if what
              you want is a confident answer without a source.
            </p>
            <p>
              If you want to see how it behaves before creating anything, the{' '}
              <Link href="/demo" className="text-ink underline underline-offset-4">
                interactive demo
              </Link>{' '}
              walks through a complete fictional case. If you want to know how your material is handled, the{' '}
              <Link href="/security" className="text-ink underline underline-offset-4">
                security overview
              </Link>{' '}
              says exactly what is implemented and what is not.
            </p>
            {contactEmail ? (
              <p>
                Questions, corrections and criticism are welcome at{' '}
                <a href={`mailto:${contactEmail}`} className="text-ink underline underline-offset-4">
                  {contactEmail}
                </a>
                .
              </p>
            ) : (
              <p>
                A public contact address has not been configured for this deployment. Please reach its operator directly.
              </p>
            )}
          </div>
          <AnnotatedRule label="From raw records to a defensible dossier" className="mt-10" />
        </div>
      </Section>

      {/* ------------------------------------------------------ final CTA */}
      <section className="border-t border-line bg-canvas">
        <div className="mx-auto max-w-[1280px] px-5 py-20 text-center lg:px-10 lg:py-28">
          <h2 className="text-section-sm mx-auto max-w-[720px] text-balance font-semibold text-ink lg:text-section">
            Built for questions that require receipts.
          </h2>
          <p className="text-lede mx-auto mt-5 max-w-[540px] text-pretty text-ink-secondary">
            Start with one record set and see what it actually establishes.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-control bg-ink px-7 text-[15px] font-medium text-white transition-colors duration-200 ease-editorial hover:bg-ink/90 sm:w-auto"
            >
              Start a case
              <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-editorial group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/use-cases"
              className="inline-flex h-12 w-full items-center justify-center rounded-control border border-line-strong px-7 text-[15px] font-medium text-ink transition-colors duration-200 hover:bg-surface sm:w-auto"
            >
              See how it is used
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
