import Link from 'next/link'
import type { Metadata } from 'next'
import { Eyebrow, Section } from '@/components/marketing/section'
import { NEUTRALITY_DISCLAIMER, PLANS } from '@/lib/domain'
import { env } from '@/lib/env'

export const metadata: Metadata = {
  title: 'Terms of service — CaseSignal',
  description:
    'The operating terms for CaseSignal: accounts and workspaces, acceptable use, plans and billing, ownership of your records and outputs, service availability, limitation of liability, and the no-determinations-of-fact clause.',
}

const LAST_UPDATED = 'July 25, 2026'

const CONTENTS = [
  { id: 'agreement', label: 'The agreement' },
  { id: 'accounts', label: 'Accounts and workspaces' },
  { id: 'acceptable-use', label: 'Acceptable use' },
  { id: 'plans', label: 'Plans and billing' },
  { id: 'your-content', label: 'Your content' },
  { id: 'outputs', label: 'Outputs and your responsibility' },
  { id: 'no-determinations', label: 'No determinations of fact' },
  { id: 'availability', label: 'Availability and changes' },
  { id: 'disclaimers', label: 'Disclaimers' },
  { id: 'liability', label: 'Limitation of liability' },
  { id: 'termination', label: 'Termination' },
  { id: 'general', label: 'General terms' },
]

