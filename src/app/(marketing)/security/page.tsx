import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowUpRight } from 'lucide-react'
import { AnnotatedRule, Eyebrow, Section, SectionHeading } from '@/components/marketing/section'
import { NEUTRALITY_DISCLAIMER } from '@/lib/domain'
import { capabilities, env } from '@/lib/env'
import { XIcon } from '@/components/brand/x-icon'
import { X_HANDLE, X_URL } from '@/lib/social'

export const metadata: Metadata = {
  title: 'Security & privacy — CaseSignal',
  description:
    'How CaseSignal protects source material: private workspaces with server-side authorization, private file storage, validated ingestion, SSRF protections on URL imports, rate limiting, security headers, audit logging and deletion controls.',
}

interface Control {
  title: string
  body: string
  detail?: string[]
}

const ACCESS_CONTROLS: Control[] = [
  {
    title: 'Private by default',
    body: 'Every case belongs to exactly one workspace. There is no public case, no shared-by-default state and no discoverable index of cases. A case becomes visible outside the workspace only when someone deliberately publishes an evidence room from it.',
  },
  {
    title: 'Authorization on every read and write',
    body: 'Route protection alone is not access control. Each query and each mutation re-establishes who is asking and which workspace owns the record before it touches data, so a guessed identifier returns nothing rather than someone else’s case.',
  },
  {
    title: 'Roles inside a workspace',
    body: 'Owner, admin, member and viewer are distinct. Destructive operations — deleting a case, deleting every case, changing billing — are restricted to the roles that should hold them.',
  },
  {
    title: 'Analyst decisions are attributed',
    body: 'Review states, status overrides and notes record who made them. A human judgement is stored as a human judgement and is never silently overwritten by a later analysis run.',
  },
]

const STORAGE_CONTROLS: Control[] = [
  {
    title: 'Files are never publicly addressable',
    body: 'Uploaded records are written to private storage. There is no public bucket URL and no unauthenticated path to a stored file.',
  },
  {
    title: 'Short-lived signed URLs, or an authorized route',
    body: 'Reads are served either through a signed URL with a short expiry or through a streaming route that re-checks workspace membership on every request. A link that leaks after the fact grants nothing on its own.',
  },
  {
    title: 'Local storage mode is private too',
    body: 'When object storage is not configured, files are written to a private directory on the server rather than into the public asset path, and are served through the same authorized route.',
  },
  {
    title: 'Deletion removes the file and its traces',
    body: 'Deleting a source deletes the stored object, its extracted excerpts and every citation that pointed at it. Deleting a case does the same for all of its records.',
  },
]

const INGEST_CONTROLS: Control[] = [
  {
    title: 'Uploads validated on three axes',
    body: 'Extension, declared content type and byte size are all checked before anything is stored, and the extension and content type must resolve to the same known format. Clients that send a generic content type fall back to the extension; a genuine mismatch is rejected with a message that names the problem.',
  },
  {
    title: 'Filenames are sanitized, not escaped',
    body: 'Directory components, traversal sequences, null bytes and control characters are removed rather than encoded, so a stored name can never address a path outside its intended directory. Names are truncated to a fixed length and fall back to a safe default.',
  },
  {
    title: 'URL imports treat every address as hostile',
    body: 'A pasted URL asks the server to make an outbound request, so it is validated first: an allowlist of http and https on standard ports only, with loopback, private, link-local and unique-local ranges blocked — including the cloud metadata address — and encoded forms of those addresses decoded before the range check so that octal, hexadecimal and integer notations cannot slip past.',
    detail: [
      'Redirects are followed to a small fixed limit, and every hop is re-validated with the same function.',
      'Internal hostname suffixes are refused outright.',
      'Response size and request time are both capped.',
      'Known limitation: this validates addresses, not DNS answers. A deployment that must also defeat DNS rebinding should route this traffic through an egress proxy.',
    ],
  },
  {
    title: 'Fetched HTML is reduced and sanitized',
    body: 'A fetched page is parsed in an isolated context, reduced to its readable article text with section headings intact, and stripped of scripts, embedded frames, event handlers and remote objects before any of it is stored or rendered.',
  },
]

