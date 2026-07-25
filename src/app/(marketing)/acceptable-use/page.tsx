import Link from 'next/link'
import type { Metadata } from 'next'
import { Eyebrow, Section } from '@/components/marketing/section'
import { NEUTRALITY_DISCLAIMER } from '@/lib/domain'
import { env } from '@/lib/env'

export const metadata: Metadata = {
  title: 'Acceptable use policy — CaseSignal',
  description:
    'What may not be uploaded to CaseSignal and what its outputs may not be used for: rights in source material, harassment and doxxing, de-anonymisation, presenting outputs as established findings, bulk scraping and circumventing security controls.',
}

const LAST_UPDATED = 'July 25, 2026'

const CONTENTS = [
  { id: 'purpose', label: 'Why this policy exists' },
  { id: 'rights', label: 'Material you upload' },
  { id: 'people', label: 'People in the records' },
  { id: 'outputs', label: 'How outputs may be used' },
  { id: 'importer', label: 'The URL importer' },
  { id: 'platform', label: 'Platform integrity' },
  { id: 'prohibited', label: 'Prohibited uses at a glance' },
  { id: 'enforcement', label: 'Enforcement' },
  { id: 'reporting', label: 'Reporting a problem' },
]

const PROHIBITED = [
  'Uploading material you have no right to hold, share or process.',
  'Harassing, threatening, intimidating or stalking any person.',
  'Compiling dossiers on private individuals who are not the subject of a legitimate investigation.',
  'Publishing home addresses, personal phone numbers, family details or other identifying material about a private individual.',
  'Attempting to de-anonymise a source, whistleblower, witness or any individual protected by redaction or pseudonymisation.',
  'Presenting an output as an established finding that a named person or organization committed a crime.',
  'Using CaseSignal to build profiles based on race, ethnicity, religion, health, sexuality, immigration status or political affiliation.',
  'Automated bulk collection through the URL importer, including crawling a site or importing at machine speed.',
  'Circumventing rate limits, access controls, authorization checks or any other security control.',
  'Probing, scanning or load-testing the service outside responsible disclosure.',
  'Uploading malware, or content designed to disrupt processing or another user’s workspace.',
  'Reselling, sublicensing or white-labelling the service without a written agreement.',
]

