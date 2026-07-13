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
  | "erledigt";

const MIETER_LABELS: Record<MieterStatusStufe, string> = {
  eingegangen: "Eingegangen",
  in_bearbeitung: "In Bearbeitung",
  beauftragt: "Beauftragt",
  erledigt: "Erledigt",
};

/** Mieter-Status aus Lead-Feldern (4 Stufen). */
export function resolveMieterStatusStufe(
  lead: {
    hv_meldung_status?: string | null;
    vorgang_phase?: string | null;
    org_freigabe_status?: string | null;
  },
  auftrag?: PortalAuftragKontext | null
): MieterStatusStufe {
  if (portalErledigtFromLeadAndAuftrag(lead, auftrag)) return "erledigt";

  const phase = (lead.vorgang_phase ?? "").trim();
  if (phase === "beauftragt" || phase === "abnahme") return "beauftragt";
  if (phase === "abgelehnt") return "erledigt";

  const hv = (lead.hv_meldung_status ?? "").trim();
  if (hv === "abgelehnt") return "erledigt";
  if (hv === "notmassnahme" || hv === "kleinreparatur") return "in_bearbeitung";

  const freigabe = (lead.org_freigabe_status ?? "").trim();
  if (freigabe === "freigegeben") return "in_bearbeitung";
  if (freigabe === "abgelehnt") return "erledigt";

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
  if (freigabe === "ausstehend" || freigabe === "angefordert") {
    return "zur_freigabe";
  }

  if (portalErledigtFromLeadAndAuftrag(lead, auftrag)) return "erledigt";

  const phase = (lead.vorgang_phase ?? "").trim();
  if (phase === "abgelehnt") return "erledigt";

  const hv = (lead.hv_meldung_status ?? "").trim();
  if (hv === "abgelehnt") return "erledigt";

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
  if (hv === "abgeschlossen") return "abgeschlossen";

  const freigabe = (lead.org_freigabe_status ?? "").trim();
  if (freigabe === "ausstehend" || freigabe === "angefordert") {
    return "eingegangen";
  }

  if (hv === "notmassnahme" || hv === "kleinreparatur" || hv === "angebot_eingefordert") {
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
