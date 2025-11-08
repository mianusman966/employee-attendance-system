// This layout intentionally avoids server-side Supabase calls.
// Auth is enforced by middleware (see src/middleware.ts), which
// redirects unauthenticated users to /auth/login. Keeping this
// as a simple server component sidesteps cookie API differences
// across Next.js versions and prevents hydration/runtime errors.

import BaseLayout from '../../components/layouts/BaseLayout';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BaseLayout>{children}</BaseLayout>;
}