const PLATFORM_CONTROLS: Control[] = [
  {
    title: 'Rate limiting where it costs',
    body: 'Sliding-window limits are applied per identity to analysis requests, uploads, webpage imports, exports, share updates and public evidence-room requests. Exceeding a limit returns a retry-after rather than failing silently or queueing indefinitely.',
  },
  {
    title: 'Content Security Policy and security headers',
    body: 'A restrictive CSP is served on every response: default-src self, object-src none, base-uri self, form-action self and frame-ancestors none, with script, frame and connect sources limited to the specific providers the app uses. Alongside it: X-Content-Type-Options, X-Frame-Options DENY, a strict Referrer-Policy, a Permissions-Policy that disables camera, microphone and geolocation, and HSTS.',
  },
  {
    title: 'Webhook signatures are verified',
    body: 'Inbound webhooks from the authentication and billing providers are verified against their signing secrets on the raw request body before the payload is trusted. An unsigned or mis-signed request is rejected without side effects.',
  },
  {
    title: 'Environment validated at startup',
    body: 'Configuration is parsed against a schema when the process starts. A malformed value fails loudly and immediately rather than producing a half-configured deployment that behaves differently from the one you tested.',
  },
  {
    title: 'Audit logging',
    body: 'Exports, share-link creation and changes, and deletions are written to an audit log with the actor and the affected record. Deletions are recorded before the rows are removed, so the log survives the data it describes.',
  },
  {
    title: 'Deletion controls you can actually reach',
    body: 'Delete an individual source, an entire case, or every case in the workspace from workspace settings. Deletion is a product feature, not a support request.',
  },
]

const PROVIDERS: { label: string; role: string; configured: boolean; fallback: string }[] = [
  {
    label: 'Authentication',
    role: 'Identity, sessions and organization membership',
    configured: capabilities.clerkAuth,
    fallback: 'A local development session is used and no identity data leaves the deployment.',
  },
  {
    label: 'Database',
    role: 'Cases, excerpts, claims, citations and audit records',
    configured: capabilities.hostedDatabase,
    fallback: 'An embedded database runs in-process and data stays on the machine.',
  },
  {
    label: 'File storage',
    role: 'Stored copies of uploaded records',
    configured: capabilities.supabaseStorage,
    fallback: 'Files are written to a private directory on the server instead.',
  },
  {
    label: 'AI provider',
    role: 'Extraction, discrepancy analysis and source-backed answers',
    configured: capabilities.ai,
    fallback: 'Deterministic local analysis runs instead and no source text is sent anywhere.',
  },
  {
    label: 'Embeddings',
    role: 'Semantic retrieval over case excerpts',
    configured: capabilities.embeddings,
    fallback: 'Retrieval falls back to full-text search only, run inside the database.',
  },
  {
    label: 'Payments',
    role: 'Subscription checkout and billing portal',
    configured: capabilities.stripe,
    fallback: 'Billing is read-only and no payment data is handled at all.',
  },
]

