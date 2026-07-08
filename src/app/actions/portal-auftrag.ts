"use server";

import { revalidatePath } from "next/cache";

import {
  hatOffeneKundeAuftragAenderung,
  mapPortalAuftragPositionRow,
  positionBrauchtKundeAktion,
} from "@/lib/portal/kunde-auftrag-aenderung";
import { linkPortalKundeToAuthUser } from "@/lib/portal/link-portal-kunde";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type AcceptKundeAuftragAenderungenResult =
  | { ok: true }
  | { ok: false; error: string };

async function auftragGehoertKunde(
  auftragId: string,
  kundeId: string
): Promise<boolean> {
  const { data: auftrag } = await supabaseAdmin
    .from("auftraege")
    .select("id, kunde_id, lead_id")
    .eq("id", auftragId)
    .maybeSingle();

  if (!auftrag) return false;
  if (auftrag.kunde_id != null && String(auftrag.kunde_id) === kundeId) {
    return true;
  }

  const leadId = auftrag.lead_id != null ? String(auftrag.lead_id) : null;
  if (!leadId) return false;

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("kunde_id")
    .eq("id", leadId)
    .maybeSingle();

  return lead?.kunde_id != null && String(lead.kunde_id) === kundeId;
}

/**
 * Kunde nimmt CRM-Änderungen am laufenden Auftrag an (neu / geändert / entfernt).
 * Setzt kunde_akzeptiert_at — aenderung_typ bleibt für die Handwerker-Bestätigung.
 */
export async function acceptKundeAuftragAenderungen(
  auftragId: string
): Promise<AcceptKundeAuftragAenderungenResult> {
  const id = auftragId.trim();
  if (!id) return { ok: false, error: "Ungültiger Auftrag." };

  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Portal ist nicht konfiguriert." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, error: "Bitte melde dich an." };
  }

  const link = await linkPortalKundeToAuthUser({
    userId: user.id,
    email: user.email,
  });
  if (!link.ok) return { ok: false, error: link.error };

  const gehoert = await auftragGehoertKunde(id, link.kundeId);
  if (!gehoert) {
    return { ok: false, error: "Du hast keinen Zugriff auf diesen Auftrag." };
  }

  const { data: rows, error: loadErr } = await supabaseAdmin
    .from("auftrag_positionen")
    .select(
      "id, aenderung_typ, kunde_akzeptiert_at, gewerk_name, leistung_name, beschreibung, menge, lohn_fix, material_fix, preis_alt"
    )
    .eq("auftrag_id", id);

  if (loadErr) {
    console.error("[acceptKundeAuftragAenderungen]", loadErr.message);
    return { ok: false, error: "Auftrag konnte nicht geladen werden." };
  }

  const positionen = (rows ?? []).map((r) =>
    mapPortalAuftragPositionRow(r as Record<string, unknown>)
  );

  if (!hatOffeneKundeAuftragAenderung(positionen)) {
    return { ok: true };
  }

  const now = new Date().toISOString();
  const openIds = positionen.filter(positionBrauchtKundeAktion).map((p) => p.id);

  for (const posId of openIds) {
    const { error: upErr } = await supabaseAdmin
      .from("auftrag_positionen")
      .update({ kunde_akzeptiert_at: now })
      .eq("id", posId)
      .eq("auftrag_id", id);

    if (upErr) {
      console.error("[acceptKundeAuftragAenderungen]", upErr.message);
      return { ok: false, error: "Annahme konnte nicht gespeichert werden." };
    }
  }

  revalidatePath("/portal");
  return { ok: true };
}
