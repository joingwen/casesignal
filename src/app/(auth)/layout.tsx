import Link from 'next/link'

import { NEUTRALITY_DISCLAIMER } from '@/lib/domain'
import { CaseSignalMark } from '@/components/app/case-signal-mark'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-page">
      <header className="px-6 py-6 lg:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-[3px] text-ink transition-colors duration-200 ease-editorial hover:text-evidence"
        >
          <CaseSignalMark className="size-5" />
          <span className="text-[15px] font-medium tracking-tight">CaseSignal</span>
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-6 pb-16 pt-4 sm:items-center sm:pt-0">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>

      <footer className="border-t border-line px-6 py-5 lg:px-10">
        <p className="mx-auto max-w-[70ch] text-[11px] leading-relaxed text-ink-muted">
          {NEUTRALITY_DISCLAIMER}
        </p>
      </footer>
    </div>
  )
}
