import { randomBytes } from "node:crypto";

import { isPartnerAnfrageOffen } from "@/lib/partner/partner-anfrage-status";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Nach Annahme einer Auftrags-Zuweisung: zugehörige angebot_handwerker-Zeile(n)
 * auf „akzeptiert“ setzen (oder anlegen), damit der Eintrag unter „Angebote“ erscheint.
 */
export async function syncAngebotHandwerkerAfterAuftragAccept(opts: {
  handwerkerId: string;
  angebotId: string;
  auftragId?: string;
}): Promise<{ anfrageId: string | null }> {
  const angebotId = opts.angebotId.trim();
  const handwerkerId = opts.handwerkerId.trim();
  if (!angebotId || !handwerkerId) return { anfrageId: null };

  const { data: rows } = await supabaseAdmin
    .from("angebot_handwerker")
    .select("id, status, antwort_at, gesendet_at, hw_eingereicht_at")
    .eq("angebot_id", angebotId)
    .eq("handwerker_id", handwerkerId);

  if (!rows?.length) {
    const gewerkId = await resolveGewerkIdForAuftragAccept(
      opts.auftragId?.trim() ?? "",
      handwerkerId
    );
    const now = new Date().toISOString();
    const { data: created, error } = await supabaseAdmin
      .from("angebot_handwerker")
      .insert({
        angebot_id: angebotId,
        handwerker_id: handwerkerId,
        ...(gewerkId ? { gewerk_id: gewerkId } : {}),
        status: "akzeptiert",
        antwort_at: now,
        gesendet_at: now,
        hw_status: "offen",
        token: randomBytes(32).toString("hex"),
      })
      .select("id")
      .single();

    if (error || !created?.id) return { anfrageId: null };
    return { anfrageId: String(created.id) };
  }

  const now = new Date().toISOString();
  let primaryId: string | null = null;

  for (const row of rows) {
    const id = String(row.id);
    const offen = isPartnerAnfrageOffen({
      status: String(row.status ?? ""),
      antwort_at: row.antwort_at as string | null | undefined,
      gesendet_at: (row as { gesendet_at?: string | null }).gesendet_at,
    });

    if (offen) {
      await supabaseAdmin
        .from("angebot_handwerker")
        .update({
          status: "akzeptiert",
          antwort_at: now,
          hw_status: "offen",
        })
        .eq("id", id)
        .is("antwort_at", null);
    } else if (
      String(row.status ?? "").toLowerCase() === "akzeptiert" &&
      !row.hw_eingereicht_at
    ) {
      await supabaseAdmin
        .from("angebot_handwerker")
        .update({ hw_status: "offen" })
        .eq("id", id);
    }

    if (!primaryId) primaryId = id;
    if (
      String(row.status ?? "").toLowerCase() === "akzeptiert" &&
      !row.hw_eingereicht_at
    ) {
      primaryId = id;
    }
  }

  const { data: offen } = await supabaseAdmin
    .from("angebot_handwerker")
    .select("id")
    .eq("angebot_id", angebotId)
    .eq("handwerker_id", handwerkerId)
    .eq("status", "akzeptiert")
    .is("hw_eingereicht_at", null)
    .order("antwort_at", { ascending: false })
    .limit(1);

  const best = offen?.[0]?.id;
  return { anfrageId: best ? String(best) : primaryId };
}

async function resolveGewerkIdForAuftragAccept(
  auftragId: string,
  handwerkerId: string
): Promise<string | null> {
  if (!auftragId) return null;

  const { data: pos } = await supabaseAdmin
    .from("auftrag_positionen")
    .select("gewerk_id")
    .eq("auftrag_id", auftragId)
    .eq("handwerker_id", handwerkerId)
    .not("gewerk_id", "is", null)
    .limit(1)
    .maybeSingle();

  if (pos?.gewerk_id) return String(pos.gewerk_id);

  const { data: zuw } = await supabaseAdmin
    .from("auftrag_handwerker")
    .select("gewerk_id")
    .eq("auftrag_id", auftragId)
    .eq("handwerker_id", handwerkerId)
    .not("gewerk_id", "is", null)
    .limit(1)
    .maybeSingle();

  return zuw?.gewerk_id ? String(zuw.gewerk_id) : null;
}