export default function TermsPage() {
  const contactEmail = env.NEXT_PUBLIC_CONTACT_EMAIL

  return (
    <>
      <section className="px-5 pb-12 pt-12 sm:pt-16 lg:px-10 lg:pb-16 lg:pt-24">
        <div className="mx-auto max-w-[760px]">
          <Eyebrow>Legal</Eyebrow>
          <h1 className="text-display-sm mt-5 text-balance font-semibold text-ink">Terms of service</h1>
          <p className="text-lede mt-6 text-pretty text-ink-secondary">
            These are the operating terms for CaseSignal: what you can expect from the service, what we expect from you,
            and what happens when something goes wrong. They are written in plain language on purpose.
          </p>
          <p className="mt-6 border-t border-line pt-5 text-[13px] text-ink-muted">
            Last updated: <span className="tabular text-ink-secondary">{LAST_UPDATED}</span>
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
            This document states how the product operates and the terms on which it is offered. It is not legal advice,
            and reading it is not a substitute for advice about your own situation.
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
            <Clause id="agreement" number="01" title="The agreement">
              <p>
                These terms form an agreement between you and CaseSignal covering your use of the CaseSignal website and
                application. By creating an account or using the service you accept them. If you are accepting on behalf of
                an organization, you confirm you are authorised to bind that organization, and “you” means both you and it.
              </p>
              <p>
                The{' '}
                <Link href="/acceptable-use" className="text-ink underline underline-offset-4">
                  acceptable use policy
                </Link>{' '}
                and the{' '}
                <Link href="/privacy" className="text-ink underline underline-offset-4">
                  privacy policy
                </Link>{' '}
                are part of this agreement.
              </p>
            </Clause>

            <Clause id="accounts" number="02" title="Accounts and workspaces">
              <p>
                You need an account to use CaseSignal. Keep your credentials secure, use accurate details, and tell us if
                you believe your account has been accessed by someone else. You are responsible for activity carried out
                under your account.
              </p>
              <p>
                Cases live inside a workspace. Members of a workspace can see its cases according to their role — owner,
                admin, member or viewer — and the workspace owner is responsible for who is invited and what they are
                allowed to do. Removing a member removes their access; it does not remove the cases they contributed to.
              </p>
              <p>
                You must be at least 16 years old to hold an account, and you must not use the service where doing so would
                breach a law that applies to you.
              </p>
            </Clause>

            <Clause id="acceptable-use" number="03" title="Acceptable use">
              <p>
                Your use of CaseSignal is governed by the{' '}
                <Link href="/acceptable-use" className="text-ink underline underline-offset-4">
                  acceptable use policy
                </Link>
                , which is incorporated into these terms in full. In summary, and without limiting it: do not upload
                material you have no right to hold; do not use CaseSignal to harass, dox or target private individuals; do
                not present its outputs as established findings of criminal conduct; do not attempt to de-anonymise
                individuals; do not circumvent rate limits or security controls; and do not use the URL importer for
                automated bulk collection.
              </p>
              <p>Breaching that policy is a breach of these terms.</p>
            </Clause>

            <Clause id="plans" number="04" title="Plans and billing">
              <h3 className="pt-2 text-[16px] font-medium text-ink">Plans</h3>
              <p>
                CaseSignal offers a Free plan and a Pro plan at ${PLANS.pro.priceMonthly} per month. Each plan carries the
                limits published on the{' '}
                <Link href="/pricing" className="text-ink underline underline-offset-4">
                  pricing page
                </Link>
                , which are enforced from the same configuration those figures are published from. The Free plan is not
                time-limited and is not a trial.
              </p>

              <h3 className="pt-2 text-[16px] font-medium text-ink">Billing</h3>
              <p>
                Paid plans are billed monthly in advance through our payment processor, and renew automatically until
                cancelled. Prices are exclusive of any taxes that apply to you. We may change prices, and if we do we will
                give notice before the change affects an existing subscription; you can cancel before it takes effect.
              </p>

              <h3 className="pt-2 text-[16px] font-medium text-ink">Limits</h3>
              <p>
                When a plan limit is reached, the operation that would exceed it is declined and you are told which limit
                was reached and how to clear it. Work already in the workspace is not altered, hidden or deleted. Cases
                above a lower plan’s limit after a downgrade become read-only rather than being removed, and remain
                exportable and deletable.
              </p>

              <h3 className="pt-2 text-[16px] font-medium text-ink">Cancellation and refunds</h3>
              <p>
                You can cancel at any time from workspace settings. Cancellation takes effect at the end of the period you
                have already paid for, after which the workspace returns to the Free plan. We do not automatically refund
                unused time on a cancelled month; where the service has failed on our side, write to us and we will put it
                right, including refunding the affected period.
              </p>
            </Clause>

            <Clause id="your-content" number="05" title="Your content">
              <p>
                <strong className="font-medium text-ink">You own your records and your outputs.</strong> The material you
                upload, import, paste or type remains yours, and so do the claims, timelines, briefs and exports you
                produce from it. Nothing in these terms transfers ownership to us.
              </p>
              <p>
                You grant us a limited licence to host, store, transmit and process that material solely to operate the
                service for you — extracting text, indexing excerpts, running analysis you request, generating exports and
                serving evidence rooms you publish. The licence exists to make the product work and for no other purpose.
                It ends when the material is deleted.
              </p>
              <p>
                We do not use your source material to train models, and we do not use it to improve the service for other
                customers. Where an analysis step runs, excerpts are sent to the configured AI provider under terms that
                exclude training on submitted content. The{' '}
                <Link href="/privacy" className="text-ink underline underline-offset-4">
                  privacy policy
                </Link>{' '}
                sets this out in detail.
              </p>
              <p>
                You are responsible for having the right to upload what you upload, and for complying with any obligation
                that attaches to it — protective orders, confidentiality undertakings, data-protection duties or the terms
                of a records release.
              </p>
            </Clause>

            <Clause id="outputs" number="06" title="Outputs and your responsibility">
              <p>
                CaseSignal produces drafts: extracted claims, suggested statuses, chronologies, comparisons and answers.
                Everything it produces is editable, and it is meant to be edited. A status you set yourself is recorded as
                an analyst decision and is not overwritten by later analysis.
              </p>
              <p>
                Before you rely on, publish or act on any output, verify each citation against the underlying record. That
                is what the citation is for, and it is the reason every excerpt is stored verbatim with its exact location.
                Extraction quality varies by document, and low-confidence extractions are flagged rather than hidden.
              </p>
              <p>
                Anything you publish — an export, a brief, an evidence room, an article built on either — is your
                publication and your responsibility.
              </p>
            </Clause>

            <Clause id="no-determinations" number="07" title="No determinations of fact">
              <div className="rounded-preview border border-status-contradicted/25 bg-status-contradicted-soft/50 p-5 lg:p-6">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-status-contradicted">
                  Read this clause even if you skip the rest
                </p>
                <p className="mt-2.5 text-[15px] leading-relaxed text-ink">{NEUTRALITY_DISCLAIMER}</p>
              </div>
              <p>
                CaseSignal does not determine what is true. It reports what the records in a case state, and where two
                records state different things it reports the difference. It does not decide which record is correct, weigh
                credibility, infer intent, or reach a conclusion about any person or organization.
              </p>
              <p>Accordingly, and without limitation:</p>
              <ul className="ml-5 list-disc space-y-2 marker:text-ink-muted">
                <li>
                  A claim marked “supported”, “contradicted” or “unresolved” describes the cited excerpts attached to it in
                  that case. It is not a finding that the underlying statement is true or false.
                </li>
                <li>
                  A discrepancy is a difference between documents. It is not an allegation of error, misconduct, fraud or
                  wrongdoing, and it must not be presented as one.
                </li>
                <li>
                  Nothing produced by the service is legal, financial, medical, investigative or professional advice, and
                  no attorney-client or other professional relationship is created by using it.
                </li>
                <li>
                  Outputs are not evidence of anything by themselves, are not certified, and are not suitable for use as a
                  substitute for the underlying records in any proceeding.
                </li>
              </ul>
              <p>
                If you publish or otherwise act on an output, you do so as your own determination, made on your own
                judgement, having checked the records behind it.
              </p>
            </Clause>

            <Clause id="availability" number="08" title="Availability and changes">
              <p>
                We aim to keep CaseSignal available and to give notice of planned maintenance, but the service is provided
                without an uptime commitment unless we have agreed one with you separately. Interruptions can happen,
                including through the failure of a provider we depend on.
              </p>
              <p>
                We develop the product continuously and may add, change or remove features. Where a change would materially
                reduce a capability you depend on, we will give reasonable notice. Your data remains exportable throughout.
              </p>
              <p>
                We may change these terms. Material changes are notified to account holders before they take effect, and
                the date at the top of this page is updated. Continuing to use the service after that means the updated
                terms apply.
              </p>
            </Clause>

            <Clause id="disclaimers" number="09" title="Disclaimers">
              <p>
                Except where the law says otherwise, the service is provided “as is” and “as available”, without warranties
                of any kind, whether express or implied, including implied warranties of merchantability, fitness for a
                particular purpose, accuracy and non-infringement.
              </p>
              <p>
                In particular, we do not warrant that extraction will be complete or accurate for every document, that
                analysis will identify every claim, event or difference in a record set, that the service will be
                uninterrupted or error-free, or that outputs are suitable for any particular purpose. We hold no
                third-party compliance certifications; the{' '}
                <Link href="/security" className="text-ink underline underline-offset-4">
                  security overview
                </Link>{' '}
                states plainly what is implemented and what is not.
              </p>
              <p>
                Some jurisdictions do not allow certain warranties to be excluded. Where that is the case, this clause
                applies to the maximum extent permitted, and nothing here limits rights you have as a consumer that cannot
                be limited by agreement.
              </p>
            </Clause>

            <Clause id="liability" number="10" title="Limitation of liability">
              <p>
                To the maximum extent permitted by law, neither party is liable to the other for indirect, incidental,
                special, consequential or punitive damages, or for loss of profits, revenue, goodwill, data or anticipated
                savings, however caused.
              </p>
              <p>
                To the maximum extent permitted by law, our total aggregate liability arising out of or relating to the
                service in any twelve-month period is limited to the greater of the amount you paid us for the service in
                that period, or one hundred United States dollars.
              </p>
              <p>
                Nothing in this agreement excludes or limits liability for fraud, for fraudulent misrepresentation, for
                death or personal injury caused by negligence, or for anything else that cannot lawfully be excluded or
                limited.
              </p>
              <p>
                You agree to indemnify us against third-party claims arising from material you uploaded that you had no
                right to upload, or from your use of outputs in breach of these terms or the acceptable use policy.
              </p>
            </Clause>

            <Clause id="termination" number="11" title="Termination">
              <p>
                You can stop using CaseSignal at any time, cancel a paid plan from workspace settings, and delete your
                cases and your account from the product. Deleting a case or an account removes its material as described in
                the privacy policy.
              </p>
              <p>
                We may suspend or terminate access where these terms or the acceptable use policy are breached, where an
                account is being used to harm someone, where we are required to by law, or where non-payment continues
                after notice. Except where the breach is serious or ongoing harm makes it impossible, we will give notice
                and, where the problem can be fixed, an opportunity to fix it.
              </p>
              <p>
                On termination, your right to use the service ends. Where practical and lawful, we will allow a reasonable
                window to export your cases first. The clauses that by their nature should survive — ownership, no
                determinations of fact, disclaimers, liability and general terms — survive termination.
              </p>
            </Clause>

            <Clause id="general" number="12" title="General terms">
              <p>
                If any provision of these terms is held unenforceable, the rest continues in force and the unenforceable
                provision is applied to the greatest extent permitted. A failure to enforce a provision is not a waiver of
                it. You may not assign this agreement without our consent; we may assign it in connection with a merger,
                acquisition or sale of assets, on notice to you.
              </p>
              <p>
                These terms, together with the acceptable use and privacy policies, are the entire agreement between us
                about the service, and replace any earlier understanding about it.
              </p>
              {contactEmail ? (
                <p>
                  Questions about these terms go to{' '}
                  <a href={`mailto:${contactEmail}`} className="text-ink underline underline-offset-4">
                    {contactEmail}
                  </a>
                  .
                </p>
              ) : (
                <p>
                  A public contact address has not been configured for this deployment. Questions about these terms should
                  be directed to the operator running it.
                </p>
              )}
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
