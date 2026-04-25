"use client";

import { submitFunnelLeadAction } from "@/app/actions/submit-funnel-lead";

import {
  buildTechnicalDetailsForLead,
  derivePreisModus,
  generateFunnelHumanSummary,
} from "@/lib/lead/funnel-notizen-summary";
import type { FunnelState } from "@/lib/funnel/types";

export { buildFullLeadNotizen } from "@/lib/lead/funnel-notizen-summary";

/** Serialisiert den Funnel-State für die API (keine `File`-Objekte) + CRM-Anreicherung. */
export function serializeFunnelStateForLead(
  state: FunnelState
): Record<string, unknown> {
  const { photos, ...rest } = state;
  const technicalDetails = buildTechnicalDetailsForLead(state);
  const formattedSummary = generateFunnelHumanSummary(state);
  const preis_modus = derivePreisModus(state);
  return {
    ...rest,
    photoCount: photos.length,
    photos: [],
    formattedSummary,
    technicalDetails,
    preis_modus,
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

type BuildBwLeadPayloadInput = {
  vorname?: string;
  nachname?: string;
  name?: string;
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
  extra_funnel_daten?: Record<string, unknown>;
  funnel_quelle?: string;
};

function buildLeadName(input: BuildBwLeadPayloadInput): string {
  const split = `${input.vorname ?? ""} ${input.nachname ?? ""}`.trim();
  if (split) return split;
  const fallback = (input.name ?? "").trim();
  return fallback || "Ohne Namenangabe";
}

/** Einheitliches Submit-Schema für alle BW-Lead-Formulare. */
export function buildBwLeadPayload(
  input: BuildBwLeadPayloadInput
): PostBwLeadPayload {
  const mergedFunnelDaten =
    input.extra_funnel_daten && typeof input.funnel_daten === "object"
      ? {
          ...(input.funnel_daten as Record<string, unknown>),
          ...input.extra_funnel_daten,
        }
      : input.extra_funnel_daten
        ? input.extra_funnel_daten
        : input.funnel_daten;

  return {
    name: buildLeadName(input),
    email: input.email?.trim() || undefined,
    telefon: input.telefon?.trim() || undefined,
    nachricht: input.nachricht || undefined,
    situation: input.situation,
    bereiche: input.bereiche,
    preis_min: input.preis_min,
    preis_max: input.preis_max,
    plz: input.plz,
    zeitraum: input.zeitraum,
    kundentyp: input.kundentyp,
    funnel_daten: mergedFunnelDaten,
    funnel_quelle: input.funnel_quelle,
  };
}

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
