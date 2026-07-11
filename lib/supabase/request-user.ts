/**
 * Resolve the authenticated user from an API request, accepting EITHER:
 *   1. the web cookie session (`@supabase/ssr`, set by the browser), or
 *   2. a mobile `Authorization: Bearer <access_token>` header (the native app
 *      has no cookies — it holds the Supabase session in on-device storage and
 *      sends the access token explicitly).
 *
 * Returns the user or null. Lets one endpoint serve both the website and the
 * Мој Прилеп mobile app without duplicating routes.
 */
import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { createClient as createServerClient } from "./server";

export async function getRequestUser(req: Request): Promise<User | null> {
  // 1) Web: cookie-based SSR session.
  try {
    const supa = await createServerClient();
    const {
      data: { user },
    } = await supa.auth.getUser();
    if (user) return user;
  } catch {
    // No cookie session (or running outside a cookie context) — fall through.
  }

  // 2) Mobile: bearer access token. Validate it with a tokenless anon client.
  const authz = req.headers.get("authorization");
  const token = authz?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (token) {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const {
      data: { user },
    } = await client.auth.getUser(token);
    if (user) return user;
  }

  return null;
}
