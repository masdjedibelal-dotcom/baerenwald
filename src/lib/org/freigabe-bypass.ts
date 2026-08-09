import type { FreigabeBypassGrund } from "@/lib/org/types";

export type FreigabeBypassInfoKind = "akut" | "schwelle";

/** CRM setzt `leads.freigabe_bypass_grund` — Portal zeigt nur Info, rechnet nicht selbst. */
export function parseFreigabeBypassGrund(
  raw: unknown
): FreigabeBypassGrund | null {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "schwelle" || s === "akut") return s;
  return null;
}

/**
 * HV muss nicht freigeben (Akut-Direktauftrag oder Preis unter Schwelle).
 * Primär: `freigabe_bypass_grund` — zuverlässig, unabhängig vom Flow-Status.
 */
export function hvFreigabeEntfaellt(opts: {
  orgFreigabeStatus?: string | null;
  bypassGrund?: string | null;
  /** Funnel-Flag Sofortmaßnahme */
  funnelDirektauftrag?: boolean | null;
  /** Hilft bei Legacy ohne Bypass-Spalte */
  hvMeldungStatus?: string | null;
}): FreigabeBypassInfoKind | null {
  const bypass = parseFreigabeBypassGrund(opts.bypassGrund);
  if (bypass === "akut" || bypass === "schwelle") return bypass;

  const st = String(opts.orgFreigabeStatus ?? "").trim().toLowerCase();
  if (st !== "nicht_noetig") return null;

  // Legacy-Fallback: Status gesetzt, Spalte fehlt
  if (opts.funnelDirektauftrag === true) return "akut";
  if ((opts.hvMeldungStatus ?? "").trim() === "neu") return "akut";
  return "schwelle";
}

/** Keine Freigeben-/Ablehnen-CTAs. */
export function hvMussNichtFreigeben(opts: {
  orgFreigabeStatus?: string | null;
  bypassGrund?: string | null;
  funnelDirektauftrag?: boolean | null;
  hvMeldungStatus?: string | null;
}): boolean {
  return hvFreigabeEntfaellt(opts) != null;
}

/** @deprecated Nutze hvFreigabeEntfaellt */
export function isFreigabeBypassInfo(opts: {
  orgFreigabeStatus?: string | null;
  bypassGrund?: FreigabeBypassGrund | null;
}): boolean {
  return hvFreigabeEntfaellt(opts) != null;
}

export function freigabeBypassInfoCopy(opts: {
  bypassGrund: FreigabeBypassInfoKind;
  schwelleLabel?: string | null;
}): { title: string; body: string } {
  if (opts.bypassGrund === "akut") {
    return {
      title: "Akut-Fall",
      body: "Keine Freigabe notwendig",
    };
  }
  const schwelle = opts.schwelleLabel?.trim();
  return {
    title: schwelle
      ? `Preis unter Schwelle (${schwelle})`
      : "Preis unter Schwelle",
    body: "Keine Freigabe notwendig",
  };
}
