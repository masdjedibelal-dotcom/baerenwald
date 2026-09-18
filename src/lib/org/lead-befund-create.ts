/**
 * Befund anlegen (ohne Auth) — für Server-Pfade mit eigener Auth.
 */

import {
  materializeVorlagePunkte,
  resolveBefundVorlageKey,
  type BefundVorlageKey,
} from "@/lib/org/lead-befund-vorlagen";
import { supabaseAdmin } from "@/lib/supabase";

export async function insertLeadBefundIfMissing(input: {
  leadId: string;
  durchgefuehrtVon?: string;
  durchgefuehrtAm?: string;
  objektKontaktId?: string | null;
  vorlageKey?: BefundVorlageKey;
  createdByKundeId?: string | null;
}): Promise<
  | { ok: true; befundId: string; created: boolean }
  | { ok: false; error: string }
> {
  const leadId = String(input.leadId ?? "").trim();
  if (!leadId) return { ok: false, error: "Lead fehlt." };

  const { data: existing } = await supabaseAdmin
    .from("lead_befunde")
    .select("id")
    .eq("lead_id", leadId)
    .maybeSingle();

  if (existing?.id) {
    return { ok: true, befundId: String(existing.id), created: false };
  }

  const { data: leadRow } = await supabaseAdmin
    .from("leads")
    .select("funnel_daten")
    .eq("id", leadId)
    .maybeSingle();

  const funnel = leadRow?.funnel_daten;
  const vorlageKey =
    input.vorlageKey ?? resolveBefundVorlageKey(funnel);
  const meldeKategorie =
    funnel &&
    typeof funnel === "object" &&
    !Array.isArray(funnel) &&
    typeof (funnel as { melde_kategorie?: unknown }).melde_kategorie ===
      "string"
      ? String((funnel as { melde_kategorie: string }).melde_kategorie)
      : null;

  const durchgefuehrtAm =
    input.durchgefuehrtAm?.trim().slice(0, 10) ||
    new Date().toISOString().slice(0, 10);

  const { data: inserted, error: insErr } = await supabaseAdmin
    .from("lead_befunde")
    .insert({
      lead_id: leadId,
      durchgefuehrt_von: input.durchgefuehrtVon?.trim() ?? "",
      durchgefuehrt_am: durchgefuehrtAm,
      melde_kategorie: meldeKategorie,
      vorlage_key: vorlageKey,
      objekt_kontakt_id: input.objektKontaktId?.trim() || null,
      created_by_kunde_id: input.createdByKundeId ?? null,
    })
    .select("id")
    .single();

  if (insErr || !inserted?.id) {
    return {
      ok: false,
      error: insErr?.message ?? "Befund anlegen fehlgeschlagen.",
    };
  }

  const punkte = materializeVorlagePunkte(vorlageKey);
  if (punkte.length) {
    const { error: pErr } = await supabaseAdmin
      .from("lead_befund_punkte")
      .insert(
        punkte.map((p) => ({
          befund_id: inserted.id,
          sort_order: p.sort_order,
          titel: p.titel,
          quelle: p.quelle,
          vorlage_key: p.vorlage_key,
          notiz: "",
          foto_refs: [],
        }))
      );
    if (pErr) {
      await supabaseAdmin.from("lead_befunde").delete().eq("id", inserted.id);
      return { ok: false, error: pErr.message };
    }
  }

  return { ok: true, befundId: String(inserted.id), created: true };
}
