'use client';

/**
 * Skeleton loading components for dashboard
 * Provides visual placeholders while data loads
 */

function Pulse({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
  );
}

export function KPISkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4"
        >
          <Pulse className="h-3 w-20 mb-3" />
          <Pulse className="h-8 w-16 mb-3" />
          <Pulse className="h-2.5 w-24 mb-1.5" />
          <Pulse className="h-2.5 w-16" />
        </div>
      ))}
    </div>
  );
}

export function LoadBoardSkeleton() {
  return (
    <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <Pulse className="h-6 w-40" />
        <Pulse className="h-9 w-28 rounded-lg" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="border border-gray-100 dark:border-gray-700 rounded-lg p-4"
          >
            <div className="flex items-start gap-3">
              <Pulse className="w-1 h-16 rounded-full" />
              <div className="flex-1">
                <div className="flex gap-2 mb-2">
                  <Pulse className="h-5 w-16" />
                  <Pulse className="h-5 w-12" />
                  <Pulse className="h-5 w-20 rounded" />
                </div>
                <Pulse className="h-3 w-32 mb-2" />
                <Pulse className="h-2 w-full max-w-xs" />
              </div>
              <Pulse className="h-5 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WeatherSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <Pulse className="h-4 w-20 mb-4" />
      <div className="text-center mb-4">
        <Pulse className="h-12 w-20 mx-auto mb-1" />
        <Pulse className="h-3 w-28 mx-auto" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex justify-between pb-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
            <Pulse className="h-3 w-16" />
            <Pulse className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <Pulse className="h-4 w-32 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
            <Pulse className="w-8 h-8 rounded-full" />
            <div className="flex-1">
              <Pulse className="h-4 w-28 mb-1" />
              <Pulse className="h-3 w-16" />
            </div>
            <Pulse className="h-5 w-12 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Status bar skeleton */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 mb-6">
        <div className="max-w-7xl mx-auto flex items-center gap-8">
          <Pulse className="h-4 w-16" />
          <Pulse className="h-4 w-24" />
          <Pulse className="h-4 w-16" />
          <Pulse className="h-4 w-40" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        <KPISkeleton />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <LoadBoardSkeleton />
          <div className="space-y-6">
            <WeatherSkeleton />
            <CardSkeleton rows={4} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CardSkeleton rows={5} />
          <CardSkeleton rows={5} />
          <CardSkeleton rows={5} />
        </div>
      </div>
    </div>
  );
}
