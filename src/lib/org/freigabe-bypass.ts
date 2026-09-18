import type { FreigabeBypassGrund } from "@/lib/org/types";

export type FreigabeBypassInfoKind = "akut" | "schwelle";

/** Funnel-Flag Sofortmaßnahme — einheitlich für Banner, Queue, APIs. */
export function funnelDirektauftragFromDaten(
  funnel: unknown
): boolean {
  return Boolean(
    funnel &&
      typeof funnel === "object" &&
      !Array.isArray(funnel) &&
      (funnel as { direktauftrag?: unknown }).direktauftrag === true
  );
}

/** CRM setzt `leads.freigabe_bypass_grund` — Portal zeigt nur Info, rechnet nicht selbst. */
export function parseFreigabeBypassGrund(
  raw: unknown
): FreigabeBypassGrund | null {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "schwelle" || s === "akut") return s;
  return null;
}

export type HvFreigabeEntfaelltOpts = {
  orgFreigabeStatus?: string | null;
  bypassGrund?: string | null;
  /** Funnel-Flag Sofortmaßnahme */
  funnelDirektauftrag?: boolean | null;
  /** @deprecated nicht mehr für Schwellen-Fallback genutzt */
  hvMeldungStatus?: string | null;
  /**
   * Angebot an die HV zugestellt (nicht nur Preisindikation aus der Meldung).
   * Schwellen-Bypass / „Preis unter Schwelle“ gilt erst dann.
   */
  angebotZugestellt?: boolean | null;
};

/**
 * HV muss nicht freigeben (Akut-Direktauftrag oder Preis unter Schwelle).
 *
 * Akut-Banner NUR bei:
 * - `freigabe_bypass_grund === "akut"` (CRM), oder
 * - explizitem Funnel-Flag `direktauftrag === true`
 *
 * Schwelle-Banner NUR bei:
 * - `freigabe_bypass_grund === "schwelle"` **und**
 * - zugestelltem Angebot (`angebotZugestellt`)
 *
 * Nie aus Melde-Preisindikation, nie allein aus `nicht_noetig` / Status `neu`.
 */
export function hvFreigabeEntfaellt(
  opts: HvFreigabeEntfaelltOpts
): FreigabeBypassInfoKind | null {
  // Legacy-Fallback „neu/nicht_noetig → Banner“ entfernt
  void opts.hvMeldungStatus;
  void opts.orgFreigabeStatus;

  const bypass = parseFreigabeBypassGrund(opts.bypassGrund);
  const angebotDa = opts.angebotZugestellt === true;

  if (bypass === "akut" || opts.funnelDirektauftrag === true) {
    return "akut";
  }

  if (bypass === "schwelle" && angebotDa) {
    return "schwelle";
  }

  return null;
}

/** Keine Freigeben-/Ablehnen-CTAs. */
export function hvMussNichtFreigeben(opts: HvFreigabeEntfaelltOpts): boolean {
  return hvFreigabeEntfaellt(opts) != null;
}

/** @deprecated Nutze hvFreigabeEntfaellt */
export function isFreigabeBypassInfo(opts: {
  orgFreigabeStatus?: string | null;
  bypassGrund?: FreigabeBypassGrund | null;
  angebotZugestellt?: boolean | null;
}): boolean {
  return hvFreigabeEntfaellt(opts) != null;
}

export function freigabeBypassInfoCopy(opts: {
  bypassGrund: FreigabeBypassInfoKind;
  schwelleLabel?: string | null;
}): { title: string; body: string } {
  if (opts.bypassGrund === "akut") {
    return {
      title: "Akut / Sofortmaßnahme",
      body: "Keine Freigabe oder Annahme nötig — wir kümmern uns direkt um den Auftrag.",
    };
  }
  const schwelle = opts.schwelleLabel?.trim();
  return {
    title: schwelle
      ? `Unter Freigabeschwelle (${schwelle})`
      : "Unter Freigabeschwelle",
    body: "Aufgrund Ihrer erteilten Freigabeschwelle liegt das Angebot darunter — wir kümmern uns direkt um den Auftrag. Keine Freigabe oder Annahme nötig.",
  };
}

/**
 * Heuristik: Freigabe-Status nach Angebotszustellung
 * (ausstehend / entschieden) — nicht „nicht_noetig“ am Melde-Start.
 */
export function orgFreigabeStatusImpliesAngebot(
  orgFreigabeStatus?: string | null
): boolean {
  const st = String(orgFreigabeStatus ?? "").trim().toLowerCase();
  return (
    st === "ausstehend" ||
    st === "beschluss_ausstehend" ||
    st === "angefordert" ||
    st === "freigegeben" ||
    st === "abgelehnt"
  );
}

/**
 * Für HV-Banner/CTAs: Angebot gilt als zugestellt, wenn
 * - Freigabe-Status nach Zustellung, oder
 * - CRM Bypass „schwelle“ (wird nur nach Angebot gesetzt, Status oft `nicht_noetig`).
 */
export function resolveAngebotZugestelltForHvFreigabe(opts: {
  orgFreigabeStatus?: string | null;
  bypassGrund?: string | null;
  hasAngebot?: boolean | null;
}): boolean {
  if (opts.hasAngebot === true) return true;
  if (parseFreigabeBypassGrund(opts.bypassGrund) === "schwelle") return true;
  return orgFreigabeStatusImpliesAngebot(opts.orgFreigabeStatus);
}
