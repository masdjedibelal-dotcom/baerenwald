"use client";

import { submitFunnelLeadAction } from "@/app/actions/submit-funnel-lead";

import type { FunnelState } from "@/lib/funnel/types";

/** Serialisiert den Funnel-State für die API (keine `File`-Objekte). */
export function serializeFunnelStateForLead(
  state: FunnelState
): Record<string, unknown> {
  const { photos, ...rest } = state;
  return {
    ...rest,
    photoCount: photos.length,
    photos: [],
  };
}

export type PostBwLeadPayload = {
  name: string;
  email?: string;
  telefon?: string;
  nachricht?: string;
  situation?: string | null;
  bereiche?: string[];
  preis_min?: number;
  preis_max?: number;
  plz?: string;
  zeitraum?: string | null;
  kundentyp?: string | null;
  funnel_daten?: unknown;
  funnel_quelle?: string;
};

export type PostBwLeadResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/**
 * Lead sicher über Server Action speichern (Supabase + Mail) — kein `LEAD_API_SECRET` im Browser.
 */
export async function submitBwLead(
  body: PostBwLeadPayload
): Promise<PostBwLeadResult> {
  const result = await submitFunnelLeadAction({
    name: body.name,
    email: body.email,
    telefon: body.telefon,
    notizen: body.nachricht,
    situation: body.situation,
    bereiche: body.bereiche,
    preis_min: body.preis_min,
    preis_max: body.preis_max,
    plz: body.plz,
    zeitraum: body.zeitraum,
    kundentyp: body.kundentyp,
    funnel_daten: body.funnel_daten,
    kanal: "website",
    funnel_quelle: body.funnel_quelle ?? "rechner_haupt",
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true, id: result.id };
}
