import { cn } from '@/lib/utils'

/**
 * The marketing shell.
 *
 * Full-bleed and full-viewport: the site is the surface, not a mockup floating
 * inside a frame. Atmosphere is provided by a restrained backdrop applied to the
 * hero band only (see `HeroBackdrop`), so the rest of the page reads as a clean
 * editorial document.
 */
export function MarketingShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen w-full bg-canvas">{children}</div>
}

/**
 * Atmospheric backdrop for the hero band: cool archival light, faint grid
 * coordinates and defocused paper fragments. Decorative only, and kept far
 * enough back that it never competes with the headline or the product preview.
 */
export function HeroBackdrop({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(63,118,197,0.09)_0%,rgba(63,118,197,0)_58%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_88%_18%,rgba(233,130,67,0.06)_0%,rgba(233,130,67,0)_60%)]" />
      <div className="grid-coordinates absolute inset-0 opacity-[0.55] [mask-image:radial-gradient(90%_70%_at_50%_20%,black,transparent_75%)]" />

      {/* Defocused archival fragments at the far edges of wide viewports. */}
      <div className="absolute -left-24 top-28 hidden h-[380px] w-[290px] -rotate-6 rounded-[6px] border border-line bg-canvas/80 shadow-[0_30px_80px_-46px_rgba(17,17,17,0.3)] blur-[1.5px] 2xl:block">
        <div className="space-y-2.5 p-7 pt-9">
          <div className="h-2 w-3/4 rounded-full bg-ink/[0.08]" />
          <div className="h-2 w-full rounded-full bg-ink/[0.06]" />
          <div className="h-2 w-5/6 rounded-full bg-ink/[0.06]" />
          <div className="redaction mt-4 h-3 w-1/2 opacity-[0.1]" />
          <div className="h-2 w-full rounded-full bg-ink/[0.06]" />
          <div className="mt-6 h-2 w-1/3 rounded-full bg-evidence/15" />
        </div>
      </div>

      <div className="absolute -right-20 top-56 hidden h-[320px] w-[250px] rotate-[7deg] rounded-[6px] border border-line bg-canvas/75 shadow-[0_30px_80px_-46px_rgba(17,17,17,0.26)] blur-[2px] 2xl:block">
        <div className="space-y-2.5 p-7 pt-8">
          <div className="h-2 w-1/2 rounded-full bg-ink/[0.08]" />
          <div className="mt-4 grid grid-cols-4 gap-1.5">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="h-2 rounded-[2px] bg-ink/[0.05]" />
            ))}
          </div>
          <div className="mt-5 h-2 w-2/3 rounded-full bg-signal/20" />
        </div>
      </div>
    </div>
  )
}
