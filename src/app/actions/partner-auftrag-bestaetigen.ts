"use server";

import { revalidatePath } from "next/cache";

import { confirmPartnerProjektvertrag } from "@/app/actions/partner-vertrag";
import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import { isPartnerAngebotOffenListItem } from "@/lib/partner/partner-offen-status";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type PartnerAuftragBestaetigenResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Ein-Klick-Bestätigung: Auftrag annehmen + optional Projektvertrag.
 * Setzt status=angenommen, bestaetigt_at, hw_status=uebernommen (CRM-Kompatibilität).
 */
export async function confirmPartnerAuftrag(opts: {
  anfrageId: string;
  gelesen: boolean;
  verbindlich: boolean;
}): Promise<PartnerAuftragBestaetigenResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
  }

  if (!opts.gelesen || !opts.verbindlich) {
    return {
      ok: false,
      error: "Bitte Rahmenvertrag lesen und verbindliche Annahme bestätigen.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Nicht angemeldet." };

  const link = await linkPortalHandwerkerToAuthUser({
    userId: user.id,
    email: user.email,
  });
  if (!link.ok) return { ok: false, error: link.error };

  const { data: row, error } = await supabaseAdmin
    .from("angebot_handwerker")
    .select(
      `
      id,
      handwerker_id,
      status,
      antwort_at,
      gesendet_at,
      hw_status,
      hw_eingereicht_at,
      bestaetigt_at,
      angebot_id,
      angebote(id)
    `
    )
    .eq("id", opts.anfrageId.trim())
    .maybeSingle();

  if (error || !row) return { ok: false, error: "Vorgang nicht gefunden." };
  if (String(row.handwerker_id) !== link.handwerkerId) {
    return { ok: false, error: "Keine Berechtigung." };
  }

  const timingItem = {
    status: String(row.status ?? ""),
    antwort_at: row.antwort_at as string | null,
    gesendet_at: (row as { gesendet_at?: string | null }).gesendet_at,
    hw_status: (row as { hw_status?: string | null }).hw_status ?? undefined,
    hw_eingereicht_at: (row as { hw_eingereicht_at?: string | null }).hw_eingereicht_at,
    bestaetigt_at: (row as { bestaetigt_at?: string | null }).bestaetigt_at,
    projektvertrag_bestaetigt_am: undefined,
  };

  if (!isPartnerAngebotOffenListItem(timingItem as Parameters<typeof isPartnerAngebotOffenListItem>[0])) {
    return { ok: false, error: "Dieser Vorgang kann nicht mehr bestätigt werden." };
  }

  const now = new Date().toISOString();

  const { error: upErr } = await supabaseAdmin
    .from("angebot_handwerker")
    .update({
      status: "angenommen",
      antwort_at: row.antwort_at ?? now,
      bestaetigt_at: now,
      hw_status: "uebernommen",
    })
    .eq("id", opts.anfrageId.trim())
    .eq("handwerker_id", link.handwerkerId);

  if (upErr) return { ok: false, error: upErr.message };

  const { data: auftrag } = await supabaseAdmin
    .from("auftraege")
    .select("id")
    .eq("angebot_id", String(row.angebot_id ?? ""))
    .maybeSingle();

  const auftragId = auftrag?.id ? String(auftrag.id) : null;
  if (auftragId) {
    const vertragRes = await confirmPartnerProjektvertrag({
      auftragId,
      gelesen: opts.gelesen,
      verbindlich: opts.verbindlich,
    });
    if (!vertragRes.ok) {
      return { ok: false, error: vertragRes.error };
    }
  }

  revalidatePath("/partner");
  return { ok: true };
}
