import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { AUTH_SESSION_COOKIE_OPTIONS } from "@/lib/supabase/auth-session";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  browserClient = createBrowserClient(url, anonKey, {
    cookieOptions: AUTH_SESSION_COOKIE_OPTIONS,
  });
  return browserClient;
}

/** @deprecated Verwende getSupabaseBrowserClient */
export const getSupabaseClient = getSupabaseBrowserClient;
