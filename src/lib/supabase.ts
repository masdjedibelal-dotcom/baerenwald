import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const placeholderUrl = "https://placeholder.supabase.co";

function envUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
}

function envAnon(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
}

function envService(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
}

/** Öffentlicher Client (z. B. Client Components) — ohne Env nur Platzhalter, keine echten Requests. */
export const supabase: SupabaseClient = createClient(
  envUrl() || placeholderUrl,
  envAnon() || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.invalid",
  { auth: { persistSession: false, autoRefreshToken: false } }
);

/** Server: Schreibzugriff — in API-Routen immer zuerst {@link isSupabaseConfigured} prüfen. */
export const supabaseAdmin: SupabaseClient = createClient(
  envUrl() || placeholderUrl,
  envService() || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.invalid",
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export function isSupabaseConfigured(): boolean {
  return Boolean(envUrl() && envService());
}
