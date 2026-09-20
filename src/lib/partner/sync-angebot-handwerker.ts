import { logDbError } from '@/lib/errors/log-db-error'
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

  const {data: rows, error: __dbErr419_1} = await supabaseAdmin
    .from("angebot_handwerker")
    .select("id, status, antwort_at, gesendet_at, hw_eingereicht_at")
    .eq("angebot_id", angebotId)
    .eq("handwerker_id", handwerkerId);
  if (__dbErr419_1) logDbError('lib/partner/sync-angebot-handwerker:angebot_handwerker', __dbErr419_1)

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
        // Noch offen — Annahme setzt confirmPartnerAuftrag auf akzeptiert.
        status: "angefragt",
        gesendet_at: now,
        hw_status: "offen",
        token: randomBytes(32).toString("hex"),
      })
      .select("id")
      .single();
    if (error) logDbError('lib/partner/sync-angebot-handwerker:angebot_handwerker', error)

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
      hw_eingereicht_at:
        (row.hw_eingereicht_at as string | null | undefined) ?? undefined,
    });

    if (offen) {
      // Zeile nur „gesendet“ halten — keine Vorab-Akzeptanz vor confirmPartnerAuftrag.
      if (!(row as { gesendet_at?: string | null }).gesendet_at) {
        const { error: __dbErr424_6 } = await supabaseAdmin
          .from("angebot_handwerker")
          .update({
            gesendet_at: now,
            hw_status: "offen",
          })
          .eq("id", id);
        if (__dbErr424_6) logDbError('lib/partner/sync-angebot-handwerker:angebot_handwerker', __dbErr424_6)
      }
      primaryId = id;
      continue;
    } else if (
      String(row.status ?? "").toLowerCase() === "akzeptiert" &&
      !row.hw_eingereicht_at
    ) {
      const { error: __dbErr425_7 } = await supabaseAdmin
        .from("angebot_handwerker")
        .update({ hw_status: "offen" })
        .eq("id", id);
      if (__dbErr425_7) logDbError('lib/partner/sync-angebot-handwerker:angebot_handwerker', __dbErr425_7)
    }

    if (!primaryId) primaryId = id;
    if (
      String(row.status ?? "").toLowerCase() === "akzeptiert" &&
      !row.hw_eingereicht_at
    ) {
      primaryId = id;
    }
  }

  const {data: offen, error: __dbErr420_2} = await supabaseAdmin
    .from("angebot_handwerker")
    .select("id")
    .eq("angebot_id", angebotId)
    .eq("handwerker_id", handwerkerId)
    .in("status", ["angefragt", "ausstehend", "offen", "zugewiesen"])
    .order("gesendet_at", { ascending: false })
    .limit(1);
  if (__dbErr420_2) logDbError('lib/partner/sync-angebot-handwerker:angebot_handwerker', __dbErr420_2)

  const best = offen?.[0]?.id;
  if (best) return { anfrageId: String(best) };

  const {data: accepted, error: __dbErr421_3} = await supabaseAdmin
    .from("angebot_handwerker")
    .select("id")
    .eq("angebot_id", angebotId)
    .eq("handwerker_id", handwerkerId)
    .eq("status", "akzeptiert")
    .is("hw_eingereicht_at", null)
    .order("antwort_at", { ascending: false })
    .limit(1);
  if (__dbErr421_3) logDbError('lib/partner/sync-angebot-handwerker:angebot_handwerker', __dbErr421_3)

  const acceptedId = accepted?.[0]?.id;
  return { anfrageId: acceptedId ? String(acceptedId) : primaryId };
}

async function resolveGewerkIdForAuftragAccept(
  auftragId: string,
  handwerkerId: string
): Promise<string | null> {
  if (!auftragId) return null;

  const {data: pos, error: __dbErr422_4} = await supabaseAdmin
    .from("auftrag_positionen")
    .select("gewerk_id")
    .eq("auftrag_id", auftragId)
    .eq("handwerker_id", handwerkerId)
    .not("gewerk_id", "is", null)
    .limit(1)
    .maybeSingle();
  if (__dbErr422_4) logDbError('lib/partner/sync-angebot-handwerker:auftrag_positionen', __dbErr422_4)

  if (pos?.gewerk_id) return String(pos.gewerk_id);

  const {data: zuw, error: __dbErr423_5} = await supabaseAdmin
    .from("auftrag_handwerker")
    .select("gewerk_id")
    .eq("auftrag_id", auftragId)
    .eq("handwerker_id", handwerkerId)
    .not("gewerk_id", "is", null)
    .limit(1)
    .maybeSingle();
  if (__dbErr423_5) logDbError('lib/partner/sync-angebot-handwerker:auftrag_handwerker', __dbErr423_5)

  return zuw?.gewerk_id ? String(zuw.gewerk_id) : null;
}
