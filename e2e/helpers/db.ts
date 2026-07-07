import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("Supabase admin keys fehlen");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function auditEventsFor(
  entityType: string,
  entityId: string,
  aktion?: string
) {
  const admin = adminClient();
  let q = admin
    .from("audit_events")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  if (aktion) q = q.eq("aktion", aktion);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function orgFreigabeLogFor(leadId: string) {
  const admin = adminClient();
  const { data, error } = await admin
    .from("org_freigabe_log")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function leadById(id: string) {
  const admin = adminClient();
  const { data, error } = await admin.from("leads").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function gewaehrleistungenFor(auftragId: string) {
  const admin = adminClient();
  const { data, error } = await admin
    .from("gewaehrleistungen")
    .select("*")
    .eq("auftrag_id", auftragId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function leadByMelderEmail(email: string) {
  const admin = adminClient();
  const { data, error } = await admin
    .from("leads")
    .select("*")
    .eq("melder_email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
