import { Skeleton } from '@/components/ui'

export default function UsageLoading() {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading usage</span>

      <div className="border-b border-line px-5 pb-5 pt-6 lg:px-8 lg:pb-6 lg:pt-8">
        <Skeleton className="h-3 w-[48px]" />
        <Skeleton className="mt-3 h-8 w-[120px]" />
        <Skeleton className="mt-3 h-4 w-[420px] max-w-full" />
      </div>

      <ul className="bg-canvas">
        {[0, 1, 2, 3, 4].map((index) => (
          <li key={index} className="border-b border-line px-5 py-5 last:border-b-0 lg:px-8">
            <div className="flex items-baseline justify-between gap-4">
              <Skeleton className="h-4 w-[140px]" />
              <Skeleton className="h-4 w-[90px]" />
            </div>
            <Skeleton className="mt-2.5 h-1.5 w-full rounded-full" />
            <Skeleton className="mt-3 h-3 w-full max-w-[62ch]" />
            <Skeleton className="mt-1.5 h-3 w-[40%]" />
          </li>
        ))}
      </ul>
    </div>
  )
}
