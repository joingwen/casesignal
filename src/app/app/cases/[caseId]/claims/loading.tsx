import { Skeleton } from '@/components/ui'

export default function ClaimsLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6" aria-busy="true">
      <span className="sr-only">Loading the claim ledger…</span>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <Skeleton className="h-8 w-full max-w-[220px]" />
        <Skeleton className="h-8 w-[150px]" />
        <Skeleton className="h-8 w-[150px]" />
        <Skeleton className="h-8 w-[150px]" />
        <Skeleton className="h-8 w-[110px]" />
      </div>

      <div className="overflow-hidden rounded-panel border border-line bg-canvas">
        <div className="flex gap-4 border-b border-line px-3 py-2">
          {['w-40', 'w-20', 'w-24', 'w-16', 'w-20', 'w-20'].map((width) => (
            <Skeleton key={width} className={`h-2.5 ${width}`} />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 border-b border-line px-3 py-3 last:border-b-0">
            <Skeleton className="h-3.5 flex-1" />
            <Skeleton className="h-4 w-20 rounded-full" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