export default function AcceptableUsePage() {
  const contactEmail = env.NEXT_PUBLIC_CONTACT_EMAIL

  return (
    <>
      <section className="px-5 pb-12 pt-12 sm:pt-16 lg:px-10 lg:pb-16 lg:pt-24">
        <div className="mx-auto max-w-[760px]">
          <Eyebrow>Legal</Eyebrow>
          <h1 className="text-display-sm mt-5 text-balance font-semibold text-ink">Acceptable use policy</h1>
          <p className="text-lede mt-6 text-pretty text-ink-secondary">
            CaseSignal is built for accountability work, and the same capabilities that make records legible can be turned
            against the people named in them. This policy sets the line: what may not be uploaded, and what the outputs
            may not be used for.
          </p>
          <p className="mt-6 border-t border-line pt-5 text-[13px] text-ink-muted">
            Last updated: <span className="tabular text-ink-secondary">{LAST_UPDATED}</span>
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
            This document states the product’s operating rules. It is not legal advice, and complying with it does not
            mean you have complied with the law that applies to your work.
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
            <Clause id="purpose" number="01" title="Why this policy exists">
              <p>
                A tool that maps claims, connects entities and reconstructs chronologies across a document set is useful to
                a journalist checking a filing and equally useful to someone assembling a case against a neighbour. The
                difference is not technical. It is a matter of what the material is, who it concerns, and what is done with
                the result.
              </p>
              <p>
                This policy is part of the{' '}
                <Link href="/terms" className="text-ink underline underline-offset-4">
                  terms of service
                </Link>
                . Breaching it is a breach of those terms.
              </p>
            </Clause>

            <Clause id="rights" number="02" title="Material you upload">
              <p>
                You must have the right to hold and process everything you put into a case. Before uploading, satisfy
                yourself that you do.
              </p>
              <p>Do not upload:</p>
              <ul className="ml-5 list-disc space-y-2 marker:text-ink-muted">
                <li>Material obtained through unauthorised access to a system, account or premises.</li>
                <li>
                  Material you are barred from disclosing to a third-party processor by a protective order, a
                  confidentiality undertaking, a sealing order or the terms of a records release.
                </li>
                <li>
                  Special-category personal data — health records, biometric data, information about sexual life,
                  religious or political affiliation — unless you have a lawful basis and a genuine investigative need.
                </li>
                <li>Material whose possession is itself unlawful in your jurisdiction, including sexual content involving minors.</li>
                <li>Malware, or files crafted to attack the processing pipeline or another workspace.</li>
              </ul>
              <p>
                Where material is subject to a legal obligation that travels with it, that obligation remains yours.
                CaseSignal processes what you give it on your instructions; it cannot assess whether you were entitled to
                give it.
              </p>
            </Clause>

            <Clause id="people" number="03" title="People in the records">
              <p>
                Investigations name people. The distinction that matters is between examining conduct that a person carried
                out in a public or official capacity, and building a picture of a private individual’s life.
              </p>
              <p>You must not use CaseSignal to:</p>
              <ul className="ml-5 list-disc space-y-2 marker:text-ink-muted">
                <li>
                  Harass, threaten, intimidate or stalk anyone, or assist anyone else in doing so.
                </li>
                <li>
                  Compile a dossier on a private individual — a neighbour, a former partner, a colleague, a critic — who is
                  not the legitimate subject of an investigation into conduct in a public, professional or official role.
                </li>
                <li>
                  Publish or assemble for publication a person’s home address, personal contact details, movements, family
                  members or other material whose disclosure exposes them to harm. This applies to public figures too:
                  scrutiny of a role is not licence to expose a household.
                </li>
                <li>
                  Attempt to de-anonymise anyone — to identify a confidential source, a whistleblower, a protected witness,
                  a pseudonymous account holder, or a person a redaction was applied to protect — including by correlating
                  records to defeat the redaction.
                </li>
                <li>
                  Build profiles or make inferences about individuals on the basis of race, ethnicity, national origin,
                  religion, health, disability, sexuality, gender identity, immigration status or political affiliation.
                </li>
                <li>Support surveillance of a person that would be unlawful if you carried it out directly.</li>
              </ul>
            </Clause>

            <Clause id="outputs" number="04" title="How outputs may be used">
              <p>
                CaseSignal produces descriptions of what documents state. Those descriptions carry no authority beyond the
                documents behind them, and they must not be dressed up as though they do.
              </p>
              <p>You must not:</p>
              <ul className="ml-5 list-disc space-y-2 marker:text-ink-muted">
                <li>
                  Use an output to allege, state or imply that a named person or organization committed a crime as an
                  established fact. A claim status describes cited excerpts; a discrepancy describes a difference between
                  documents. Neither is a finding of guilt, fraud, misconduct or intent.
                </li>
                <li>
                  Present an output as a certified, official, expert or independently verified determination, or as the
                  work of a court, regulator, auditor or law-enforcement body.
                </li>
                <li>
                  Publish a finding without checking the citations behind it against the underlying records.
                </li>
                <li>
                  Strip citations from an output in order to present a claim as more settled than the record supports, or
                  edit an excerpt and continue to present it as verbatim.
                </li>
                <li>
                  Publish an evidence room containing material you are not permitted to disclose, or that identifies a
                  person the records were meant to protect.
                </li>
              </ul>
              <div className="rounded-panel border border-line-strong bg-surface p-5">
                <p className="text-[14px] leading-relaxed text-ink">{NEUTRALITY_DISCLAIMER}</p>
              </div>
            </Clause>

            <Clause id="importer" number="05" title="The URL importer">
              <p>
                The URL importer exists so that a public page cited in an investigation can become a citable source
                alongside the documents. It is a tool for adding specific pages you have identified — not a collection
                mechanism.
              </p>
              <p>You must not:</p>
              <ul className="ml-5 list-disc space-y-2 marker:text-ink-muted">
                <li>Crawl a site, enumerate its URLs, or import pages at machine speed or in bulk.</li>
                <li>Script or automate the importer to assemble a dataset from a third-party site.</li>
                <li>Use it to reach material behind a login, a paywall or an access control you are not entitled to pass.</li>
                <li>
                  Use it against a site whose terms or robots directives prohibit automated retrieval, or in a way that
                  burdens the site being fetched.
                </li>
                <li>Point it at internal, private or metadata endpoints, or attempt to use it to reach a network you could not reach directly.</li>
              </ul>
              <p>
                Requests that resolve to private, loopback or link-local addresses are refused, redirects are re-validated
                on every hop, and import volume is rate limited. Those are safeguards, not a substitute for this rule.
              </p>
            </Clause>

            <Clause id="platform" number="06" title="Platform integrity">
              <p>Do not interfere with the service or with other people’s use of it. Specifically, do not:</p>
              <ul className="ml-5 list-disc space-y-2 marker:text-ink-muted">
                <li>
                  Circumvent or attempt to circumvent rate limits, plan limits, authentication, authorization checks or any
                  other security control, including by creating multiple accounts to defeat a limit.
                </li>
                <li>Access, or try to access, a workspace, case, file or share link that is not yours.</li>
                <li>
                  Scan, probe, fuzz or load-test the service except within the terms of{' '}
                  <Link href="/security#reporting" className="text-ink underline underline-offset-4">
                    responsible disclosure
                  </Link>
                  , and never against another user’s data.
                </li>
                <li>Reverse engineer the service to build a competing product, or resell or sublicense it without a written agreement.</li>
                <li>Use the service in a way that degrades it for others, or that is designed to run up cost rather than to do investigative work.</li>
              </ul>
            </Clause>

            <Clause id="prohibited" number="07" title="Prohibited uses at a glance">
              <p>
                This list is a summary of the sections above and does not replace them. It is not exhaustive; conduct that
                is plainly against the spirit of this policy is against the policy.
              </p>
              <ul className="mt-2 divide-y divide-line border-y border-line">
                {PROHIBITED.map((item) => (
                  <li key={item} className="flex gap-3 py-3 text-[14px] leading-relaxed text-ink">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-status-contradicted" />
                    {item}
                  </li>
                ))}
              </ul>
            </Clause>

            <Clause id="enforcement" number="08" title="Enforcement">
              <p>
                We do not monitor the content of cases, and we do not read your source material as a matter of routine.
                When we receive a credible report, we investigate it to the extent necessary and act proportionately.
              </p>
              <p>
                Depending on what we find, we may ask for an explanation, require specific material to be removed, disable
                a published evidence room, suspend an account, or terminate access. Where harm is ongoing or serious we may
                act first and explain afterwards. Where we are legally required to act, we will.
              </p>
              <p>
                If your access is suspended over something you believe was a misunderstanding, tell us and we will look
                again. Where practical and lawful we will allow you to export your cases before access ends.
              </p>
            </Clause>

            <Clause id="reporting" number="09" title="Reporting a problem">
              {contactEmail ? (
                <p>
                  To report misuse of CaseSignal, or material published through an evidence room that breaches this policy,
                  write to{' '}
                  <a href={`mailto:${contactEmail}`} className="text-ink underline underline-offset-4">
                    {contactEmail}
                  </a>{' '}
                  with the link and a description of the problem. Security vulnerabilities go through{' '}
                  <Link href="/security#reporting" className="text-ink underline underline-offset-4">
                    responsible disclosure
                  </Link>{' '}
                  instead.
                </p>
              ) : (
                <p>
                  A public contact address has not been configured for this deployment, so reports of misuse should be sent
                  to the operator running it. Security vulnerabilities go through{' '}
                  <Link href="/security#reporting" className="text-ink underline underline-offset-4">
                    responsible disclosure
                  </Link>{' '}
                  instead.
                </p>
              )}
              <p>
                If you are named in material published through a CaseSignal evidence room and believe it breaches this
                policy, tell us. You do not need an account to make that report, and we will not require you to identify
                yourself beyond what is needed to look into it.
              </p>
              <p>
                Related documents: the{' '}
                <Link href="/terms" className="text-ink underline underline-offset-4">
                  terms of service
                </Link>{' '}
                and the{' '}
                <Link href="/privacy" className="text-ink underline underline-offset-4">
                  privacy policy
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
