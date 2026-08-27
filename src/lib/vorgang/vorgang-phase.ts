import type { PortalAuftragKontext } from "@/lib/portal/vorgang-erledigt";
import { portalErledigtFromLeadAndAuftrag } from "@/lib/portal/vorgang-erledigt";

/** Kanonische Vorgangsphasen (intern) — Mieter/HV/Partner sehen abgeleitete Labels. */

export const VORGANG_PHASEN = [
  "eingegangen",
  "in_bearbeitung",
  "beauftragt",
  "abnahme",
  "abgeschlossen",
  "abgelehnt",
] as const;

export type VorgangPhase = (typeof VORGANG_PHASEN)[number];

export type MieterStatusStufe =
  | "eingegangen"
  | "in_bearbeitung"
  | "beauftragt"
  | "vor_ort"
  | "erledigt";

const MIETER_LABELS: Record<MieterStatusStufe, string> = {
  eingegangen: "Eingegangen",
  in_bearbeitung: "In Bearbeitung",
  beauftragt: "Beauftragt",
  vor_ort: "Handwerker vor Ort",
  erledigt: "Erledigt",
};

/**
 * CRM → Mieter-Timeline (kanonische Zuordnung, Glossar + status-map Kommentar).
 *
 * | CRM-Signal                                              | Mieter-Stufe        |
 * |---------------------------------------------------------|---------------------|
 * | Lead neu / Meldung ohne Bearbeitung                     | Eingegangen         |
 * | Lead kontaktiert \| termin; Freigabe; HV prüft          | In Bearbeitung      |
 * | Auftrag erstellt; HW/Partner gesendet/angefragt         | Beauftragt          |
 * | HW bestätigt; Bautagebuch; mieter_vor_ort; in_arbeit    | Handwerker vor Ort  |
 * | Abnahme ohne offene Mängel; Auftrag abgeschlossen; Positionen erledigt | Erledigt |
 * | Offene Mängel (Abnahme)                                  | NICHT Erledigt (bleibt Vor Ort) |
 * | Rechnung / Bezahlung                                     | für Melder irrelevant (bleibt Erledigt) |
 */
export function resolveMieterStatusStufe(
  lead: {
    status?: string | null;
    hv_meldung_status?: string | null;
    vorgang_phase?: string | null;
    org_freigabe_status?: string | null;
    mieter_vor_ort_at?: string | null;
  },
  auftrag?: PortalAuftragKontext | null
): MieterStatusStufe {
  const leadStatus = (lead.status ?? "").trim().toLowerCase();
  const phase = (lead.vorgang_phase ?? "").trim();
  const hv = (lead.hv_meldung_status ?? "").trim();
  const freigabe = (lead.org_freigabe_status ?? "").trim();
  const auftragStatus = (auftrag?.status ?? "").trim().toLowerCase();
  const offeneMaengel = Boolean(auftrag?.hasOffeneMaengel);

  /* Erledigt nur ohne offene Mängel — Rechnung zählt für Melder nicht */
  if (!offeneMaengel && portalErledigtFromLeadAndAuftrag(lead, auftrag)) {
    return "erledigt";
  }
  if (
    !offeneMaengel &&
    (leadStatus === "abgeschlossen" ||
      phase === "abgeschlossen" ||
      hv === "abgeschlossen" ||
      hv === "hm_erledigt" ||
      auftragStatus === "abgeschlossen" ||
      auftragStatus === "abnahme")
  ) {
    return "erledigt";
  }
  if (
    !offeneMaengel &&
    (phase === "abgelehnt" || hv === "abgelehnt" || freigabe === "abgelehnt")
  ) {
    return "erledigt";
  }

  /* Handwerker vor Ort — Abnahme ohne Mängel ist oben schon Erledigt */
  const vorOrt =
    Boolean(lead.mieter_vor_ort_at?.trim()) ||
    Boolean(auftrag?.handwerkerBestaetigt) ||
    Boolean(auftrag?.hasBautagebuch) ||
    auftragStatus === "in_arbeit" ||
    (offeneMaengel &&
      (auftragStatus === "abnahme" ||
        auftragStatus === "in_arbeit" ||
        Boolean(lead.mieter_vor_ort_at?.trim())));

  if (vorOrt || offeneMaengel) {
    /* Mit offenen Mängeln: mindestens Vor Ort / Beauftragt, nie Erledigt */
    if (
      vorOrt ||
      auftragStatus === "abnahme" ||
      auftragStatus === "in_arbeit" ||
      Boolean(lead.mieter_vor_ort_at?.trim())
    ) {
      return "vor_ort";
    }
    return "beauftragt";
  }

  /* Beauftragt: Auftrag oder HW gesendet */
  const hwGesendet = Boolean(auftrag?.hwGesendet)
  if (
    auftrag ||
    phase === "beauftragt" ||
    phase === "abnahme" ||
    leadStatus === "auftrag" ||
    hwGesendet
  ) {
    return "beauftragt";
  }

  /* In Bearbeitung: CRM kontaktiert/termin + HV-Prüfsignale */
  if (
    leadStatus === "kontaktiert" ||
    leadStatus === "termin" ||
    leadStatus === "angebot" ||
    freigabe === "freigegeben" ||
    hv === "notmassnahme" ||
    hv === "kleinreparatur" ||
    hv === "angebot_eingefordert" ||
    hv === "hm_pruefung" ||
    phase === "in_bearbeitung"
  ) {
    return "in_bearbeitung";
  }

  return "eingegangen";
}

