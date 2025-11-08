export default function Loading() {
  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mt-2"></div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-8 w-20 bg-gray-300 rounded animate-pulse mt-2"></div>
              </div>
              <div className="h-12 w-12 bg-gray-100 rounded-full animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart Skeleton */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4"></div>
        <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
      </div>
    </div>
  );
}
