import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight } from 'lucide-react'
import { AnnotatedRule, Eyebrow, Section, SectionHeading } from '@/components/marketing/section'
import { CitationStage } from '@/components/marketing/citation-stage'
import {
  BriefPanel,
  ClaimLedgerPanel,
  CopilotPanel,
  DiscrepancyPanel,
  EvidenceGraphPanel,
  SourceIntakePanel,
  SpreadsheetPanel,
  TimelinePanel,
} from '@/components/marketing/panels'
import {
  ACCEPTED_UPLOADS,
  BRIEF_SECTION_KEYS,
  BRIEF_SECTION_META,
  CLAIM_STATUSES,
  CLAIM_STATUS_META,
  DATE_PRECISIONS,
  DATE_PRECISION_META,
  DISCREPANCY_TYPES,
  DISCREPANCY_TYPE_LABELS,
  ENTITY_TYPES,
  ENTITY_TYPE_LABELS,
  MAX_UPLOAD_BYTES,
  SOURCE_FORMAT_LABELS,
  type SourceFormat,
} from '@/lib/domain'

export const metadata: Metadata = {
  title: 'Product — CaseSignal',
  description:
    'A tour of every CaseSignal surface: the source library and viewer, claim ledger, verified timeline, evidence graph, discrepancy matrix, case copilot and brief exports — all reading from one indexed record set.',
}

const MAX_UPLOAD_MB = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))

const TOUR: { href: string; label: string; num: string }[] = [
  { href: '#library', label: 'Source library', num: '—' },
  { href: '#claims', label: 'Claim ledger', num: '01' },
  { href: '#timeline', label: 'Verified timeline', num: '02' },
  { href: '#graph', label: 'Evidence graph', num: '03' },
  { href: '#discrepancies', label: 'Discrepancy matrix', num: '04' },
  { href: '#copilot', label: 'Case copilot', num: '05' },
  { href: '#brief', label: 'Brief & evidence room', num: '06' },
]

/** What each accepted format keeps once it has been indexed. */
const PRESERVED: Record<SourceFormat, string> = {
  pdf: 'Page numbers, and the section heading each passage sits under',
  docx: 'Heading hierarchy and paragraph order',
  txt: 'Line ranges, and timecodes where a transcript contains them',
  markdown: 'Heading hierarchy and list structure',
  csv: 'Column headers and row numbers',
  xlsx: 'Sheet names, column headers and row numbers',
  image: 'Vision-extracted text with a confidence value per region',
  html: 'Page title, canonical URL and section headings',
  note: 'Your own text, stored verbatim and citable by paragraph',
}

const STATUS_TONE: Record<string, string> = {
  supported: 'border-status-supported/30 bg-status-supported-soft text-status-supported',
  partial: 'border-status-partial/30 bg-status-partial-soft text-status-partial',
  contradicted: 'border-status-contradicted/30 bg-status-contradicted-soft text-status-contradicted',
  unresolved: 'border-signal-border bg-signal-soft text-signal',
  context: 'border-line-strong bg-surface text-ink-secondary',
}

