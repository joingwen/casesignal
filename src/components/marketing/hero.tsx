import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { HeroPreview } from './hero-preview'
import { HeroBackdrop } from './shell'
import { Eyebrow } from './section'
import { cn } from '@/lib/utils'

/**
 * The landing hero.
 *
 * Extracted so the marketing page and the screenshot showcase render the same
 * composition — a capture is then guaranteed to be the real hero rather than a
 * stand-in that can drift from it.
 */
export function Hero({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'relative overflow-hidden px-5 pb-16 pt-14 sm:pt-20 lg:px-10 lg:pb-24 lg:pt-24',
        className,
      )}
    >
      <HeroBackdrop />
      <div className="relative mx-auto max-w-[1180px]">
        <div className="mx-auto max-w-[860px] text-center">
          <Eyebrow>AI investigation workspace</Eyebrow>
          <h1 className="text-display-sm mt-5 text-balance font-semibold text-ink sm:text-display-md lg:text-display-lg">
            Evidence has a paper trail.
            <br className="hidden sm:block" /> Find it faster.
          </h1>
          <p className="text-lede mx-auto mt-6 max-w-[620px] text-pretty text-ink-secondary lg:mt-7">
            Upload complex records and let CaseSignal map claims, contradictions, entities and events—each connected to
            the exact source behind it.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:mt-9">
            <Link
              href="/sign-up"
              className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-control bg-ink px-6 text-[15px] font-medium text-white transition-colors duration-200 ease-editorial hover:bg-ink/90 sm:w-auto"
            >
              Start a case
              <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-editorial group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/demo"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-control border border-line-strong bg-canvas px-6 text-[15px] font-medium text-ink transition-colors duration-200 ease-editorial hover:bg-surface sm:w-auto"
            >
              Explore the demo
            </Link>
          </div>

          <p className="mt-5 text-[12.5px] text-ink-muted">
            No credit card required · Free plan includes two active cases
          </p>
        </div>

        <div className="relative mx-auto mt-14 max-w-[1080px] lg:mt-16">
          <HeroPreview />
        </div>
      </div>
    </section>
  )
}
