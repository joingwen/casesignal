import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, ArrowUpRight, FileStack, GitCompareArrows, ScrollText, ShieldCheck } from 'lucide-react'
import { Hero } from '@/components/marketing/hero'
import { CitationStage } from '@/components/marketing/citation-stage'
import { UseCaseGallery } from '@/components/marketing/use-case-gallery'
import { PricingTable } from '@/components/marketing/pricing'
import { Faq, LANDING_FAQ } from '@/components/marketing/faq'
import { AnnotatedRule, Section, SectionHeading } from '@/components/marketing/section'
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

export const metadata: Metadata = {
  title: 'CaseSignal — Turn public records into source-backed case files',
  description:
    'CaseSignal is an AI investigation workspace that turns PDFs, spreadsheets, images, transcripts and public webpages into structured claims, timelines, discrepancy reports and source-backed dossiers.',
}

export default function LandingPage() {
  return (
    <>
      <Hero />

      {/* ---------------------------------------------------- trust strip */}
      <section className="border-t border-line bg-page">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-5 py-7 text-center lg:flex-row lg:items-center lg:justify-between lg:px-10 lg:text-left">
          <p className="text-[11.5px] font-medium uppercase tracking-[0.16em] text-ink-muted">Designed for</p>
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 lg:justify-end lg:gap-x-9">
            {['Journalists', 'Public-records investigators', 'Legal & compliance teams', 'Watchdog organizations', 'Policy researchers'].map(
              (audience) => (
                <li key={audience} className="text-[13.5px] text-ink-secondary">
                  {audience}
                </li>
              ),
            )}
          </ul>
        </div>
      </section>

      {/* --------------------------------------------------- how it works */}
      <Section tone="canvas">
        <SectionHeading
          align="split"
          eyebrow="How it works"
          title="From raw records to a defensible dossier."
          description="Three steps. Nothing leaves the case unless you publish it, and nothing is asserted without the excerpt behind it."
        />

        <div className="mt-12 grid gap-px overflow-hidden rounded-preview border border-line bg-line lg:mt-16 lg:grid-cols-3">
          <Step
            index="01"
            title="Add the record"
            description="Drag in PDFs, spreadsheets, images, transcripts and notes, or point CaseSignal at a public webpage. Page numbers, sheet names and row numbers are preserved as the record is indexed."
            visual={<SourceIntakePanel />}
          />
          <Step
            index="02"
            title="Build the case map"
            description="Claims, dated events and named parties are extracted from the excerpts themselves. Where two records state different values for the same thing, the difference is recorded rather than resolved."
            visual={<ClaimLedgerPanel />}
          />
          <Step
            index="03"
            title="Inspect and share the evidence"
            description="Open any citation at its exact location, edit what the analysis got wrong, then export a brief or publish a read-only evidence room containing only what you chose to include."
            visual={<BriefPanel />}
          />
        </div>
      </Section>

      {/* ------------------------------------------------ start anywhere */}
      <Section tone="page">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div className="order-2 lg:order-1">
            <SourceIntakePanel />
            <div className="mt-6 flex flex-wrap gap-2">
              {['PDF', 'DOCX', 'XLSX', 'CSV', 'TXT', 'Markdown', 'PNG', 'JPG', 'WEBP', 'Public webpages'].map((format) => (
                <span
                  key={format}
                  className="rounded-full border border-line bg-canvas px-2.5 py-1 font-mono text-[11px] text-ink-secondary"
                >
                  {format}
                </span>
              ))}
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <SectionHeading
              eyebrow="Ingest"
              title="Start with the records you already have."
              description="No template, no schema, no re-keying. CaseSignal reads what you have and keeps track of exactly where every sentence came from."
            />
            <ul className="mt-8 space-y-5 border-t border-line pt-8">
              <Bullet title="Upload files">
                Twenty-five megabytes per record, validated by both extension and content type before anything is stored.
              </Bullet>
              <Bullet title="Add public webpages">
                Fetched server-side with redirect and private-network protections, then reduced to readable text with its
                section headings intact.
              </Bullet>
              <Bullet title="Paste notes and transcripts">
                Typed notes and pasted transcripts become first-class citable sources, with timecodes preserved where present.
              </Bullet>
              <Bullet title="Preserve exact source locations">
                Every excerpt keeps its page, sheet, row, section or timecode — which is what makes a citation openable.
              </Bullet>
            </ul>
          </div>
        </div>

        <AnnotatedRule label="Indexed · Traceable · Reversible" className="mt-14 lg:mt-20" />
      </Section>

      {/* -------------------------------------------------- capabilities */}
      <Section tone="canvas">
        <SectionHeading
          align="split"
          eyebrow="Capabilities"
          title="Built for investigations that require receipts."
          description="Six surfaces over one indexed record set. Each is a different reading of the same evidence, and each carries its citations with it."
        />

        <div className="mt-12 grid gap-6 lg:mt-16 lg:grid-cols-2 lg:gap-8">
          <div>
            <h3 className="text-[19px] font-semibold tracking-tight text-ink">Claim ledger</h3>
            <p className="mt-2 max-w-[440px] text-[14px] leading-relaxed text-ink-secondary">
              Every checkable assertion the records make, with its status derived from the citations for and against it.
            </p>
            <div className="mt-5">
              <ClaimLedgerPanel />
            </div>
          </div>
          <div>
            <h3 className="text-[19px] font-semibold tracking-tight text-ink">Evidence graph</h3>
            <p className="mt-2 max-w-[440px] text-[14px] leading-relaxed text-ink-secondary">
              Parties, records and claims as one connected picture — including the connections that contradict.
            </p>
            <div className="mt-5">
              <EvidenceGraphPanel />
            </div>
          </div>
        </div>

        <div className="mt-14 grid divide-y divide-line border-t border-line md:grid-cols-2 md:divide-y-0 lg:mt-20 lg:grid-cols-4 lg:hairline-x">
          <Capability
            icon={ScrollText}
            title="Source-backed answers"
            body="Ask the case a question and get an answer drawn only from its records, with every factual sentence cited. When the records do not settle it, it says so."
          />
          <Capability
            icon={FileStack}
            title="Verified timelines"
            body="Dated events with exact, estimated and conflicting dates distinguished — so a disputed date reads as disputed rather than as fact."
          />
          <Capability
            icon={GitCompareArrows}
            title="Discrepancy detection"
            body="Dates, amounts, counts, names, titles, locations, procedures, statuses and sequence, compared across records and described neutrally."
          />
          <Capability
            icon={ShieldCheck}
            title="Dossier exports"
            body="A structured brief with its citation trail intact, exportable as Markdown or PDF, or publishable as a read-only evidence room."
          />
        </div>
      </Section>

      {/* ------------------------------------------- citation showcase */}
      <Section tone="page">
        <SectionHeading
          align="center"
          eyebrow="Traceability"
          title="Every conclusion remains connected to its source."
          description="Select any excerpt to open its full citation — the record, the exact location inside it, the verbatim passage, its relationship to the claim, and the confidence of the extraction."
        />
        <div className="mt-12 lg:mt-16">
          <CitationStage />
        </div>
      </Section>

      {/* ------------------------------------------------- discrepancies */}
      <Section tone="canvas">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:gap-20">
          <div>
            <SectionHeading
              eyebrow="Where records disagree"
              title="Differences, described neutrally."
              description="CaseSignal reports that two records state different things. It does not tell you why, and it does not characterise the difference as an error, a discrepancy of intent, or wrongdoing."
            />
            <div className="mt-8 space-y-4 border-t border-line pt-8">
              <div className="rounded-panel border border-status-supported/25 bg-status-supported-soft/50 p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-status-supported">How it reads</p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink">
                  “These records appear inconsistent regarding the reported delivery date.”
                </p>
              </div>
              <div className="rounded-panel border border-status-contradicted/25 bg-status-contradicted-soft/50 p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-status-contradicted">
                  What it never says
                </p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-secondary line-through decoration-status-contradicted/40">
                  “This proves that the organization lied.”
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <DiscrepancyPanel />
            <div className="grid gap-6 sm:grid-cols-2">
              <SpreadsheetPanel />
              <TimelinePanel />
            </div>
          </div>
        </div>
      </Section>

      {/* -------------------------------------------------------- copilot */}
      <Section tone="page">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-20">
          <div>
            <SectionHeading
              eyebrow="Case copilot"
              title="Ask the case. Inspect the evidence."
              description="The copilot answers from the case's own records and nothing else. Before an answer is shown, every citation it produced is checked against the excerpts that were actually retrieved — anything that does not resolve is removed."
            />
            <ul className="mt-8 space-y-4 border-t border-line pt-8 text-[14px] leading-relaxed text-ink-secondary">
              <li className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-evidence" />
                Insufficient evidence is stated plainly: “The available case sources do not establish this.”
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-evidence" />
                Conflicting records are surfaced as conflicts, with each side and its citation.
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-evidence" />
                Any answer can be converted into a claim, carrying its citations with it.
              </li>
            </ul>
          </div>
          <CopilotPanel />
        </div>
      </Section>

      {/* ----------------------------------------------------- use cases */}
      <Section tone="canvas">
        <SectionHeading
          align="split"
          eyebrow="Use cases"
          title="One workspace, adapted to the record set."
          description="Templates set the objective and the questions worth asking. The underlying evidence model is the same in every case."
        />
        <div className="mt-12 lg:mt-16">
          <UseCaseGallery />
        </div>
      </Section>

      {/* ------------------------------------------------------ security */}
      <Section tone="page">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-20">
          <SectionHeading
            eyebrow="Security and privacy"
            title="Private by default. Public only by decision."
            description="Source material is sensitive, and the product is built on that assumption."
          />
          <div className="grid gap-x-12 gap-y-8 sm:grid-cols-2">
            {[
              {
                title: 'Private workspaces',
                body: 'Every case belongs to one organization. Access is verified on the server for each read and write, not just at the route.',
              },
              {
                title: 'Signed file access',
                body: 'Stored files are never publicly addressable. Reads are served through short-lived signed URLs or an authorized route that re-checks membership.',
              },
              {
                title: 'Human review controls',
                body: 'Claims and discrepancies carry an explicit review state. An analyst decision is recorded as such and is never overwritten by later analysis.',
              },
              {
                title: 'Export control',
                body: 'Briefs, evidence rooms and downloads are opt-in per item, and every export is written to the audit log.',
              },
              {
                title: 'Deletion tools',
                body: 'Delete a source, a case, or every case in the workspace. Deleting a source removes its excerpts and every citation to it.',
              },
              {
                title: 'Research assistance, not determinations',
                body: 'CaseSignal organises and cites records. It does not make legal conclusions or determinations about any person or organization.',
              },
            ].map((item) => (
              <div key={item.title}>
                <h3 className="text-[15px] font-medium text-ink">{item.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 border-t border-line pt-6">
          <Link
            href="/security"
            className="inline-flex items-center gap-1.5 text-[14px] font-medium text-ink underline-offset-4 hover:underline"
          >
            Read the full security overview
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </Section>

      {/* ------------------------------------------------------- pricing */}
      <Section tone="canvas" id="pricing">
        <SectionHeading
          align="center"
          eyebrow="Pricing"
          title="Start free. Upgrade when the case grows."
          description="Monthly billing. Limits are enforced from the same configuration this table is rendered from."
        />
        <div className="mx-auto mt-12 max-w-[900px] lg:mt-16">
          <PricingTable />
        </div>
        <p className="mx-auto mt-6 max-w-[620px] text-center text-[13px] text-ink-muted">
          Reaching a limit never destroys work in progress — CaseSignal explains exactly which limit was reached and what
          it applies to.
        </p>
      </Section>

      {/* ----------------------------------------------------------- FAQ */}
      <Section tone="page">
        <SectionHeading align="split" eyebrow="Questions" title="What CaseSignal does, and what it deliberately does not." />
        <div className="mt-10 lg:mt-14">
          <Faq items={LANDING_FAQ} />
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

function Step({
  index,
  title,
  description,
  visual,
}: {
  index: string
  title: string
  description: string
  visual: React.ReactNode
}) {
  return (
    <div className="bg-canvas p-6 lg:p-8">
      <div className="flex items-baseline gap-3">
        <span className="tabular font-mono text-[12px] text-ink-muted">{index}</span>
        <h3 className="text-[18px] font-semibold tracking-tight text-ink">{title}</h3>
      </div>
      <p className="mt-3 text-[13.5px] leading-relaxed text-ink-secondary">{description}</p>
      <div className="mt-6">{visual}</div>
    </div>
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

function Capability({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: string
}) {
  return (
    <div className="px-0 py-7 lg:px-7 lg:py-8 lg:first:pl-0 lg:last:pr-0">
      <Icon className="h-[18px] w-[18px] text-evidence" />
      <h3 className="mt-4 text-[15.5px] font-medium text-ink">{title}</h3>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary">{body}</p>
    </div>
  )
}
