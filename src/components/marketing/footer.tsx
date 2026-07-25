import Link from 'next/link'
import { Logo } from '@/components/brand/logo'
import { env } from '@/lib/env'
import { NEUTRALITY_DISCLAIMER } from '@/lib/domain'

const COLUMNS: { heading: string; links: { href: string; label: string; external?: boolean }[] }[] = [
  {
    heading: 'Product',
    links: [
      { href: '/product', label: 'Overview' },
      { href: '/demo', label: 'Interactive demo' },
      { href: '/pricing', label: 'Pricing' },
      { href: '/sign-up', label: 'Start a case' },
    ],
  },
  {
    heading: 'Use cases',
    links: [
      { href: '/use-cases#public-records', label: 'Public records' },
      { href: '/use-cases#journalism', label: 'Investigative journalism' },
      { href: '/use-cases#procurement', label: 'Procurement analysis' },
      { href: '/use-cases#compliance', label: 'Corporate compliance' },
    ],
  },
  {
    heading: 'Trust',
    links: [
      { href: '/security', label: 'Security & privacy' },
      { href: '/privacy', label: 'Privacy policy' },
      { href: '/terms', label: 'Terms' },
      { href: '/acceptable-use', label: 'Acceptable use' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/security#reporting', label: 'Report an issue' },
    ],
  },
]

export function MarketingFooter() {
  const contactEmail = env.NEXT_PUBLIC_CONTACT_EMAIL
  const social = env.NEXT_PUBLIC_SOCIAL_X

  return (
    <footer className="border-t border-line bg-canvas">
      <div className="mx-auto max-w-[1280px] px-5 py-14 lg:px-10 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:gap-20">
          <div>
            <Logo />
            <p className="mt-4 max-w-[280px] text-[13.5px] leading-relaxed text-ink-secondary">
              Turn public records into source-backed case files. Every claim. Every source. One auditable trail.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
              {contactEmail ? (
                <a href={`mailto:${contactEmail}`} className="text-ink-secondary underline-offset-4 hover:text-ink hover:underline">
                  {contactEmail}
                </a>
              ) : (
                <span className="text-ink-muted" title="Set NEXT_PUBLIC_CONTACT_EMAIL to publish a contact address">
                  Contact address not configured
                </span>
              )}
              {social ? (
                <a
                  href={social}
                  rel="noreferrer noopener"
                  target="_blank"
                  className="text-ink-secondary underline-offset-4 hover:text-ink hover:underline"
                >
                  X / Twitter
                </a>
              ) : null}
            </div>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((column) => (
              <div key={column.heading}>
                <h2 className="mb-3.5 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-muted">
                  {column.heading}
                </h2>
                <ul className="space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.href + link.label}>
                      <Link
                        href={link.href}
                        className="text-[13.5px] text-ink-secondary underline-offset-4 transition-colors duration-200 hover:text-ink hover:underline"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-12 border-t border-line pt-6">
          <p className="max-w-[760px] text-[12px] leading-relaxed text-ink-muted">{NEUTRALITY_DISCLAIMER}</p>
          <p className="mt-4 text-[12px] text-ink-muted">
            © {new Date().getFullYear()} CaseSignal. All example records shown on this site are fictional.
          </p>
        </div>
      </div>
    </footer>
  )
}
