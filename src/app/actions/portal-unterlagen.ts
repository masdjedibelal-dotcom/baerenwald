"use server";

import { requireAccountSession } from "@/lib/account/require-account-session";
import { logDbError } from "@/lib/errors/log-db-error";
import { supabaseAdmin } from "@/lib/supabase";

export type PortalUnterlage = { id: string; name: string; href: string; datum: string | null };

/** Kundenportal „Ihre Unterlagen“: Kunden-Dokumente, die Bärenwald im CRM als „Kunde“ markiert hat. */
export async function listMeineUnterlagen(): Promise<{ ok: true; liste: PortalUnterlage[] } | { ok: false; error: string }> {
  const session = await requireAccountSession();
  if (!session.ok) return { ok: false, error: session.error };
  if (session.kind !== "kunde") return { ok: true, liste: [] };
  const { data, error } = await supabaseAdmin
    .from("kunden_dokumente")
    .select("id, name, datei_url, created_at")
    .eq("kunde_id", session.entityId)
    .eq("fuer_kunde", true)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    logDbError("app/actions/portal-unterlagen:list", error);
    return { ok: false, error: "Unterlagen konnten nicht geladen werden." };
  }
  return {
    ok: true,
    liste: (data ?? [])
      .filter((d) => String(d.datei_url ?? "").trim())
      .map((d) => ({
        id: String(d.id),
        name: String(d.name ?? "Dokument"),
        href: String(d.datei_url).trim(),
        datum: (d.created_at as string | null) ?? null,
      })),
  };
}
