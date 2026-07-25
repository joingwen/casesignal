import { Skeleton, SkeletonText } from '@/components/ui'

export default function BriefLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6" aria-busy="true">
      <span className="sr-only">Loading the brief builder…</span>

      <div className="flex flex-wrap gap-2">
        {['w-36', 'w-24', 'w-40', 'w-32'].map((width) => (
          <Skeleton key={width} className={`h-8 ${width}`} />
        ))}
      </div>

      <div className="grid gap-4 2xl:grid-cols-[240px_minmax(0,1fr)]">
        <div className="panel overflow-hidden">
          <div className="border-b border-line px-3 py-2">
            <Skeleton className="h-3.5 w-20" />
          </div>
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex items-center gap-2 border-b border-line px-3 py-2.5 last:border-b-0">
              <Skeleton className="size-4 rounded-[3px]" />
              <Skeleton className="h-3 flex-1" />
            </div>
          ))}
        </div>

        <div className="panel overflow-hidden">
          <div className="border-b border-line px-4 py-2.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="mt-1.5 h-2.5 w-56" />
          </div>
          <div className="p-4">
            <SkeletonText lines={12} />
          </div>
        </div>
      </div>

      <div className="panel px-5 py-4">
        <Skeleton className="h-4 w-40" />
        <SkeletonText lines={2} className="mt-3" />
      </div>
    </div>
  )
}
