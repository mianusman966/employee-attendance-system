'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LeavePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to absent management page
    router.push('/attendance/absent');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Redirecting to Absent Management...</p>
      </div>
    </div>
  );
}
