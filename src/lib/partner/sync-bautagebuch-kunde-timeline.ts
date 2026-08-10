/**
 * Partner-Bautagebuch → sofort kundensichtbar in auftrag_timeline
 * (kein Freigabe-Schritt; analog CRM publishPositionEintragFuerKunde).
 */

import { resolvePartnerFileUrl } from "@/lib/partner/partner-storage";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

function eintragTypLabel(typ: string): string {
  switch (typ) {
    case "start":
      return "Start";
    case "fortschritt":
      return "Update";
    case "ergebnis":
      return "Ergebnis";
    case "weitere_arbeit":
      return "Weitere Arbeit";
    default:
      return "Bautagebuch";
  }
}

export async function syncPartnerPositionEintragToKundeTimeline(opts: {
  eintragId: string;
  auftragId: string;
  typ: string;
  beschreibung?: string | null;
  leistungName?: string | null;
  handwerkerId?: string | null;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const titelParts = [
    eintragTypLabel(opts.typ),
    opts.leistungName?.trim() || null,
  ].filter(Boolean);

  const { data: fotos } = await supabaseAdmin
    .from("eintrag_fotos")
    .select("storage_path")
    .eq("eintrag_id", opts.eintragId)
    .limit(12);

  const fotoUrls: string[] = [];
  for (const f of fotos ?? []) {
    const path = String(f.storage_path ?? "").trim();
    if (!path) continue;
    const url = await resolvePartnerFileUrl(path);
    if (url) fotoUrls.push(url);
  }

  const now = new Date().toISOString();
  const { error } = await supabaseAdmin.from("auftrag_timeline").insert({
    auftrag_id: opts.auftragId,
    typ: "bautagebuch",
    titel: titelParts.join(" · "),
    beschreibung: opts.beschreibung?.trim() || null,
    foto_urls: fotoUrls,
    fuer_kunde_freigegeben: true,
    freigegeben_at: now,
    sichtbar_fuer_kunde: true,
    handwerker_id: opts.handwerkerId ?? null,
  });

  if (error) {
    console.warn(
      "[syncPartnerPositionEintragToKundeTimeline]",
      error.message
    );
  }
}

export async function syncPartnerFreiesBautagebuchToKundeTimeline(opts: {
  auftragId: string;
  titel: string;
  beschreibung?: string | null;
  fotoPaths?: string[];
  handwerkerId?: string | null;
  bautagebuchEintragId?: string | null;
}): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const fotoUrls: string[] = [];
  for (const path of opts.fotoPaths ?? []) {
    const p = path.trim();
    if (!p) continue;
    const url = await resolvePartnerFileUrl(p);
    if (url) fotoUrls.push(url);
  }

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("auftrag_timeline")
    .insert({
      auftrag_id: opts.auftragId,
      typ: "bautagebuch",
      titel: opts.titel.trim() || "Bautagebuch",
      beschreibung: opts.beschreibung?.trim() || null,
      foto_urls: fotoUrls,
      fuer_kunde_freigegeben: true,
      freigegeben_at: now,
      sichtbar_fuer_kunde: true,
      handwerker_id: opts.handwerkerId ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.warn(
      "[syncPartnerFreiesBautagebuchToKundeTimeline]",
      error.message
    );
    return null;
  }

  const timelineId = data?.id ? String(data.id) : null;
  if (timelineId && opts.bautagebuchEintragId) {
    await supabaseAdmin
      .from("auftrag_bautagebuch_eintraege")
      .update({ timeline_id: timelineId, updated_at: now })
      .eq("id", opts.bautagebuchEintragId);
  }
  return timelineId;
}

/** Offene CRM-BT-Anforderung als erledigt markieren. */
export async function markPartnerBautagebuchAnfrageErledigt(opts: {
  auftragId: string;
  handwerkerId: string;
  anfrageId?: string | null;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const now = new Date().toISOString();
  let q = supabaseAdmin
    .from("partner_bautagebuch_anfragen")
    .update({ erledigt_at: now })
    .eq("auftrag_id", opts.auftragId)
    .eq("handwerker_id", opts.handwerkerId)
    .is("erledigt_at", null);

  if (opts.anfrageId?.trim()) {
    q = q.eq("id", opts.anfrageId.trim());
  }

  const { error } = await q;
  if (error) {
    console.warn("[markPartnerBautagebuchAnfrageErledigt]", error.message);
  }
}