export default function ProductPage() {
  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <section className="px-5 pb-14 pt-12 sm:pt-16 lg:px-10 lg:pb-20 lg:pt-24">
        <div className="mx-auto max-w-[1280px]">
          <div className="max-w-[820px]">
            <Eyebrow>Product</Eyebrow>
            <h1 className="text-display-sm mt-5 text-balance font-semibold text-ink sm:text-display-md">
              One indexed record set. Six ways to read it.
            </h1>
            <p className="text-lede mt-6 max-w-[640px] text-pretty text-ink-secondary">
              CaseSignal reads each record once and keeps the exact place every passage came from — page, sheet and row,
              section or timecode. Everything after that is a different reading of the same index, and each one carries its
              citations with it.
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
                href="/demo"
                className="inline-flex h-11 w-full items-center justify-center rounded-control border border-line-strong bg-canvas px-6 text-[15px] font-medium text-ink transition-colors duration-200 ease-editorial hover:bg-surface sm:w-auto"
              >
                Walk through the demo case
              </Link>
            </div>
          </div>

          <nav aria-label="Product tour" className="mt-12 border-t border-line pt-5 lg:mt-16">
            <ul className="flex flex-wrap gap-x-5 gap-y-2.5">
              {TOUR.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="inline-flex items-baseline gap-2 text-[13.5px] text-ink-secondary underline-offset-4 transition-colors duration-200 hover:text-ink hover:underline"
                  >
                    <span className="tabular font-mono text-[11px] text-ink-muted">{item.num}</span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>

      {/* -------------------------------------------------- source library */}
      <Section tone="canvas" id="library">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div>
            <SectionHeading
              eyebrow="The record set · Source library & viewer"
              title="Records go in whole, and stay openable."
              description="A case begins as a pile of files, links and notes. CaseSignal turns that pile into an indexed library without asking you to rename, reformat or re-key anything."
            />
            <ul className="mt-8 space-y-5 border-t border-line pt-8">
              <Bullet title="Four ways in">
                Upload files, point at a public webpage, paste a transcript, or type a note. All four become first-class
                sources that can be cited the same way.
              </Bullet>
              <Bullet title="Processing you can watch">
                Each record moves through queued, extracting, indexing and analyzing to complete. A record that extracts
                poorly is marked “needs review” rather than being quietly indexed as empty.
              </Bullet>
              <Bullet title="A viewer that lands on the passage">
                Opening a citation opens the record at that page, sheet row or section, with the cited passage highlighted
                in place — not a copy of it in a sidebar.
              </Bullet>
              <Bullet title="Deleting is complete">
                Removing a source removes its stored file, its excerpts and every citation that pointed at it, so nothing
                in the case can outlive the record behind it.
              </Bullet>
            </ul>
          </div>
          <SourceIntakePanel />
        </div>
      </Section>

      {/* ---------------------------------------------------- claim ledger */}
      <Section tone="page" id="claims">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div className="order-2 lg:order-1">
            <ClaimLedgerPanel />
          </div>
          <div className="order-1 lg:order-2">
            <SectionHeading
              eyebrow="01 · Claim ledger"
              title="Every checkable assertion, with the evidence for and against it."
              description="A claim is a statement the records make that could be checked. CaseSignal extracts them from the excerpts themselves, then derives a status from the citations attached — never from a guess about who is credible."
            />
            <p className="mt-8 border-t border-line pt-8 text-[13.5px] leading-relaxed text-ink-secondary">
              Status is computed from counted supporting, conflicting and context citations, so a status and its evidence
              can never drift apart. Change the evidence and the status follows; set the status yourself and it is recorded
              as an analyst decision that later analysis will not overwrite.
            </p>
            <dl className="mt-6 space-y-3">
              {CLAIM_STATUSES.map((status) => {
                const meta = CLAIM_STATUS_META[status]
                return (
                  <div key={status} className="flex flex-col gap-1.5 sm:flex-row sm:gap-4">
                    <dt className="shrink-0 sm:w-[168px]">
                      <span
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[meta.tone]}`}
                      >
                        <span className="font-mono">{meta.symbol}</span>
                        {meta.label}
                      </span>
                    </dt>
                    <dd className="text-[13px] leading-relaxed text-ink-secondary">{meta.description}</dd>
                  </div>
                )
              })}
            </dl>
          </div>
        </div>
      </Section>

      {/* -------------------------------------------------------- timeline */}
      <Section tone="canvas" id="timeline">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div>
            <SectionHeading
              eyebrow="02 · Verified timeline"
              title="A chronology that admits what it does not know."
              description="Dated events are pulled from the records with the citation that dates them. The hard part of a chronology is not ordering events — it is being honest about which dates are actually established."
            />
            <p className="mt-8 border-t border-line pt-8 text-[13.5px] leading-relaxed text-ink-secondary">
              Every event carries a precision, so a date inferred from context never reads like a date stated in a filing,
              and two records that disagree produce one event marked as disputed rather than two events that look like a
              sequence.
            </p>
            <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {DATE_PRECISIONS.map((precision) => {
                const meta = DATE_PRECISION_META[precision]
                return (
                  <div key={precision}>
                    <dt className="flex items-center gap-2 text-[14px] font-medium text-ink">
                      <span className="font-mono text-[12px] text-ink-muted">{meta.symbol}</span>
                      {meta.label}
                    </dt>
                    <dd className="mt-1 text-[13px] leading-relaxed text-ink-secondary">{meta.description}</dd>
                  </div>
                )
              })}
            </dl>
          </div>
          <TimelinePanel />
        </div>
      </Section>

      {/* -------------------------------------------------- evidence graph */}
      <Section tone="page" id="graph">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div className="order-2 lg:order-1">
            <EvidenceGraphPanel />
          </div>
          <div className="order-1 lg:order-2">
            <SectionHeading
              eyebrow="03 · Evidence graph"
              title="Who appears where, and how the records connect."
              description="Named parties, organizations, documents, locations and transactions are extracted with the excerpt that names them, then drawn as one connected picture of the case."
            />
            <p className="mt-8 border-t border-line pt-8 text-[13.5px] leading-relaxed text-ink-secondary">
              Relationships are typed rather than generic — authored by, sent to, paid, occurred at, precedes, supports,
              contradicts — and a contradicting edge is drawn as a contradiction rather than hidden. Selecting any node or
              edge shows the excerpts that produced it, so the graph is an index into the records rather than a summary
              that has floated free of them.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {ENTITY_TYPES.map((type) => (
                <span
                  key={type}
                  className="rounded-full border border-line bg-canvas px-2.5 py-1 text-[11.5px] text-ink-secondary"
                >
                  {ENTITY_TYPE_LABELS[type]}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* --------------------------------------------------- discrepancies */}
      <Section tone="canvas" id="discrepancies">
        <SectionHeading
          align="split"
          eyebrow="04 · Discrepancy matrix"
          title="Where the records disagree with each other."
          description="CaseSignal compares stated values across records and reports the difference. It describes what each record says and stops there — it does not decide which one is right, and it does not characterise a difference as an error or as wrongdoing."
        />

        <div className="mt-12 grid gap-6 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-8">
          <div className="space-y-6">
            <DiscrepancyPanel />
            <SpreadsheetPanel />
          </div>
          <div className="rounded-preview border border-line bg-page p-6 lg:p-7">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-muted">Compared across records</p>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
              {DISCREPANCY_TYPES.map((type) => (
                <li key={type} className="flex items-center gap-2 text-[13.5px] text-ink">
                  <span className="h-1 w-1 shrink-0 rounded-full bg-evidence" />
                  {DISCREPANCY_TYPE_LABELS[type]}
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-line pt-5 text-[13px] leading-relaxed text-ink-secondary">
              Each difference opens as a side-by-side comparison: the stated value in each record, the verbatim excerpt it
              came from, and its exact location. Differences carry a review state, so one that has been explained by a
              further record is closed with a reason rather than deleted.
            </p>
          </div>
        </div>
      </Section>

      {/* --------------------------------------------------------- copilot */}
      <Section tone="page" id="copilot">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div>
            <SectionHeading
              eyebrow="05 · Case copilot"
              title="Ask the case. Inspect the evidence."
              description="The copilot answers from this case's records and nothing else. It has no access to the open web, to other cases, or to anything the model happens to remember about the subject."
            />
            <ul className="mt-8 space-y-4 border-t border-line pt-8 text-[14px] leading-relaxed text-ink-secondary">
              <li className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-evidence" />
                Every factual sentence carries a citation you can open at its exact location.
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-evidence" />
                When the records conflict, the answer says so and gives each side with its own citation.
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-evidence" />
                When the records are silent, the answer says the sources do not establish the point rather than filling the
                gap.
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-evidence" />
                Any answer can be promoted into a claim in the ledger, carrying its citations with it.
              </li>
            </ul>
          </div>
          <CopilotPanel />
        </div>
      </Section>

      {/* ----------------------------------------------------------- brief */}
      <Section tone="canvas" id="brief">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div className="order-2 lg:order-1">
            <BriefPanel />
          </div>
          <div className="order-1 lg:order-2">
            <SectionHeading
              eyebrow="06 · Brief & evidence room"
              title="Publish the trail, not just the conclusion."
              description="A brief is assembled from the case itself. Narrative sections are drafted from the cited material and are fully editable; inventory sections are compiled from what you marked for inclusion."
            />
            <p className="mt-8 border-t border-line pt-8 text-[13.5px] leading-relaxed text-ink-secondary">
              Export as Markdown or PDF, or publish a read-only evidence room at a link you name — with an expiry date, an
              optional password, analyst notes hidden and downloads disabled if you prefer. Sharing is off until you turn it
              on, each item is opted in individually, and the link can be revoked at any time.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {BRIEF_SECTION_KEYS.map((key) => (
                <span
                  key={key}
                  className="rounded-full border border-line bg-page px-2.5 py-1 text-[11.5px] text-ink-secondary"
                >
                  {BRIEF_SECTION_META[key].title}
                </span>
              ))}
            </div>
          </div>
        </div>

        <AnnotatedRule label="Every claim · Every source · One auditable trail" className="mt-14 lg:mt-20" />
      </Section>

      {/* ------------------------------------------- how a citation is kept */}
      <Section tone="surface">
        <SectionHeading
          align="center"
          eyebrow="Traceability"
          title="How a citation stays honest."
          description="Answers are produced in four steps, and the fourth is the one that matters. Nothing reaches you until its citations have been checked against the excerpts that were actually retrieved."
        />

        <div className="mt-12 grid gap-px overflow-hidden rounded-preview border border-line bg-line lg:mt-16 lg:grid-cols-4">
          <Stage
            index="01"
            title="Plan"
            body="Your question is turned into a retrieval plan: which sub-questions to ask of the index, and which records or date ranges are in scope."
          />
          <Stage
            index="02"
            title="Retrieve"
            body="The plan runs against this case's excerpts using full-text search, and semantic retrieval where embeddings are configured. The retrieved set is fixed before anything is written."
          />
          <Stage
            index="03"
            title="Generate"
            body="An answer is drafted from the retrieved excerpts alone, with a citation required on every factual sentence."
          />
          <Stage
            index="04"
            title="Verify"
            body="Each citation is resolved back against the retrieved set. Anything that does not resolve is stripped from the answer before you see it."
            emphasis
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-10">
          <div className="rounded-panel border border-status-contradicted/25 bg-status-contradicted-soft/50 p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-status-contradicted">
              When nothing survives verification
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-ink">
              The drafted answer is discarded and replaced with a single sentence: “The available case sources do not
              establish this.” A confidently worded answer with no surviving citation is treated as a failure, not as a
              result.
            </p>
          </div>
          <p className="self-center text-[13.5px] leading-relaxed text-ink-secondary">
            The passage you read in a citation is the stored excerpt, shown verbatim — never a paraphrase, and never text
            regenerated at display time. That is what makes it possible to check the product against the record instead of
            taking its word for it.
          </p>
        </div>

        <div className="mt-12 lg:mt-16">
          <CitationStage />
        </div>
      </Section>

      {/* --------------------------------------------------------- formats */}
      <Section tone="page">
        <SectionHeading
          align="split"
          eyebrow="Supported formats"
          title="What CaseSignal can read, and what it keeps."
          description={`Uploads are validated by extension and content type before anything is stored, and each file may be up to ${MAX_UPLOAD_MB} MB. Filenames are reduced to a safe basename on the way in.`}
        />

        <div className="mt-12 overflow-x-auto lg:mt-16">
          <table className="w-full min-w-[560px] border-collapse">
            <caption className="sr-only">Accepted upload formats, their extensions and what each keeps once indexed</caption>
            <thead>
              <tr className="border-b border-line-strong text-left">
                <th scope="col" className="w-[150px] py-3 pr-4 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
                  Format
                </th>
                <th scope="col" className="w-[190px] py-3 pr-4 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
                  Extensions
                </th>
                <th scope="col" className="py-3 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
                  Preserved for citation
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ACCEPTED_UPLOADS.map((upload) => (
                <tr key={upload.format}>
                  <td className="py-3 pr-4 text-[13.5px] font-medium text-ink">{SOURCE_FORMAT_LABELS[upload.format]}</td>
                  <td className="py-3 pr-4 font-mono text-[12px] text-ink-secondary">{upload.extensions.join(' · ')}</td>
                  <td className="py-3 text-[13.5px] leading-relaxed text-ink-secondary">{PRESERVED[upload.format]}</td>
                </tr>
              ))}
              <tr>
                <td className="py-3 pr-4 text-[13.5px] font-medium text-ink">{SOURCE_FORMAT_LABELS.html}</td>
                <td className="py-3 pr-4 font-mono text-[12px] text-ink-secondary">public URL</td>
                <td className="py-3 text-[13.5px] leading-relaxed text-ink-secondary">{PRESERVED.html}</td>
              </tr>
              <tr>
                <td className="py-3 pr-4 text-[13.5px] font-medium text-ink">{SOURCE_FORMAT_LABELS.note}</td>
                <td className="py-3 pr-4 font-mono text-[12px] text-ink-secondary">typed or pasted</td>
                <td className="py-3 text-[13.5px] leading-relaxed text-ink-secondary">{PRESERVED.note}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-10 grid gap-6 border-t border-line pt-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
          <Note title="Both signals must agree">
            An upload is accepted only when its extension and its content type both resolve to the same known format.
            Clients that send a generic content type fall back to the extension; a mismatch is rejected with a message that
            names the problem.
          </Note>
          <Note title="Webpages are fetched carefully">
            URL imports run server-side against a protocol and port allowlist, with private and link-local addresses
            blocked and every redirect re-checked. The page is reduced to readable text and sanitized before it is stored.
          </Note>
          <Note title="Scanned pages are flagged">
            A PDF with no machine-readable text is detected during extraction and marked “needs review” with a low
            confidence score. Adding the page as an image lets vision extraction transcribe it, marking illegible passages
            rather than guessing them.
          </Note>
        </div>
      </Section>

      {/* ------------------------------------------------------ final CTA */}
      <section className="border-t border-line bg-canvas">
        <div className="mx-auto max-w-[1280px] px-5 py-20 text-center lg:px-10 lg:py-28">
          <h2 className="text-section-sm mx-auto max-w-[720px] text-balance font-semibold text-ink lg:text-section">
            Built for questions that require receipts.
          </h2>
          <p className="text-lede mx-auto mt-5 max-w-[540px] text-pretty text-ink-secondary">
            Start with one record set. CaseSignal will show you what it says, where it disagrees with itself, and what is
            still missing.
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

function Bullet({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li>
      <h3 className="text-[15px] font-medium text-ink">{title}</h3>
      <p className="mt-1.5 max-w-[460px] text-[13.5px] leading-relaxed text-ink-secondary">{children}</p>
    </li>
  )
}

function Note({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[15px] font-medium text-ink">{title}</h3>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary">{children}</p>
    </div>
  )
}

function Stage({
  index,
  title,
  body,
  emphasis,
}: {
  index: string
  title: string
  body: string
  emphasis?: boolean
}) {
  return (
    <div className={emphasis ? 'bg-canvas p-6 lg:p-7' : 'bg-page p-6 lg:p-7'}>
      <div className="flex items-baseline gap-3">
        <span className="tabular font-mono text-[12px] text-ink-muted">{index}</span>
        <h3 className="text-[17px] font-semibold tracking-tight text-ink">{title}</h3>
        {emphasis && (
          <span className="ml-auto rounded-full border border-evidence-border bg-evidence-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-evidence-deep">
            Enforced
          </span>
        )}
      </div>
      <p className="mt-3 text-[13.5px] leading-relaxed text-ink-secondary">{body}</p>
    </div>
  )
}
