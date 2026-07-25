import { Skeleton, SkeletonText } from '@/components/ui'

export default function CaseWorkspaceLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6" aria-busy="true">
      <span className="sr-only">Loading the case workspace…</span>

      <section className="panel px-5 py-4">
        <Skeleton className="h-4 w-32" />
        <SkeletonText lines={2} className="mt-3" />
      </section>

      <section className="panel overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="border-b border-r border-line px-4 py-3 last:border-r-0">
              <Skeleton className="h-2.5 w-14" />
              <Skeleton className="mt-2 h-5 w-8" />
            </div>
          ))}
        </div>
      </section>

      <section className="panel px-5 py-4">
        <Skeleton className="h-4 w-44" />
        <SkeletonText lines={4} className="mt-3" />
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-5 py-3">
          <Skeleton className="h-4 w-48" />
        </div>
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="border-b border-line px-5 py-4 last:border-b-0">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-4 w-2/3" />
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <SkeletonText lines={3} />
              <SkeletonText lines={3} />
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
