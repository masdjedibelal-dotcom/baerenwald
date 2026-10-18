"use server";

import {
  type PersistLeadInput,
  persistLead,
  type PersistLeadResult,
} from "@/lib/lead/persist-lead";

/** Fotos in `funnel_daten.fotos` nur aus dem eigenen Speicher (Upload über /api/meldung/upload) zulassen. */
function nurEigeneFotos(funnelDaten: unknown): unknown {
  if (!funnelDaten || typeof funnelDaten !== "object" || Array.isArray(funnelDaten)) return funnelDaten;
  const fd = funnelDaten as Record<string, unknown>;
  if (!Array.isArray(fd.fotos)) return funnelDaten;
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const prefix = `${base}/storage/v1/object/public/`;
  const fotos = base
    ? fd.fotos.filter((u): u is string => typeof u === "string" && u.startsWith(prefix) && u.includes("/meldung/anfrage-")).slice(0, 5)
    : [];
  return { ...fd, fotos };
}

/** Gleicher Payload wie `/api/lead`, ohne Bearer — nur Server (Funnel auf derselben App). */
export async function submitFunnelLeadAction(
  input: PersistLeadInput
): Promise<PersistLeadResult> {
  return persistLead({ ...input, funnel_daten: nurEigeneFotos(input.funnel_daten) });
}
