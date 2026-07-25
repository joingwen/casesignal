import { Skeleton } from '@/components/ui'

export default function CasesLoading() {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your cases</span>

      <div className="border-b border-line px-5 pb-5 pt-6 lg:px-8 lg:pb-6 lg:pt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full">
            <Skeleton className="h-8 w-[140px]" />
            <Skeleton className="mt-3 h-4 w-[280px] max-w-full" />
          </div>
          <Skeleton className="h-9 w-[112px] shrink-0" />
        </div>
      </div>

      <div className="border-b border-line bg-canvas px-5 py-3 lg:px-8">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-6">
          {[0, 1, 2].map((index) => (
            <div key={index}>
              <Skeleton className="h-3 w-[96px]" />
              <Skeleton className="mt-1.5 h-1 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 border-b border-line px-5 py-3 lg:flex-row lg:items-center lg:px-8">
        <Skeleton className="h-9 flex-1" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-[140px]" />
          <Skeleton className="h-9 w-[184px]" />
        </div>
      </div>

      <ul>
        {[0, 1, 2, 3, 4].map((index) => (
          <li key={index} className="border-b border-line px-5 py-4 lg:px-8">
            <div className="flex items-center justify-between gap-6">
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-[46%] min-w-[140px]" />
                <Skeleton className="mt-2 h-3 w-[68%]" />
              </div>
              <div className="hidden gap-8 md:flex">
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
