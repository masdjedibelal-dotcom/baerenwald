/**
 * Partner-Zugriff auf Aufträge: Zuweisungs-STATUS zählt, nicht nur „hatte Zuweisung“.
 * Status `ersetzt` → kein Schreibzugriff / keine Portalsicht (außer Eingangsrechnung).
 */

import { supabaseAdmin } from "@/lib/supabase";

const INACTIVE = new Set(["ersetzt", "abgelehnt"]);

export type PartnerZuweisungZugriff =
  | { ok: true; mode: "active" | "rechnung_only" }
  | { ok: false; reason: "ersetzt" | "fehlt" };

/**
 * Aktive Zuweisung = auftrag_handwerker.status nicht ersetzt/abgelehnt
 * ODER noch zugewiesene Positionen (Teil-Redisposition).
 */
export async function resolvePartnerAuftragZugriff(
  handwerkerId: string,
  auftragId: string
): Promise<PartnerZuweisungZugriff> {
  const hwId = handwerkerId.trim();
  const aid = auftragId.trim();
  if (!hwId || !aid) return { ok: false, reason: "fehlt" };

  const { data: zuweisungen } = await supabaseAdmin
    .from("auftrag_handwerker")
    .select("id, status")
    .eq("auftrag_id", aid)
    .eq("handwerker_id", hwId);

  const rows = zuweisungen ?? [];
  const active = rows.filter(
    (z) => !INACTIVE.has(String((z as { status?: string }).status ?? "").toLowerCase())
  );
  if (active.length > 0) return { ok: true, mode: "active" };

  const { data: pos } = await supabaseAdmin
    .from("auftrag_positionen")
    .select("id")
    .eq("auftrag_id", aid)
    .eq("handwerker_id", hwId)
    .limit(1);

  if (pos?.length) return { ok: true, mode: "active" };

  /* Ersetzt, aber früher zugewiesen → nur Eingangsrechnung */
  if (rows.length > 0) {
    const hadErsetzt = rows.some(
      (z) =>
        String((z as { status?: string }).status ?? "").toLowerCase() === "ersetzt"
    );
    if (hadErsetzt) return { ok: true, mode: "rechnung_only" };
  }

  return { ok: false, reason: "fehlt" };
}

export async function assertPartnerAktiveZuweisung(
  handwerkerId: string,
  auftragId: string
): Promise<boolean> {
  const r = await resolvePartnerAuftragZugriff(handwerkerId, auftragId);
  return r.ok && r.mode === "active";
}

export function isPartnerZuweisungInaktiv(status: string | null | undefined): boolean {
  return INACTIVE.has(String(status ?? "").trim().toLowerCase());
}
