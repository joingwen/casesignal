import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight } from 'lucide-react'
import { AnnotatedRule, Eyebrow, Section, SectionHeading } from '@/components/marketing/section'
import { UseCaseGallery } from '@/components/marketing/use-case-gallery'
import { CASE_TEMPLATES, NEUTRALITY_DISCLAIMER, type CaseTemplateId } from '@/lib/domain'

export const metadata: Metadata = {
  title: 'Use cases — CaseSignal',
  description:
    'How CaseSignal is used for public-records investigations, investigative journalism, procurement analysis, corporate compliance, election administration review and legal document review.',
}

const TEMPLATES = Object.fromEntries(CASE_TEMPLATES.map((template) => [template.id, template])) as Record<
  CaseTemplateId,
  (typeof CASE_TEMPLATES)[number]
>

interface UseCaseSection {
  id: string
  eyebrow: string
  title: string
  description: string
  audience: string[]
  records: string[]
  questions: string[]
  templateId: CaseTemplateId
  note?: string
}

const SECTIONS: UseCaseSection[] = [
  {
    id: 'public-records',
    eyebrow: 'Public records',
    title: 'A records release, read the way it was filed.',
    description:
      'A response to a records request arrives as a bundle: a cover letter, attachments in inconsistent formats, and pages that reference other pages. The work is establishing what the release actually contains before writing a word about it.',
    audience: [
      'Public-records investigators and FOIA practitioners',
      'Watchdog and accountability organizations',
      'Academic and policy researchers working from disclosures',
    ],
    records: [
      'Response and determination letters',
      'Released attachments as PDF, DOCX and spreadsheets',
      'Scanned or photographed pages',
      'Published agency webpages referenced in the release',
      'Your own request log and correspondence, pasted as notes',
    ],
    questions: [
      'What does this release state, and which parts of the request does it leave unanswered?',
      'Which attachments does the cover letter reference but not include?',
      'Do the released documents agree with each other on dates, amounts and names?',
      'Which records would have to be requested next to resolve what is still open?',
    ],
    templateId: 'general',
  },
  {
    id: 'journalism',
    eyebrow: 'Investigative journalism',
    title: 'Separate what is documented from what is asserted.',
    description:
      'Before publication, every sentence has to be traceable to something. CaseSignal keeps the documents, transcripts and public pages behind a story in one place and marks which statements the record actually supports.',
    audience: [
      'Investigative reporters and desk editors',
      'Fact-checkers and research desks',
      'Documentary and long-form research teams',
    ],
    records: [
      'Interview transcripts, with timecodes preserved where present',
      'Filings, contracts and internal documents obtained during reporting',
      'Public webpages and official statements captured by URL',
      'Reporter notes and background memos',
    ],
    questions: [
      'Which statements in the draft are supported by a document, and which rest on a single interview?',
      'Where does a source contradict the filed record, and in what exact words?',
      'What is the earliest record that establishes each date in the chronology?',
      'What remains unverified, and what would verify it?',
    ],
    templateId: 'journalism',
    note: 'Claims marked unresolved are the pre-publication list — the points a story cannot yet stand on.',
  },
  {
    id: 'procurement',
    eyebrow: 'Procurement analysis',
    title: 'Trace a purchase from request to delivery.',
    description:
      'Procurement records are written by different offices at different times, and they rarely agree perfectly. Reconciling them by hand is slow; the difficulty is not finding the numbers but proving which document each number came from.',
    audience: [
      'Public-sector auditors and inspectors general',
      'Procurement and contract oversight staff',
      'Journalists and researchers covering public spending',
    ],
    records: [
      'Purchase requests, solicitations and scoring sheets',
      'Vendor proposals and notices of award',
      'Invoice registers and payment ledgers as XLSX or CSV',
      'Receiving reports, delivery notes and signed receipts',
      'Committee minutes recording approvals and amendments',
    ],
    questions: [
      'Does the quantity invoiced match the quantity recorded as received?',
      'Which document establishes the delivery date, and do any two documents disagree about it?',
      'Was the award basis documented, and by whom was it approved?',
      'Is there a record of an agreed change to the schedule, or only a changed date?',
    ],
    templateId: 'procurement',
  },
  {
    id: 'compliance',
    eyebrow: 'Corporate compliance',
    title: 'Test documented actions against documented policy.',
    description:
      'A compliance review is a comparison between two record sets: what the policy says should happen, and what the logs say happened. CaseSignal holds both and reports where they diverge, with the policy text and the log row side by side.',
    audience: [
      'Internal audit and compliance teams',
      'Outside counsel conducting document review',
      'Risk and controls functions preparing findings',
    ],
    records: [
      'Policy and procedure documents',
      'Approval logs and delegation-of-authority matrices',
      'Transaction and expense exports',
      'Disclosure filings and board or committee minutes',
      'Email and message exports converted to text',
    ],
    questions: [
      'Which approvals were recorded below the threshold the policy states?',
      'Where a policy requires an exception to be documented, is the documentation present?',
      'Did disclosure happen inside the window the policy defines?',
      'Which controls does the record set say nothing about at all?',
    ],
    templateId: 'compliance',
  },
  {
    id: 'election-admin',
    eyebrow: 'Election administration',
    title: 'Procedural record review, and nothing beyond it.',
    description:
      'Election offices produce a large, well-defined paper trail: chain-of-custody logs, transfer forms, reconciliation sheets and certification records. This template is a tool for reading that paper trail carefully — comparing what the procedural records document against what the administrative records report.',
    audience: [
      'Election administrators reconciling their own records',
      'Auditors and canvass observers working from official documents',
      'Researchers studying election administration procedure',
    ],
    records: [
      'Chain-of-custody and seal logs',
      'Equipment transfer and delivery forms',
      'Reconciliation worksheets and reported figures',
      'Certification records and published procedure manuals',
    ],
    questions: [
      'Do the procedural logs and the transfer forms account for the same items?',
      'Where a manual specifies a step, is a record of that step present in the file?',
      'What is the documented sequence of custody events, and where is it incomplete?',
      'Which figures differ between two records, and what does each record state exactly?',
    ],
    templateId: 'election_admin',
    note: 'This template compares documents. It does not evaluate an election, characterise any difference as fraud or error, or draw conclusions about any jurisdiction, contest or official. Every example on this site is fictional.',
  },
  {
    id: 'legal-review',
    eyebrow: 'Legal document review',
    title: 'Build a chronology a colleague can check.',
    description:
      'Across a mixed exhibit set, the sequence of events is the argument. CaseSignal fixes each event to the exhibit and page that dates it, and marks the events where two exhibits disagree rather than silently picking one.',
    audience: [
      'Litigation support and paralegal teams',
      'In-house legal teams assembling a factual record',
      'Legal researchers reviewing produced document sets',
    ],
    records: [
      'Exhibits and produced document sets as PDF',
      'Correspondence bundles',
      'Deposition and hearing transcripts',
      'Contracts, notices and amendments',
    ],
    questions: [
      'What is the documented sequence of notices, responses and amendments?',
      'Which exhibit is the earliest record of each event in the chronology?',
      'Where does a date in one exhibit precede the correspondence that refers to it?',
      'Which asserted facts have no exhibit behind them?',
    ],
    templateId: 'general',
    note: 'CaseSignal organises and cites documents. It does not provide legal advice or reach legal conclusions.',
  },
]