export default function SecurityPage() {
  const contactEmail = env.NEXT_PUBLIC_CONTACT_EMAIL

  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <section className="px-5 pb-14 pt-12 sm:pt-16 lg:px-10 lg:pb-20 lg:pt-24">
        <div className="mx-auto max-w-[1280px]">
          <div className="max-w-[820px]">
            <Eyebrow>Security & privacy</Eyebrow>
            <h1 className="text-display-sm mt-5 text-balance font-semibold text-ink sm:text-display-md">
              Source material is sensitive. The product assumes it.
            </h1>
            <p className="text-lede mt-6 max-w-[660px] text-pretty text-ink-secondary">
              This page describes what CaseSignal actually does — the controls that are implemented, the limitations we
              know about, and the claims we deliberately do not make. It is written to be checked, not to reassure.
            </p>
          </div>

          <nav aria-label="On this page" className="mt-12 border-t border-line pt-5 lg:mt-16">
            <ul className="flex flex-wrap gap-x-5 gap-y-2.5">
              {[
                { href: '#access', label: 'Access control' },
                { href: '#storage', label: 'File storage' },
                { href: '#ingestion', label: 'The ingestion boundary' },
                { href: '#platform', label: 'Platform controls' },
                { href: '#providers', label: 'Sub-processors' },
                { href: '#limits', label: 'What we do not claim' },
                { href: '#reporting', label: 'Report a vulnerability' },
              ].map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="text-[13.5px] text-ink-secondary underline-offset-4 transition-colors duration-200 hover:text-ink hover:underline"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>

      {/* ---------------------------------------------------------- access */}
      <Section tone="canvas" id="access">
        <ControlBlock
          eyebrow="Access control"
          title="Private workspaces, checked on the server."
          description="Authorization is a property of the data layer, not of the URL. Every path to a record goes through the same check."
          controls={ACCESS_CONTROLS}
        />
      </Section>

      {/* --------------------------------------------------------- storage */}
      <Section tone="page" id="storage">
        <ControlBlock
          eyebrow="File storage"
          title="Stored records are not addressable without permission."
          description="The original file is often the most sensitive object in a case. It is treated as the most sensitive object in the system."
          controls={STORAGE_CONTROLS}
        />
      </Section>

      {/* ------------------------------------------------------- ingestion */}
      <Section tone="canvas" id="ingestion">
        <ControlBlock
          eyebrow="The ingestion boundary"
          title="Where untrusted input becomes trusted data."
          description="Uploads, pasted text and URLs all arrive from outside. Every rejection happens once, at the boundary, so nothing downstream has to re-check it."
          controls={INGEST_CONTROLS}
        />
      </Section>

      {/* -------------------------------------------------------- platform */}
      <Section tone="page" id="platform">
        <ControlBlock
          eyebrow="Platform controls"
          title="The rest of the surface area."
          description="Limits, headers, signatures, configuration and the record of what happened."
          controls={PLATFORM_CONTROLS}
        />
      </Section>

      {/* ------------------------------------------------------- providers */}
      <Section tone="canvas" id="providers">
        <SectionHeading
          align="split"
          eyebrow="Sub-processors"
          title="Which services this deployment is configured to use."
          description="CaseSignal runs with each of these either configured or absent. Where one is absent, the product falls back to a local equivalent and no data reaches that provider — the table below reflects this deployment as it is built."
        />

        <div className="mt-12 overflow-x-auto lg:mt-16">
          <table className="w-full min-w-[620px] border-collapse">
            <caption className="sr-only">External services, their role, and whether they are configured</caption>
            <thead>
              <tr className="border-b border-line-strong text-left">
                <th scope="col" className="w-[150px] py-3 pr-4 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
                  Service
                </th>
                <th scope="col" className="py-3 pr-4 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
                  Role
                </th>
                <th scope="col" className="w-[190px] py-3 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
                  In this deployment
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {PROVIDERS.map((provider) => (
                <tr key={provider.label}>
                  <td className="py-3.5 pr-4 align-top text-[13.5px] font-medium text-ink">{provider.label}</td>
                  <td className="py-3.5 pr-4 align-top text-[13.5px] leading-relaxed text-ink-secondary">
                    {provider.role}
                    {!provider.configured && (
                      <span className="mt-1 block text-[12.5px] text-ink-muted">{provider.fallback}</span>
                    )}
                  </td>
                  <td className="py-3.5 align-top">
                    <span
                      className={
                        provider.configured
                          ? 'inline-flex items-center gap-1.5 rounded-full border border-status-supported/30 bg-status-supported-soft px-2.5 py-0.5 text-[11.5px] font-medium text-status-supported'
                          : 'inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-2.5 py-0.5 text-[11.5px] font-medium text-ink-secondary'
                      }
                    >
                      <span className="font-mono">{provider.configured ? '=' : '·'}</span>
                      {provider.configured ? 'Configured' : 'Not configured'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-8 max-w-[760px] text-[13.5px] leading-relaxed text-ink-secondary">
          Source material is sent to the configured AI provider only as the specific excerpts an analysis step needs, and
          only when you run that step. Your records are not used to train models. Full detail is in the{' '}
          <Link href="/privacy" className="text-ink underline underline-offset-4">
            privacy policy
          </Link>
          .
        </p>
      </Section>

      {/* ----------------------------------------------- what we don't claim */}
      <Section tone="surface" id="limits">
        <SectionHeading
          align="split"
          eyebrow="Honesty"
          title="What we do not claim."
          description="A security page is only useful if it is also willing to say what is missing."
        />

        <div className="mt-12 grid gap-px overflow-hidden rounded-preview border border-line bg-line lg:mt-16 lg:grid-cols-3">
          <Disclaimer title="No compliance certifications">
            CaseSignal holds no third-party compliance certifications or attestations today. We are not SOC 2 audited, not
            ISO 27001 certified, and we make no HIPAA or GDPR certification claim. Where you see those acronyms on this
            site, it is only here, saying we do not have them. If your work requires a certified processor, CaseSignal is
            not yet the right tool for it.
          </Disclaimer>
          <Disclaimer title="No determinations of fact">
            {NEUTRALITY_DISCLAIMER}
          </Disclaimer>
          <Disclaimer title="No guarantee of extraction accuracy">
            Extraction quality varies with the document. Scanned pages, poor photographs and unusual layouts produce
            low-confidence excerpts, which are flagged rather than hidden. The citation is what makes the output checkable;
            check it against the original before you rely on it.
          </Disclaimer>
        </div>

        <div className="mt-10 grid gap-8 border-t border-line pt-8 sm:grid-cols-2 lg:gap-16">
          <div>
            <h3 className="text-[15px] font-medium text-ink">Known limitations we would rather state than bury</h3>
            <ul className="mt-4 space-y-3 text-[13.5px] leading-relaxed text-ink-secondary">
              <li className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-signal" />
                URL fetching validates addresses, not DNS answers; DNS rebinding is not defeated by address checks alone.
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-signal" />
                Rate limiting is enforced per instance. A multi-instance deployment should point the limiter at a shared
                store.
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-signal" />
                Stored files are protected by access control, not by end-to-end encryption. An operator with database and
                storage access can read case material.
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-[15px] font-medium text-ink">What that means in practice</h3>
            <p className="mt-4 text-[13.5px] leading-relaxed text-ink-secondary">
              Treat CaseSignal as a workspace for records you are permitted to hold and analyse, not as a vault for
              material whose exposure would cause serious harm to a person. If a record set requires certified handling, a
              signed data-processing agreement, or protection against a compromised operator, use a system built for that
              obligation.
            </p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-ink-secondary">
              The{' '}
              <Link href="/acceptable-use" className="text-ink underline underline-offset-4">
                acceptable use policy
              </Link>{' '}
              sets out what may not be uploaded or done with the outputs.
            </p>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------------- reporting */}
      <Section tone="canvas" id="reporting">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-20">
          <SectionHeading
            eyebrow="Responsible disclosure"
            title="Report a vulnerability."
            description="If you have found a security issue in CaseSignal, we want to hear about it before anyone else does."
          />
          <div>
            <div className="rounded-preview border border-line bg-page p-6 lg:p-7">
              <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink-muted">Where to send it</p>
              {contactEmail ? (
                <>
                  <a
                    href={`mailto:${contactEmail}?subject=Security%20report`}
                    className="mt-2 inline-flex items-center gap-1.5 text-[19px] font-medium tracking-tight text-ink underline-offset-4 hover:underline"
                  >
                    {contactEmail}
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-ink-secondary">
                    Use the subject line “Security report”. If you would prefer an encrypted channel, say so in a first
                    message and we will arrange one.
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-2 text-[19px] font-medium tracking-tight text-ink-muted">
                    Contact address not configured
                  </p>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-ink-secondary">
                    This deployment has not published a contact address. Set{' '}
                    <span className="font-mono text-[12.5px] text-ink">NEXT_PUBLIC_CONTACT_EMAIL</span> to make one
                    available here and in the footer. Until then, please reach the operator of this deployment directly.
                  </p>
                </>
              )}

              <p className="mt-5 border-t border-line pt-4 text-[13px] leading-relaxed text-ink-secondary">
                For anything not security-sensitive, CaseSignal is on X at{' '}
                <a
                  href={X_URL}
                  rel="noreferrer noopener"
                  target="_blank"
                  className="inline-flex items-center gap-1.5 text-ink underline underline-offset-4"
                >
                  <XIcon className="h-3.5 w-3.5" />
                  {X_HANDLE}
                </a>
                . Please do not post vulnerability details publicly.
              </p>
            </div>

            <div className="mt-8 grid gap-8 border-t border-line pt-8 sm:grid-cols-2">
              <div>
                <h3 className="text-[15px] font-medium text-ink">What helps</h3>
                <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-ink-secondary">
                  <li>A description of the issue and its impact.</li>
                  <li>The steps needed to reproduce it.</li>
                  <li>The affected URL, endpoint or file, if you know it.</li>
                  <li>Whether you have shared it with anyone else.</li>
                </ul>
              </div>
              <div>
                <h3 className="text-[15px] font-medium text-ink">What we ask</h3>
                <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-ink-secondary">
                  <li>Test only against workspaces and data you own.</li>
                  <li>Do not access, modify or retain another user’s case material.</li>
                  <li>Avoid denial-of-service testing and automated scanning at volume.</li>
                  <li>Give us a reasonable window to fix the issue before publishing.</li>
                </ul>
              </div>
            </div>

            <p className="mt-8 text-[13px] leading-relaxed text-ink-muted">
              We do not currently operate a paid bug bounty. Reports are read, acknowledged and acted on, and we are glad
              to credit researchers who ask to be credited.
            </p>
          </div>
        </div>

        <AnnotatedRule label="Private by default · Public only by decision" className="mt-14 lg:mt-20" />
      </Section>

      {/* ------------------------------------------------------ related */}
      <section className="border-t border-line bg-page">
        <div className="mx-auto max-w-[1280px] px-5 py-14 lg:px-10 lg:py-16">
          <h2 className="text-[11.5px] font-medium uppercase tracking-[0.16em] text-ink-muted">Read next</h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              { href: '/privacy', label: 'Privacy policy', body: 'What is collected, how it is used, and how long it is kept.' },
              { href: '/terms', label: 'Terms of service', body: 'The operating terms for accounts, plans and content.' },
              { href: '/acceptable-use', label: 'Acceptable use', body: 'What may not be uploaded, and what outputs may not be used for.' },
            ].map((item) => (
              <li key={item.href} className="rounded-panel border border-line bg-canvas p-5">
                <Link href={item.href} className="inline-flex items-center gap-1.5 text-[15px] font-medium text-ink underline-offset-4 hover:underline">
                  {item.label}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}

function ControlBlock({
  eyebrow,
  title,
  description,
  controls,
}: {
  eyebrow: string
  title: string
  description: string
  controls: Control[]
}) {
  return (
    <>
      <SectionHeading align="split" eyebrow={eyebrow} title={title} description={description} />
      <div className="mt-12 grid gap-x-12 gap-y-9 border-t border-line pt-10 sm:grid-cols-2 lg:mt-16 lg:gap-x-16">
        {controls.map((control) => (
          <div key={control.title}>
            <h3 className="text-[16px] font-medium text-ink">{control.title}</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary">{control.body}</p>
            {control.detail ? (
              <ul className="mt-3 space-y-2 border-l border-line pl-4">
                {control.detail.map((item) => (
                  <li key={item} className="text-[13px] leading-relaxed text-ink-muted">
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </>
  )
}

function Disclaimer({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-canvas p-6 lg:p-7">
      <h3 className="text-[16px] font-semibold tracking-tight text-ink">{title}</h3>
      <p className="mt-3 text-[13.5px] leading-relaxed text-ink-secondary">{children}</p>
    </div>
  )
}
