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
  if (s === "kleinreparatur") return "Sofortpfad (alt)";
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
  _kunde: Pick<
    OrganisationKunde,
    "kleinreparatur_aktiv" | "freigabe_schwelle_eur"
  >,
  _preisMax: number | null | undefined
): boolean {
  // Kanon: kein Kleinreparatur-Sonderpfad mehr
  return false;
}

export function isLeadHavarie(lead: {
  situation?: string | null;
  funnel_daten?: unknown;
  freigabe_bypass_grund?: string | null;
}): boolean {
  if ((lead.freigabe_bypass_grund ?? "").trim() === "akut") return true;
  if ((lead.situation ?? "").trim() === "notfall") return true;
  const fd = lead.funnel_daten as {
    melde_kategorie?: string;
    havarie?: boolean;
    notfall?: boolean;
  } | null;
  // Kategorie „Notfall“ ODER Dringlichkeit „Akut“ (`notfall: true` im Melde-Funnel)
  if (fd?.havarie === true || fd?.notfall === true) return true;
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
