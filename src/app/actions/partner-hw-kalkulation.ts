"use server";

import { revalidatePath } from "next/cache";

import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import {
  ANGEBOT_HERKUNFT_HANDWERKER,
  hwKalkSumme,
  hwKalkValid,
  type HwKalkPosition,
} from "@/lib/portal2/hw-kalkulation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type SubmitHwKalkResult =
  | { ok: true; angebotId: string; brutto: number }
  | { ok: false; error: string };

/**
 * D11 `submitHwAngebot` — Positionen → echtes `angebote`-Datensatz (herkunft=handwerker).
 */
export async function submitPartnerHwKalkulation(input: {
  anfrageId: string;
  positionen: HwKalkPosition[];
  dauerHinweis?: string | null;
}): Promise<SubmitHwKalkResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
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

  const anfrageId = input.anfrageId.trim();
  if (!anfrageId) return { ok: false, error: "Anfrage fehlt." };

  const cleaned = input.positionen
    .map((p) => ({
      pos: String(p.pos ?? "").trim(),
      menge: String(p.menge ?? "1").trim() || "1",
      einzel: Number(p.einzel) || 0,
      gewerk: String(p.gewerk ?? "Sonstiges").trim() || "Sonstiges",
    }))
    .filter((p) => p.pos.length > 0);

  if (!hwKalkValid(cleaned)) {
    return { ok: false, error: "Bitte mindestens eine gültige Position angeben." };
  }

  const sum = hwKalkSumme(cleaned);

  const { data: ah, error: ahErr } = await supabaseAdmin
    .from("angebot_handwerker")
    .select("id, handwerker_id, angebot_id, status, hw_status")
    .eq("id", anfrageId)
    .maybeSingle();

  if (ahErr || !ah) return { ok: false, error: "Anfrage nicht gefunden." };
  if (String(ah.handwerker_id) !== link.handwerkerId) {
    return { ok: false, error: "Keine Berechtigung." };
  }

  const angebotId = String(ah.angebot_id ?? "").trim();
  if (!angebotId) {
    return { ok: false, error: "Kein verknüpftes Angebot." };
  }

  const { data: angebot } = await supabaseAdmin
    .from("angebote")
    .select("id, lead_id, kunde_id, kunde_objekt_id, angebotsnr")
    .eq("id", angebotId)
    .maybeSingle();

  if (!angebot) return { ok: false, error: "Angebot nicht gefunden." };

  const positionenJson = cleaned.map((p, i) => ({
    pos: i + 1,
    titel: p.pos,
    beschreibung: p.pos,
    menge: p.menge,
    einzelpreis: p.einzel,
    gewerk: p.gewerk,
    einheit: p.menge.replace(/^\d+(?:[.,]\d+)?\s*/, "").trim() || "Stk.",
  }));

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    positionen: positionenJson,
    gesamt_preis: Math.round(sum.brutto * 100) / 100,
    gesamt_min: Math.round(sum.net * 100) / 100,
    gesamt_max: Math.round(sum.brutto * 100) / 100,
    status_einfach: "gesendet",
    gesendet_am: now,
    herkunft: ANGEBOT_HERKUNFT_HANDWERKER,
    leistungsumfang: cleaned.map((p) => p.pos).join("; "),
  };
  if (input.dauerHinweis?.trim()) {
    patch.notizen = [
      String((angebot as { notizen?: string }).notizen ?? "").trim(),
      `HW-Dauer: ${input.dauerHinweis.trim()}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  const { error: updAng } = await supabaseAdmin
    .from("angebote")
    .update(patch)
    .eq("id", angebotId);

  if (updAng) {
    // Migration noch nicht applied: ohne herkunft erneut versuchen
    if (/herkunft/i.test(updAng.message)) {
      const { herkunft: _h, ...withoutHerkunft } = patch;
      const { error: retry } = await supabaseAdmin
        .from("angebote")
        .update(withoutHerkunft)
        .eq("id", angebotId);
      if (retry) return { ok: false, error: retry.message };
    } else {
      return { ok: false, error: updAng.message };
    }
  }

  const konditionen = {
    version: 1 as const,
    quelle: "hw_kalkulation",
    positionen: cleaned.map((p, i) => ({
      position_id: `hw-kalk-${i + 1}`,
      leistung_name: p.pos,
      gewerk_name: p.gewerk,
      menge: parseFloat(String(p.menge).replace(",", ".")) || 1,
      einheit: p.menge.replace(/^\d+(?:[.,]\d+)?\s*/, "").trim() || "Stk.",
      einzelpreis_netto: p.einzel,
      gesamt_netto: p.einzel * (parseFloat(String(p.menge).replace(",", ".")) || 1),
    })),
  };

  const { error: updAh } = await supabaseAdmin
    .from("angebot_handwerker")
    .update({
      hw_status: "eingereicht",
      hw_eingereicht_at: now,
      hw_preis_netto: Math.round(sum.net * 100) / 100,
      hw_preis_brutto: Math.round(sum.brutto * 100) / 100,
      hw_konditionen: konditionen,
      status: String(ah.status).toLowerCase() === "offen" ? "akzeptiert" : ah.status,
      antwort_at: now,
    })
    .eq("id", anfrageId)
    .eq("handwerker_id", link.handwerkerId);

  if (updAh) return { ok: false, error: updAh.message };

  revalidatePath("/partner");
  revalidatePath("/portal");
  return {
    ok: true,
    angebotId,
    brutto: Math.round(sum.brutto * 100) / 100,
  };
}
