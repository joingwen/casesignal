import { Skeleton, SkeletonText } from '@/components/ui'

export default function TimelineLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6" aria-busy="true">
      <span className="sr-only">Loading the timeline…</span>

      <div className="flex gap-5 border-b border-line pb-2.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3.5 w-28" />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {['w-[130px]', 'w-[150px]', 'w-[150px]', 'w-[150px]', 'w-[180px]', 'w-[120px]'].map((width) => (
          <Skeleton key={width} className={`h-8 ${width}`} />
        ))}
      </div>

      <div className="mt-6 space-y-6">
        {Array.from({ length: 3 }).map((_, group) => (
          <section key={group}>
            <Skeleton className="h-2.5 w-28" />
            <ol className="mt-3 space-y-4 border-l border-line pl-5">
              {Array.from({ length: 2 }).map((_, index) => (
                <li key={index} className="panel px-4 py-3">
                  <div className="flex gap-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                    <Skeleton className="h-4 w-20 rounded-full" />
                  </div>
                  <Skeleton className="mt-2 h-3.5 w-2/3" />
                  <SkeletonText lines={2} className="mt-2" />
                  <Skeleton className="mt-3 h-4 w-28 rounded-control" />
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  )
}
