import { isPartnerAnfrageOffen } from "@/lib/partner/partner-anfrage-status";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Nach Annahme einer Auftrags-Zuweisung: zugehörige angebot_handwerker-Zeile(n)
 * auf „akzeptiert“ setzen, damit der Eintrag unter „Angebote“ erscheint (Preis/PDF).
 */
export async function syncAngebotHandwerkerAfterAuftragAccept(opts: {
  handwerkerId: string;
  angebotId: string;
}): Promise<{ anfrageId: string | null }> {
  const angebotId = opts.angebotId.trim();
  const handwerkerId = opts.handwerkerId.trim();
  if (!angebotId || !handwerkerId) return { anfrageId: null };

  const { data: rows } = await supabaseAdmin
    .from("angebot_handwerker")
    .select("id, status, antwort_at, gesendet_at, hw_eingereicht_at")
    .eq("angebot_id", angebotId)
    .eq("handwerker_id", handwerkerId);

  if (!rows?.length) return { anfrageId: null };

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
