import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type KundenVertriebsKontext = {
  kundenart: "neukunde" | "bestandskunde";
  kunde_id: string;
  kunde_seit: string | null;
  portal_registriert: boolean;
  anzahl_leads_bisher: number;
  /** Inkl. aktueller Lead */
  anzahl_leads_gesamt: number;
};

/**
 * Vertriebsrelevante Kundenhistorie nach Lead-Anlage (Service Role).
 */
export async function loadKundenVertriebsKontext(
  kundeId: string,
  kundeWarNeuAngelegt: boolean
): Promise<KundenVertriebsKontext | null> {
  if (!isSupabaseConfigured() || !kundeId.trim()) return null;

  const { data: kunde, error } = await supabaseAdmin
    .from("kunden")
    .select("id, created_at, auth_user_id")
    .eq("id", kundeId)
    .maybeSingle();

  if (error || !kunde) return null;

  const { count, error: countErr } = await supabaseAdmin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("kunde_id", kundeId);

  if (countErr) {
    console.warn("[loadKundenVertriebsKontext] leads count:", countErr.message);
  }

  const gesamt = count ?? 1;
  const bisher = Math.max(0, gesamt - 1);

  return {
    kundenart: kundeWarNeuAngelegt ? "neukunde" : "bestandskunde",
    kunde_id: String(kunde.id),
    kunde_seit: (kunde.created_at as string | null) ?? null,
    portal_registriert: Boolean(kunde.auth_user_id),
    anzahl_leads_bisher: bisher,
    anzahl_leads_gesamt: gesamt,
  };
}
