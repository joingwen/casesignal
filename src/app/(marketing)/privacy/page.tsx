import Link from 'next/link'
import type { Metadata } from 'next'
import { Eyebrow, Section } from '@/components/marketing/section'
import { env } from '@/lib/env'

export const metadata: Metadata = {
  title: 'Privacy policy — CaseSignal',
  description:
    'What CaseSignal collects, how uploaded source material is processed, which sub-processors are involved, how long data is kept, and the controls you have over deletion and export.',
}

const LAST_UPDATED = 'July 25, 2026'

const CONTENTS = [
  { id: 'scope', label: 'Scope' },
  { id: 'collect', label: 'What we collect' },
  { id: 'source-material', label: 'How source material is used' },
  { id: 'ai', label: 'Analysis and the AI provider' },
  { id: 'sub-processors', label: 'Sub-processors' },
  { id: 'cookies', label: 'Cookies and local storage' },
  { id: 'retention', label: 'Retention and deletion' },
  { id: 'rights', label: 'Your rights and controls' },
  { id: 'transfers', label: 'International transfers' },
  { id: 'children', label: 'Children' },
  { id: 'changes', label: 'Changes to this policy' },
  { id: 'contact', label: 'Contact' },
]

export default function PrivacyPage() {
  const contactEmail = env.NEXT_PUBLIC_CONTACT_EMAIL

  return (
    <>
      <section className="px-5 pb-12 pt-12 sm:pt-16 lg:px-10 lg:pb-16 lg:pt-24">
        <div className="mx-auto max-w-[760px]">
          <Eyebrow>Legal</Eyebrow>
          <h1 className="text-display-sm mt-5 text-balance font-semibold text-ink">Privacy policy</h1>
          <p className="text-lede mt-6 text-pretty text-ink-secondary">
            CaseSignal is used to hold sensitive records, so this policy is written to be read rather than to be
            survived. It describes what we collect, what happens to the material you upload, who else touches it, and how
            to get rid of it.
          </p>
          <p className="mt-6 border-t border-line pt-5 text-[13px] text-ink-muted">
            Last updated: <span className="tabular text-ink-secondary">{LAST_UPDATED}</span>
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
            This document sets out how the product operates. It is not legal advice, and it does not create rights beyond
            those the law already gives you.
          </p>
        </div>
      </section>

      <Section tone="canvas">
        <div className="mx-auto max-w-[760px]">
          <nav aria-label="Contents" className="rounded-preview border border-line bg-page p-5 lg:p-6">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted">Contents</h2>
            <ol className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
              {CONTENTS.map((item, i) => (
                <li key={item.id} className="flex gap-3 text-[13.5px]">
                  <span className="tabular font-mono text-[11.5px] text-ink-muted">{String(i + 1).padStart(2, '0')}</span>
                  <a href={`#${item.id}`} className="text-ink-secondary underline-offset-4 hover:text-ink hover:underline">
                    {item.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-12 space-y-10 lg:mt-16 lg:space-y-12">
            <Clause id="scope" number="01" title="Scope">
              <p>
                This policy covers the CaseSignal website and the CaseSignal application: creating an account, creating
                cases, uploading and importing records, running analysis, exporting briefs and publishing evidence rooms.
              </p>
              <p>
                Two kinds of information are handled very differently, and it is worth separating them at the outset.{' '}
                <strong className="font-medium text-ink">Account information</strong> is what we need to run a service for
                you. <strong className="font-medium text-ink">Source material</strong> is what you put into a case: the
                documents, spreadsheets, images, transcripts, pages and notes you are investigating. Source material is
                treated as confidential to your workspace and is used only to operate the case it belongs to.
              </p>
            </Clause>

            <Clause id="collect" number="02" title="What we collect">
              <p>Nothing here is collected for advertising, resale or profiling, because we do none of those things.</p>

              <h3 className="pt-2 text-[16px] font-medium text-ink">Account details</h3>
              <p>
                Your name, email address, authentication identifiers from the sign-in provider, the workspaces you belong
                to and your role in each. If you tell us the kind of work you do during onboarding, that is stored on your
                profile so the product can suggest a sensible case template.
              </p>

              <h3 className="pt-2 text-[16px] font-medium text-ink">Source material you add to a case</h3>
              <p>
                The files you upload, the text you paste, the notes you type, and the content of public webpages you ask
                CaseSignal to fetch. This includes the stored copy of each file, the text extracted from it, and the
                excerpts the text is split into, together with the location of each excerpt — page, sheet and row, section
                or timecode.
              </p>

              <h3 className="pt-2 text-[16px] font-medium text-ink">Work you produce in the case</h3>
              <p>
                Claims, citations, entities, relationships, timeline events, discrepancies, review states, analyst notes,
                brief drafts and evidence-room settings. This is your material; we hold it to operate the product.
              </p>

              <h3 className="pt-2 text-[16px] font-medium text-ink">Usage counts</h3>
              <p>
                Counters used to apply plan limits: active cases, processed pages, AI operations, stored bytes and
                published evidence rooms. These are counts, not copies. Counting a page does not retain the page for any
                purpose other than the case it belongs to.
              </p>

              <h3 className="pt-2 text-[16px] font-medium text-ink">Audit records</h3>
              <p>
                A log of actions with security or accountability significance: exports, creation and modification of share
                links, and deletions. Each entry records who acted, what was affected and when. Deletions are written to
                the log before the underlying rows are removed, which means an audit entry can outlive the record it
                describes — by design.
              </p>

              <h3 className="pt-2 text-[16px] font-medium text-ink">Operational data</h3>
              <p>
                Ordinary server and error logs needed to keep the service running and secure, including request metadata
                and rate-limit counters. We do not run third-party advertising or cross-site tracking on this site.
              </p>

              <h3 className="pt-2 text-[16px] font-medium text-ink">Payment information</h3>
              <p>
                If you subscribe, checkout is handled by our payment processor. Card numbers are entered in their
                interface and are never received or stored by CaseSignal. We keep the subscription status, plan and
                billing identifiers needed to apply your entitlements.
              </p>
            </Clause>

            <Clause id="source-material" number="03" title="How source material is used">
              <p>
                Source material is used for one purpose: to operate the case you added it to. Concretely, that means
                extracting its text, preserving the location of each passage, indexing it so it can be retrieved and
                cited, and producing the claims, events, entities and differences that make up the case map.
              </p>
              <p>
                It is not used to improve or evaluate CaseSignal for anyone else. It is not read by our staff as a matter
                of routine; access for support or debugging happens only where it is necessary to resolve a problem you
                have reported, or where we are legally compelled. It is not sold, rented or disclosed to third parties for
                their own purposes.
              </p>
              <p>
                Nothing in a case is public unless you publish it. Publishing an evidence room is an explicit act, each
                item in it is opted in individually, and the link can be given an expiry date, protected with a password,
                stripped of analyst notes and revoked at any time.
              </p>
            </Clause>

            <Clause id="ai" number="04" title="Analysis and the AI provider">
              <p>
                When you run an analysis step — summarising a source, extracting claims or a timeline, comparing records,
                answering a question, drafting a brief section — the relevant excerpts are sent to the configured AI
                provider so the model can produce that output.
              </p>
              <p>Three points about that are worth stating plainly:</p>
              <ul className="ml-5 list-disc space-y-2 marker:text-ink-muted">
                <li>
                  <strong className="font-medium text-ink">Excerpts, not archives.</strong> What is sent is the specific
                  passages a step needs, together with the instruction for that step — not your whole case, and not files
                  wholesale.
                </li>
                <li>
                  <strong className="font-medium text-ink">Only when you run a step.</strong> There is no background
                  process that reads your cases. Analysis runs when you ask for it.
                </li>
                <li>
                  <strong className="font-medium text-ink">Not used for training.</strong> Your source material is not used
                  to train models, ours or anyone else’s. We use the provider’s API under terms that exclude training on
                  submitted content.
                </li>
              </ul>
              <p>
                Where no AI provider is configured for a deployment, analysis runs locally with deterministic methods and
                no source text leaves the deployment at all. The{' '}
                <Link href="/security" className="text-ink underline underline-offset-4">
                  security overview
                </Link>{' '}
                shows which providers this deployment is configured to use.
              </p>
            </Clause>

            <Clause id="sub-processors" number="05" title="Sub-processors">
              <p>
                CaseSignal relies on a small number of infrastructure providers. We describe them by function, because the
                specific vendor for a given deployment can differ and the function is what matters to you:
              </p>
              <ul className="ml-5 list-disc space-y-2 marker:text-ink-muted">
                <li>
                  <strong className="font-medium text-ink">Authentication provider</strong> — identity, sessions and
                  organization membership. Receives account identifiers, not case content.
                </li>
                <li>
                  <strong className="font-medium text-ink">Database and file storage provider</strong> — stores cases,
                  excerpts, claims, citations, audit records and the uploaded files themselves.
                </li>
                <li>
                  <strong className="font-medium text-ink">AI provider</strong> — receives excerpts at the moment an
                  analysis step runs, as described above.
                </li>
                <li>
                  <strong className="font-medium text-ink">Payment processor</strong> — handles checkout and subscription
                  management. Receives billing details directly from you; we never see card data.
                </li>
              </ul>
              <p>
                Each is engaged to provide that function and is not permitted to use your material for its own purposes.
                We will update this section when the set of functions changes.
              </p>
            </Clause>

            <Clause id="cookies" number="06" title="Cookies and local storage">
              <p>
                We use cookies and browser storage that the product needs to work: a session cookie so you stay signed in,
                and small preference values such as which panel layout you last used. There are no advertising cookies, no
                cross-site trackers and no third-party analytics pixels on this site, which is also why you are not being
                shown a consent wall.
              </p>
            </Clause>

            <Clause id="retention" number="07" title="Retention and deletion">
              <p>
                Case material is kept for as long as the case exists in your workspace. There is no automatic expiry, and
                there is no hidden archive: what you can see is what we hold.
              </p>
              <ul className="ml-5 list-disc space-y-2 marker:text-ink-muted">
                <li>
                  <strong className="font-medium text-ink">Deleting a source</strong> removes the stored file, its
                  extracted text, its excerpts and every citation that pointed at it.
                </li>
                <li>
                  <strong className="font-medium text-ink">Deleting a case</strong> removes all of its records, analysis
                  and stored files.
                </li>
                <li>
                  <strong className="font-medium text-ink">Deleting every case</strong> is available as a single control in
                  workspace settings.
                </li>
                <li>
                  <strong className="font-medium text-ink">Closing an account</strong> removes the workspaces you own,
                  along with their cases and files.
                </li>
              </ul>
              <p>
                Two things survive deletion, deliberately and in minimal form: audit entries recording that a deletion or
                export occurred, and billing records we are required to keep for accounting and tax purposes. Neither
                contains your source material. Backups are retained on a short rolling window and are overwritten in the
                ordinary course; material deleted from the live service is removed from backups as that window turns.
              </p>
            </Clause>

            <Clause id="rights" number="08" title="Your rights and controls">
              <p>
                Most of what a data-protection right entitles you to is available directly in the product, which we think
                is how it should be:
              </p>
              <ul className="ml-5 list-disc space-y-2 marker:text-ink-muted">
                <li>
                  <strong className="font-medium text-ink">Access</strong> — every record, excerpt and citation in a case is
                  readable in the workspace, and briefs export as Markdown or PDF.
                </li>
                <li>
                  <strong className="font-medium text-ink">Correction</strong> — claim wording, status, materiality, review
                  state, notes and citations are all editable, and profile details can be changed in settings.
                </li>
                <li>
                  <strong className="font-medium text-ink">Deletion</strong> — per source, per case, all cases, or the whole
                  account, as described above.
                </li>
                <li>
                  <strong className="font-medium text-ink">Portability</strong> — exports carry the citation trail with
                  them, so what leaves is usable outside CaseSignal.
                </li>
                <li>
                  <strong className="font-medium text-ink">Objection and restriction</strong> — you can stop analysis at any
                  time by not running it; the case remains readable.
                </li>
              </ul>
              <p>
                If you need something the interface does not offer, or you want confirmation that a deletion has taken
                effect, write to us and we will deal with it. Where you are covered by a data-protection regime that gives
                you a right to complain to a supervisory authority, that right is unaffected by anything in this policy.
              </p>
              <p>
                Note that where you upload records about other people, you are the one deciding what is collected and why.
                We process that material on your instructions; requests from individuals named in your records should be
                directed to you, and we will help you respond to them.
              </p>
            </Clause>

            <Clause id="transfers" number="09" title="International transfers">
              <p>
                Our infrastructure providers may process data in countries other than your own, including the United
                States. Where material is transferred internationally, we rely on the transfer mechanisms our providers
                make available, such as standard contractual clauses. If a deployment must keep material in a particular
                jurisdiction, CaseSignal can be run against providers in that region.
              </p>
            </Clause>

            <Clause id="children" number="10" title="Children">
              <p>
                CaseSignal is a professional tool and is not directed at children. We do not knowingly create accounts for
                anyone under 16. If you believe a child has created an account, tell us and we will remove it.
              </p>
            </Clause>

            <Clause id="changes" number="11" title="Changes to this policy">
              <p>
                When this policy changes we update the date at the top and, for changes that materially affect how source
                material is handled, we notify account holders before the change takes effect. Previous versions are made
                available on request. Continuing to use the service after a change takes effect means the updated policy
                applies.
              </p>
            </Clause>

            <Clause id="contact" number="12" title="Contact">
              {contactEmail ? (
                <p>
                  Privacy questions, deletion confirmations and complaints go to{' '}
                  <a href={`mailto:${contactEmail}`} className="text-ink underline underline-offset-4">
                    {contactEmail}
                  </a>
                  . Security issues are handled through{' '}
                  <Link href="/security#reporting" className="text-ink underline underline-offset-4">
                    responsible disclosure
                  </Link>
                  .
                </p>
              ) : (
                <p>
                  A public contact address has not been configured for this deployment, so privacy requests should be
                  sent to the operator running it. Security issues are handled through{' '}
                  <Link href="/security#reporting" className="text-ink underline underline-offset-4">
                    responsible disclosure
                  </Link>
                  .
                </p>
              )}
              <p>
                Related documents: the{' '}
                <Link href="/terms" className="text-ink underline underline-offset-4">
                  terms of service
                </Link>
                , the{' '}
                <Link href="/acceptable-use" className="text-ink underline underline-offset-4">
                  acceptable use policy
                </Link>{' '}
                and the{' '}
                <Link href="/security" className="text-ink underline underline-offset-4">
                  security overview
                </Link>
                .
              </p>
            </Clause>
          </div>
        </div>
      </Section>
    </>
  )
}

function Clause({
  id,
  number,
  title,
  children,
}: {
  id: string
  number: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line pt-9 first:border-t-0 first:pt-0">
      <h2 className="text-[22px] font-semibold tracking-tight text-ink lg:text-[26px]">
        <span className="tabular mr-3 font-mono text-[14px] font-normal text-ink-muted">{number}</span>
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-[15px] leading-[1.75] text-ink-secondary">{children}</div>
    </section>
  )
}
