import { supabaseAdmin } from "@/lib/supabase";

export type EnsureObjektBewohnerInput = {
  kundeId: string;
  objektId: string;
  name: string;
  /** z. B. „4. Stock li“ — optional, Default „Allgemein“ */
  wohnung?: string | null;
  etage?: string | null;
  email?: string | null;
  telefon?: string | null;
};

/**
 * Legt Einheit (falls nötig) + Bewohner am Objekt an.
 * Idempotent-ish: gleiche Wohnung (ilike) wird wiederverwendet; Bewohner immer neu.
 */
export async function ensureObjektBewohner(
  input: EnsureObjektBewohnerInput
): Promise<{ ok: true; bewohnerId: string; einheitId: string } | { ok: false; error: string }> {
  const name = input.name.trim();
  const objektId = input.objektId.trim();
  if (!name || !objektId) {
    return { ok: false, error: "Name und Objekt erforderlich." };
  }

  const { data: objekt } = await supabaseAdmin
    .from("kunden_objekte")
    .select("id")
    .eq("id", objektId)
    .eq("kunde_id", input.kundeId)
    .maybeSingle();
  if (!objekt) {
    return { ok: false, error: "Objekt nicht gefunden." };
  }

  const wohnung = input.wohnung?.trim() || "Allgemein";
  const etage = input.etage?.trim() || null;

  const { data: existing } = await supabaseAdmin
    .from("objekt_einheiten")
    .select("id")
    .eq("kunde_objekt_id", objektId)
    .eq("aktiv", true)
    .ilike("bezeichnung", wohnung)
    .maybeSingle();

  let einheitId = existing?.id ?? "";

  if (!einheitId) {
    const insertRow: Record<string, unknown> = {
      kunde_objekt_id: objektId,
      bezeichnung: wohnung,
      etage,
    };
    const { data: created, error } = await supabaseAdmin
      .from("objekt_einheiten")
      .insert(insertRow)
      .select("id")
      .single();

    if (error) {
      if (/etage/i.test(error.message)) {
        const retry = await supabaseAdmin
          .from("objekt_einheiten")
          .insert({
            kunde_objekt_id: objektId,
            bezeichnung: wohnung,
          })
          .select("id")
          .single();
        if (retry.error || !retry.data) {
          return {
            ok: false,
            error: retry.error?.message ?? "Wohnung konnte nicht angelegt werden.",
          };
        }
        einheitId = retry.data.id;
      } else {
        return { ok: false, error: error.message };
      }
    } else if (created?.id) {
      einheitId = created.id;
    } else {
      return { ok: false, error: "Wohnung konnte nicht angelegt werden." };
    }
  } else if (etage) {
    await supabaseAdmin
      .from("objekt_einheiten")
      .update({ etage })
      .eq("id", einheitId);
  }

  const { data: bewohner, error: bewError } = await supabaseAdmin
    .from("einheit_bewohner")
    .insert({
      kunde_id: input.kundeId,
      objekt_einheit_id: einheitId,
      name,
      telefon: input.telefon?.trim() || null,
      email: input.email?.trim() || null,
    })
    .select("id")
    .single();

  if (bewError || !bewohner?.id) {
    return {
      ok: false,
      error: bewError?.message ?? "Mieter konnte nicht angelegt werden.",
    };
  }

  return { ok: true, bewohnerId: bewohner.id, einheitId };
}
