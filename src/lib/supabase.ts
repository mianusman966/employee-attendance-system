// Use Next.js auth helpers so auth cookies are synced with middleware/server
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// This client automatically manages auth cookies via the middleware, so
// server components and middleware can see the session after sign-in.
export const supabase = createClientComponentClient();