export default function UseCasesPage() {
  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <section className="px-5 pb-14 pt-12 sm:pt-16 lg:px-10 lg:pb-20 lg:pt-24">
        <div className="mx-auto max-w-[1280px]">
          <div className="max-w-[820px]">
            <Eyebrow>Use cases</Eyebrow>
            <h1 className="text-display-sm mt-5 text-balance font-semibold text-ink sm:text-display-md">
              One workspace, adapted to the record set.
            </h1>
            <p className="text-lede mt-6 max-w-[640px] text-pretty text-ink-secondary">
              A template sets the objective and the questions worth asking. The evidence model underneath — excerpts,
              claims, citations, events, differences — is identical in every case, because the standard for what counts as
              evidence should not change with the subject.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-control bg-ink px-6 text-[15px] font-medium text-white transition-colors duration-200 ease-editorial hover:bg-ink/90 sm:w-auto"
              >
                Start a case
                <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-editorial group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/product"
                className="inline-flex h-11 w-full items-center justify-center rounded-control border border-line-strong bg-canvas px-6 text-[15px] font-medium text-ink transition-colors duration-200 ease-editorial hover:bg-surface sm:w-auto"
              >
                See the full product tour
              </Link>
            </div>
          </div>

          <nav aria-label="Use cases on this page" className="mt-12 border-t border-line pt-5 lg:mt-16">
            <ul className="flex flex-wrap gap-x-5 gap-y-2.5">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="text-[13.5px] text-ink-secondary underline-offset-4 transition-colors duration-200 hover:text-ink hover:underline"
                  >
                    {section.eyebrow}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>

      {/* --------------------------------------------------- deep sections */}
      {SECTIONS.map((section, index) => (
        <UseCaseDetail key={section.id} section={section} tone={index % 2 === 0 ? 'canvas' : 'page'} />
      ))}

      {/* --------------------------------------------------------- gallery */}
      <Section tone="surface">
        <SectionHeading
          align="split"
          eyebrow="Side by side"
          title="Six adapted workspaces, same evidence model."
          description="Each frame is the CaseSignal interface configured for that kind of work — a real claim, its status and the citations behind it."
        />
        <div className="mt-12 lg:mt-16">
          <UseCaseGallery />
        </div>
      </Section>

      {/* ------------------------------------------------------- neutrality */}
      <Section tone="page">
        <div className="mx-auto max-w-[760px] text-center">
          <Eyebrow>The same standard everywhere</Eyebrow>
          <h2 className="text-section-sm mt-4 text-balance font-semibold text-ink lg:text-section">
            Investigate records, not rumors.
          </h2>
          <p className="mt-5 text-pretty text-[15px] leading-relaxed text-ink-secondary">{NEUTRALITY_DISCLAIMER}</p>
          <AnnotatedRule label="Neutral by construction" className="mt-10" />
        </div>
      </Section>

      {/* ------------------------------------------------------- final CTA */}
      <section className="border-t border-line bg-canvas">
        <div className="mx-auto max-w-[1280px] px-5 py-20 text-center lg:px-10 lg:py-28">
          <h2 className="text-section-sm mx-auto max-w-[720px] text-balance font-semibold text-ink lg:text-section">
            Start with the record set you already have.
          </h2>
          <p className="text-lede mx-auto mt-5 max-w-[540px] text-pretty text-ink-secondary">
            Pick the template closest to your work, or start from a blank case and define the objective yourself.
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

function UseCaseDetail({ section, tone }: { section: UseCaseSection; tone: 'canvas' | 'page' }) {
  const template = TEMPLATES[section.templateId]
  const focus: readonly string[] = template.focus

  return (
    <Section tone={tone} id={section.id}>
      <SectionHeading align="split" eyebrow={section.eyebrow} title={section.title} description={section.description} />

      <div className="mt-12 grid gap-10 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:gap-16">
        <div className="grid gap-8 border-t border-line pt-8 sm:grid-cols-2 lg:gap-10">
          <Column title="Who it is for" items={section.audience} />
          <Column title="Records typically involved" items={section.records} />
          <div className="sm:col-span-2">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
              Questions it helps answer
            </h3>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-x-8">
              {section.questions.map((question) => (
                <li key={question} className="flex gap-3 text-[13.5px] leading-relaxed text-ink">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-evidence" />
                  {question}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="rounded-preview border border-line bg-canvas p-6 shadow-panel lg:p-7">
          <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-muted">Case template</p>
          <h3 className="mt-2.5 text-[19px] font-semibold tracking-tight text-ink">{template.name}</h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary">{template.summary}</p>

          {template.objective ? (
            <div className="mt-5 border-t border-line pt-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted">Objective</p>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink">{template.objective}</p>
            </div>
          ) : null}

          {focus.length > 0 ? (
            <div className="mt-5 border-t border-line pt-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted">Focus areas</p>
              <ul className="mt-2.5 flex flex-wrap gap-2">
                {focus.map((item) => (
                  <li
                    key={item}
                    className="rounded-full border border-line bg-page px-2.5 py-1 text-[11.5px] text-ink-secondary"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {section.note ? (
            <p className="mt-5 border-t border-line pt-4 text-[12.5px] leading-relaxed text-ink-muted">{section.note}</p>
          ) : null}
        </aside>
      </div>
    </Section>
  )
}

function Column({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-[13.5px] leading-relaxed text-ink-secondary">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-line-strong" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
