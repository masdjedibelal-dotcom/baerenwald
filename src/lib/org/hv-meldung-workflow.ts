import type { OrganisationKunde } from "@/lib/org/types";

export type HvMeldungStatus =
  | "neu"
  | "notmassnahme"
  | "angebot_eingefordert"
  | "kleinreparatur"
  | "abgelehnt"
  | "abgeschlossen";

export function hvMeldungStatusLabel(status: string | null | undefined): string {
  const s = (status ?? "neu").toLowerCase();
  if (s === "neu") return "Neu";
  if (s === "notmassnahme") return "Läuft — Notmaßnahme";
  if (s === "angebot_eingefordert") return "Angebot wird erstellt";
  if (s === "kleinreparatur") return "Kleinreparatur";
  if (s === "abgelehnt") return "Abgelehnt";
  if (s === "abgeschlossen") return "Abgeschlossen";
  return s;
}

/** Neue Meldung: wartet auf HV, CRM noch nicht. */
export function initialHvMeldungState(): {
  hv_meldung_status: HvMeldungStatus;
  org_freigabe_status: "nicht_noetig";
} {
  return {
    hv_meldung_status: "neu",
    org_freigabe_status: "nicht_noetig",
  };
}

export function canOfferKleinreparatur(
  kunde: Pick<
    OrganisationKunde,
    "kleinreparatur_aktiv" | "kleinreparatur_schwelle_eur"
  >,
  preisMax: number | null | undefined
): boolean {
  if (!kunde.kleinreparatur_aktiv) return false;
  const schwelle = Number(kunde.kleinreparatur_schwelle_eur ?? 200);
  if (preisMax == null || preisMax <= 0) return false;
  return preisMax <= schwelle;
}

export function isLeadHavarie(lead: {
  situation?: string | null;
  funnel_daten?: unknown;
}): boolean {
  if (lead.situation === "notfall") return true;
  const fd = lead.funnel_daten as { melde_kategorie?: string; havarie?: boolean } | null;
  if (fd?.havarie === true) return true;
  return fd?.melde_kategorie === "notfall";
}

export function formatPreisspanneDisplay(
  preisMin: number | null | undefined,
  preisMax: number | null | undefined,
  preisUnsicher?: boolean | null
): string {
  if (preisUnsicher || preisMin == null || preisMax == null) {
    return "Preis nach Prüfung durch Bärenwald";
  }
  if (preisMin <= 0 && preisMax <= 0) {
    return "Preis nach Prüfung durch Bärenwald";
  }
  if (Math.abs(preisMin - preisMax) < 1) {
    return `ca. ${preisMin.toLocaleString("de-DE")} € netto`;
  }
  return `ca. ${preisMin.toLocaleString("de-DE")} – ${preisMax.toLocaleString("de-DE")} € netto`;
}