export function mieterStatusLabel(stufe: MieterStatusStufe): string {
  return MIETER_LABELS[stufe];
}

/** HV-Portal-Filter: zur_freigabe | aktiv | erledigt */
export function resolveHvVorgangFilter(
  lead: {
    hv_meldung_status?: string | null;
    vorgang_phase?: string | null;
    org_freigabe_status?: string | null;
    anlass?: string | null;
  },
  auftrag?: PortalAuftragKontext | null
): "zur_freigabe" | "aktiv" | "erledigt" {
  const freigabe = (lead.org_freigabe_status ?? "").trim();
  if (
    freigabe === "ausstehend" ||
    freigabe === "beschluss_ausstehend" ||
    freigabe === "angefordert"
  ) {
    return "zur_freigabe";
  }

  if (portalErledigtFromLeadAndAuftrag(lead, auftrag)) return "erledigt";

  const phase = (lead.vorgang_phase ?? "").trim();
  if (phase === "abgelehnt") return "erledigt";

  const hv = (lead.hv_meldung_status ?? "").trim();
  if (hv === "abgelehnt") return "erledigt";
  if (hv === "hm_erledigt") return "erledigt";
  if (hv === "neu") return "zur_freigabe";

  return "aktiv";
}

/** CRM/Intern: volles Phasenmodell aus vorhandenen Feldern ableiten. */
export function resolveVorgangPhase(lead: {
  hv_meldung_status?: string | null;
  vorgang_phase?: string | null;
  org_freigabe_status?: string | null;
  anlass?: string | null;
}): VorgangPhase {
  const stored = (lead.vorgang_phase ?? "").trim();
  if (stored && VORGANG_PHASEN.includes(stored as VorgangPhase)) {
    return stored as VorgangPhase;
  }

  const hv = (lead.hv_meldung_status ?? "").trim();
  if (hv === "abgelehnt") return "abgelehnt";
  if (hv === "abgeschlossen" || hv === "hm_erledigt") return "abgeschlossen";

  const freigabe = (lead.org_freigabe_status ?? "").trim();
  if (
    freigabe === "ausstehend" ||
    freigabe === "beschluss_ausstehend" ||
    freigabe === "angefordert"
  ) {
    return "eingegangen";
  }

  if (
    hv === "notmassnahme" ||
    hv === "kleinreparatur" ||
    hv === "angebot_eingefordert" ||
    hv === "hm_pruefung"
  ) {
    return "in_bearbeitung";
  }

  return "eingegangen";
}

export const HV_PHASE_LABELS: Record<VorgangPhase, string> = {
  eingegangen: "Eingegangen",
  in_bearbeitung: "In Bearbeitung",
  beauftragt: "Beauftragt",
  abnahme: "Abnahme",
  abgeschlossen: "Abgeschlossen",
  abgelehnt: "Abgelehnt",
};

export function hvPhaseLabel(phase: VorgangPhase): string {
  return HV_PHASE_LABELS[phase];
}
