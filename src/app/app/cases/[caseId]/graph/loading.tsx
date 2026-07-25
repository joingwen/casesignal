import { Skeleton } from '@/components/ui'

export default function GraphLoading() {
  return (
    <div className="flex h-full min-h-0 flex-col" aria-busy="true">
      <span className="sr-only">Loading the evidence graph…</span>

      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-canvas px-3 py-2">
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="ml-auto h-8 w-24" />
      </div>

      <div className="relative min-h-[380px] flex-1 bg-page">
        <div className="absolute inset-0 grid place-items-center">
          <div className="grid grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-[190px] rounded-panel" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
