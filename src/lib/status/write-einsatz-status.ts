import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Einsatz-Status (Umbau P11/P12): gesendet → angenommen | abgelehnt, angenommen → fertig.
 * Schreibt nur, wenn der bisherige Status noch stimmt (kein Überschreiben bei Doppelklick).
 */
export const EINSATZ_STATUSES = ["gesendet", "angenommen", "abgelehnt", "fertig"] as const;
export type EinsatzStatus = (typeof EINSATZ_STATUSES)[number];

const UEBERGAENGE: Record<EinsatzStatus, EinsatzStatus[]> = {
  gesendet: ["angenommen", "abgelehnt"],
  angenommen: ["fertig"],
  abgelehnt: [],
  fertig: [],
};

export function einsatzUebergangErlaubt(von: string, nach: EinsatzStatus): boolean {
  return (UEBERGAENGE[von as EinsatzStatus] ?? []).includes(nach);
}

export async function writeEinsatzStatus(
  db: SupabaseClient,
  input: {
    einsatzId: string;
    handwerkerId: string;
    von: EinsatzStatus;
    nach: EinsatzStatus;
    extra?: Record<string, unknown>;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!einsatzUebergangErlaubt(input.von, input.nach)) {
    return { ok: false, error: "Dieser Schritt ist im aktuellen Stand nicht möglich." };
  }
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("einsaetze")
    .update({ ...(input.extra ?? {}), status: input.nach, updated_at: now })
    .eq("id", input.einsatzId)
    .eq("handwerker_id", input.handwerkerId)
    .eq("status", input.von)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: "Der Einsatz wurde inzwischen geändert. Bitte neu laden." };
  return { ok: true };
}
