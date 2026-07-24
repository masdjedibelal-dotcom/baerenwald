import type { PortalRole, ResolvedVorgang } from "@/lib/crm-vorgang/types";

export type RoleTimelineStep =
  | "eingegangen"
  | "in_bearbeitung"
  | "beauftragt"
  | "erledigt"
  | "angefragt"
  | "angebot"
  | "auftrag"
  | "abschluss";

export type RolePillSemantic = "neu" | "warten" | "aktiv" | "fertig" | "storniert";

export type RoleStatusView = {
  listLabel: string;
  timelineStep: RoleTimelineStep;
  pillSemantic: RolePillSemantic;
  actionHint: string | null;
  metaLine: string | null;
};

function mieterTimeline(resolved: ResolvedVorgang): RoleTimelineStep {
  if (
    resolved.unterstatus === "storniert" ||
    resolved.unterstatus === "abgebrochen" ||
    (resolved.phase === "auftrag" && resolved.unterstatus === "abgeschlossen")
  ) {
    return "erledigt";
  }
  if (resolved.phase === "auftrag") return "beauftragt";
  if (resolved.phase === "angebot" || resolved.phase === "rechnung") {
    return "in_bearbeitung";
  }
  return "eingegangen";
}

function mieterListLabel(step: RoleTimelineStep): string {
  switch (step) {
    case "eingegangen":
      return "Eingegangen";
    case "in_bearbeitung":
      return "In Bearbeitung";
    case "beauftragt":
      return "Beauftragt";
    case "erledigt":
      return "Erledigt";
    default:
      return "Eingegangen";
  }
}

function handwerkerTimeline(resolved: ResolvedVorgang): RoleTimelineStep {
  if (
    resolved.phase === "rechnung" ||
    (resolved.phase === "auftrag" && resolved.unterstatus === "abgeschlossen")
  ) {
    return "erledigt";
  }
  if (resolved.phase === "auftrag" && resolved.unterstatus === "abnahme") {
    return "abschluss";
  }
  if (resolved.phase === "auftrag") return "auftrag";
  if (resolved.phase === "angebot") return "angebot";
  return "angefragt";
}

function handwerkerListLabel(step: RoleTimelineStep, resolved: ResolvedVorgang): string {
  if (step === "erledigt") return "Erledigt";
  if (step === "abschluss") return "Abschluss";
  if (step === "auftrag") return "Auftrag";
  if (step === "angebot") return "Angebot";
  if (resolved.needsAction && resolved.actor === "handwerker") return "Aktion nötig";
  return "Angefragt";
}

function pillSemantic(resolved: ResolvedVorgang): RolePillSemantic {
  if (resolved.unterstatus === "storniert" || resolved.unterstatus === "abgebrochen") {
    return "storniert";
  }
  if (resolved.badges.wartet_freigabe || (resolved.needsAction && resolved.actor === "freigabe")) {
    return "warten";
  }
  if (resolved.phase === "anfrage" && !resolved.badges.notfall) return "neu";
  if (
    (resolved.phase === "rechnung" && resolved.unterstatus === "bezahlt") ||
    (resolved.phase === "auftrag" && resolved.unterstatus === "abgeschlossen")
  ) {
    return "fertig";
  }
  return "aktiv";
}

function hvListLabel(resolved: ResolvedVorgang): string {
  if (resolved.unterstatus === "storniert" || resolved.unterstatus === "abgebrochen") {
    return "Storniert";
  }
  if (resolved.phase === "rechnung" && resolved.unterstatus === "bezahlt") {
    return "Abgeschlossen";
  }
  if (resolved.phase === "anfrage" && !resolved.badges.wartet_freigabe) return "Neu";
  return "In Bearbeitung";
}

function actionHint(resolved: ResolvedVorgang, role: PortalRole): string | null {
  if (!resolved.needsAction || !resolved.actor) return null;
  if (role === "mieter") return null;
  if (role === "handwerker" && resolved.actor === "handwerker") return "Aktion nötig";
  if (role === "hv" && resolved.actor === "freigabe") return "Freigabe ausstehend";
  if (role === "kunde" && resolved.actor === "kunde") return "Angebot liegt vor";
  if (role === "hv" || role === "crm") {
    if (resolved.actor === "freigabe") return "Freigabe ausstehend";
    if (resolved.actor === "handwerker") return "Handwerker";
    if (resolved.actor === "kunde") return "Kunde";
    if (resolved.actor === "bw") return "Bärenwald";
  }
  return null;
}

function metaLine(resolved: ResolvedVorgang): string | null {
  const parts: string[] = [];
  if (resolved.kanalMeta) parts.push(resolved.kanalMeta);
  if (resolved.ueberfaellig) parts.push("Überfällig");
  if (resolved.badges.notfall) parts.push("Notfall");
  return parts.length ? parts.join(" · ") : null;
}

/** Resolver → rollensichtbare Labels (Design-Layer, kein paralleles Statusmodell). */
export function resolveRoleStatus(
  resolved: ResolvedVorgang,
  role: PortalRole
): RoleStatusView {
  const semantic = pillSemantic(resolved);
  const hint = actionHint(resolved, role);
  const meta = metaLine(resolved);

  if (role === "mieter") {
    const step = mieterTimeline(resolved);
    return {
      listLabel: mieterListLabel(step),
      timelineStep: step,
      pillSemantic: semantic,
      actionHint: hint,
      metaLine: meta,
    };
  }

  if (role === "handwerker") {
    const step = handwerkerTimeline(resolved);
    return {
      listLabel: handwerkerListLabel(step, resolved),
      timelineStep: step,
      pillSemantic: semantic,
      actionHint: hint,
      metaLine: meta,
    };
  }

  if (role === "hv") {
    return {
      listLabel: hvListLabel(resolved),
      timelineStep:
        resolved.phase === "anfrage"
          ? "eingegangen"
          : resolved.phase === "auftrag"
            ? "beauftragt"
            : "in_bearbeitung",
      pillSemantic: semantic,
      actionHint: hint,
      metaLine: meta,
    };
  }

  // kunde / crm — Unterstatus sichtbar
  return {
    listLabel: resolved.unterstatusLabel,
    timelineStep:
      resolved.phase === "anfrage"
        ? "eingegangen"
        : resolved.phase === "auftrag"
          ? "beauftragt"
          : "in_bearbeitung",
    pillSemantic: semantic,
    actionHint: hint,
    metaLine: meta,
  };
}

/** Mieter-Token-Status (4 Stufen) — kompatibel zu buildMieterStatusTimeline. */
export function mieterTimelineStepFromResolver(resolved: ResolvedVorgang): string {
  return mieterTimeline(resolved);
}

export const MIETER_TIMELINE_ORDER = [
  "eingegangen",
  "in_bearbeitung",
  "beauftragt",
  "erledigt",
] as const;

export function buildMieterTimelineFromResolver(resolved: ResolvedVorgang) {
  const current = mieterTimeline(resolved);
  const labels: Record<(typeof MIETER_TIMELINE_ORDER)[number], string> = {
    eingegangen: "Eingegangen",
    in_bearbeitung: "In Bearbeitung",
    beauftragt: "Beauftragt",
    erledigt: "Erledigt",
  };
  const idx = MIETER_TIMELINE_ORDER.indexOf(
    current as (typeof MIETER_TIMELINE_ORDER)[number]
  );
  const currentIdx = idx >= 0 ? idx : 0;
  return MIETER_TIMELINE_ORDER.map((id, i) => ({
    id,
    label: labels[id],
    done: i < currentIdx,
    active: i === currentIdx,
  }));
}
