import { randomBytes } from "node:crypto";

import { supabaseAdmin } from "@/lib/supabase";

/**
 * Direktauftrag / Notfall: Auftrag oft ohne `angebot_id` und ohne
 * `angebot_handwerker`. Rechnung/Upload hängen aber an AH — daher Schatten-
 * Angebot + AH anlegen (idempotent).
 */
export async function ensurePartnerAngebotHandwerkerForAuftrag(opts: {
  auftragId: string;
  handwerkerId: string;
  /** Nach Portal-Annahme / für Rechnung: AH als übernommen markieren. */
  markAccepted?: boolean;
}): Promise<{ ok: true; anfrageId: string } | { ok: false; error: string }> {
  const auftragId = opts.auftragId.trim();
  const handwerkerId = opts.handwerkerId.trim();
  if (!auftragId || !handwerkerId) {
    return { ok: false, error: "Auftrag oder Handwerker fehlt." };
  }

  const { data: auftrag, error: aufErr } = await supabaseAdmin
    .from("auftraege")
    .select("id, angebot_id, lead_id, kunde_id, titel, handwerker_bestaetigt_at")
    .eq("id", auftragId)
    .maybeSingle();

  if (aufErr || !auftrag) {
    return { ok: false, error: aufErr?.message ?? "Auftrag nicht gefunden." };
  }

  let angebotId =
    auftrag.angebot_id != null ? String(auftrag.angebot_id).trim() : "";

  const accepted =
    opts.markAccepted === true ||
    Boolean(String(auftrag.handwerker_bestaetigt_at ?? "").trim());

  if (angebotId) {
    const existing = await findAnfrageId(angebotId, handwerkerId);
    if (existing) {
      if (accepted) {
        await markAnfrageAccepted(existing);
      }
      return { ok: true, anfrageId: existing };
    }
  }

  if (!angebotId) {
    const now = new Date().toISOString();
    const titel = String(auftrag.titel ?? "").trim() || "Direktauftrag";
    const { data: ang, error: angErr } = await supabaseAdmin
      .from("angebote")
      .insert({
        lead_id: auftrag.lead_id ?? null,
        kunde_id: auftrag.kunde_id ?? null,
        status: "handwerker_akzeptiert",
        positionen: [],
        herkunft: "system",
        notizen: `Schatten-Angebot für Direktauftrag (${titel}) — Partner-Rechnung`,
        projektbeschreibung: titel,
        akzeptiert_at: now,
        gesendet_handwerker_at: now,
      })
      .select("id")
      .single();

    if (angErr || !ang?.id) {
      return {
        ok: false,
        error: angErr?.message ?? "Schatten-Angebot konnte nicht angelegt werden.",
      };
    }

    angebotId = String(ang.id);
    const { error: linkErr } = await supabaseAdmin
      .from("auftraege")
      .update({ angebot_id: angebotId })
      .eq("id", auftragId)
      .is("angebot_id", null);

    if (linkErr) {
      console.warn(
        "[ensurePartnerAngebotHandwerkerForAuftrag] auftrag link:",
        linkErr.message
      );
    }
  }

  const again = await findAnfrageId(angebotId, handwerkerId);
  if (again) {
    if (accepted) {
      await markAnfrageAccepted(again);
    }
    return { ok: true, anfrageId: again };
  }

  const gewerkId = await resolveGewerkId(auftragId, handwerkerId);
  const now = new Date().toISOString();

  const { data: created, error: insErr } = await supabaseAdmin
    .from("angebot_handwerker")
    .insert({
      angebot_id: angebotId,
      handwerker_id: handwerkerId,
      ...(gewerkId ? { gewerk_id: gewerkId } : {}),
      status: accepted ? "akzeptiert" : "angefragt",
      gesendet_at: now,
      antwort_at: accepted ? now : null,
      bestaetigt_at: accepted ? now : null,
      hw_status: accepted ? "uebernommen" : "offen",
      hw_eingereicht_at: accepted ? now : null,
      token: randomBytes(32).toString("hex"),
    })
    .select("id")
    .single();

  if (insErr || !created?.id) {
    const raced = await findAnfrageId(angebotId, handwerkerId);
    if (raced) return { ok: true, anfrageId: raced };
    return {
      ok: false,
      error: insErr?.message ?? "angebot_handwerker konnte nicht angelegt werden.",
    };
  }

  return { ok: true, anfrageId: String(created.id) };
}

async function markAnfrageAccepted(anfrageId: string): Promise<void> {
  const now = new Date().toISOString();
  await supabaseAdmin
    .from("angebot_handwerker")
    .update({
      status: "akzeptiert",
      antwort_at: now,
      bestaetigt_at: now,
      hw_status: "uebernommen",
      hw_eingereicht_at: now,
    })
    .eq("id", anfrageId)
    .is("hw_eingereicht_at", null);
}

async function findAnfrageId(
  angebotId: string,
  handwerkerId: string
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("angebot_handwerker")
    .select("id")
    .eq("angebot_id", angebotId)
    .eq("handwerker_id", handwerkerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ? String(data.id) : null;
}

async function resolveGewerkId(
  auftragId: string,
  handwerkerId: string
): Promise<string | null> {
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
