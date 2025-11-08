export default function Loading() {
  return (
    <div className="p-4 md:p-8">
      {/* Header Skeleton */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 w-48 bg-gray-100 rounded animate-pulse mt-2"></div>
        </div>
        <div className="h-10 w-32 bg-blue-200 rounded animate-pulse"></div>
      </div>

      {/* Search Bar Skeleton */}
      <div className="mb-4">
        <div className="h-10 w-full md:w-80 bg-gray-200 rounded animate-pulse"></div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              {[...Array(6)].map((_, i) => (
                <th key={i} className="px-6 py-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[...Array(10)].map((_, i) => (
              <tr key={i}>
                {[...Array(6)].map((_, j) => (
                  <td key={j} className="px-6 py-4">
                    <div className="h-4 bg-gray-100 rounded animate-pulse"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Skeleton */}
      <div className="mt-4 flex justify-between items-center">
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
        <div className="flex gap-2">
          <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
