/**
 * Einheitliches Status-Vokabular (PDF: Neu · Wartet Freigabe · In Ausführung · Erledigt · Notfall · Storniert)
 */

import {
  portalErledigtFromLeadAndAuftrag,
  type PortalAuftragKontext,
} from "@/lib/portal/vorgang-erledigt";

export type PlattformStatusKey =
  | "neu"
  | "wartet_freigabe"
  | "in_ausfuehrung"
  | "erledigt"
  | "notfall"
  | "storniert";

export const PLATTFORM_STATUS_LABELS: Record<PlattformStatusKey, string> = {
  neu: "Neu",
  wartet_freigabe: "Wartet Freigabe",
  in_ausfuehrung: "In Ausführung",
  erledigt: "Erledigt",
  notfall: "Notfall",
  storniert: "Storniert",
};

export function resolvePlattformStatus(
  lead: {
    hv_meldung_status?: string | null;
    vorgang_phase?: string | null;
    org_freigabe_status?: string | null;
    storniert_am?: string | null;
    funnel_daten?: unknown;
  },
  auftrag?: PortalAuftragKontext | null
): PlattformStatusKey {
  if (lead.storniert_am) return "storniert";

  if (portalErledigtFromLeadAndAuftrag(lead, auftrag)) return "erledigt";

  const fd = lead.funnel_daten as { melde_kategorie?: string } | null;
  if (fd?.melde_kategorie === "notfall" || lead.hv_meldung_status === "notmassnahme") {
    return "notfall";
  }

  const phase = (lead.vorgang_phase ?? "").trim();
  if (phase === "abgelehnt") return "storniert";

  const hv = (lead.hv_meldung_status ?? "").trim();
  if (hv === "abgelehnt") return "storniert";

  const freigabe = (lead.org_freigabe_status ?? "").trim();
  if (freigabe === "ausstehend" || freigabe === "angefordert") {
    return "wartet_freigabe";
  }

  if (
    hv === "notmassnahme" ||
    hv === "kleinreparatur" ||
    hv === "angebot_eingefordert" ||
    phase === "in_bearbeitung" ||
    phase === "beauftragt" ||
    phase === "abnahme" ||
    freigabe === "freigegeben"
  ) {
    return "in_ausfuehrung";
  }

  return "neu";
}

export function plattformStatusLabel(key: PlattformStatusKey): string {
  return PLATTFORM_STATUS_LABELS[key];
}

export function plattformStatusPillClass(key: PlattformStatusKey): string {
  switch (key) {
    case "neu":
      return "tag bg-orange-100 text-orange-800";
    case "wartet_freigabe":
      return "tag bg-amber-100 text-amber-900";
    case "in_ausfuehrung":
      return "tag bg-blue-100 text-blue-800";
    case "erledigt":
      return "tag bg-emerald-100 text-emerald-700";
    case "notfall":
      return "tag bg-red-100 text-red-800";
    case "storniert":
      return "tag bg-neutral-200 text-neutral-600";
    default:
      return "tag bg-muted text-text-secondary";
  }
}

/** Mieter-Status-Timeline (S11) */
export type MieterTimelineStep = {
  id: string;
  label: string;
  done: boolean;
  active: boolean;
};

export function buildMieterStatusTimeline(stufe: string): MieterTimelineStep[] {
  const order = ["eingegangen", "in_bearbeitung", "beauftragt", "erledigt"] as const;
  const labels: Record<(typeof order)[number], string> = {
    eingegangen: "Eingegangen",
    in_bearbeitung: "In Bearbeitung",
    beauftragt: "Bestätigung",
    erledigt: "Erledigt",
  };
  const idx = order.indexOf(stufe as (typeof order)[number]);
  const current = idx >= 0 ? idx : 0;
  return order.map((id, i) => ({
    id,
    label: labels[id],
    done: i < current,
    active: i === current,
  }));
}
