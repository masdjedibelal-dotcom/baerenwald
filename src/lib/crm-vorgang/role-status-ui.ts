import type { ResolvedVorgang } from "@/lib/crm-vorgang/types";
import {
  buildMieterTimelineFromResolver,
  resolveRoleStatus,
  type RolePillSemantic,
  type RoleTimelineStep,
} from "@/lib/crm-vorgang/role-status";

export type TimelineStepView = {
  id: string;
  label: string;
  done: boolean;
  active: boolean;
};

export function rolePillClass(semantic: RolePillSemantic): string {
  switch (semantic) {
    case "neu":
      return "role-pill role-pill-neu";
    case "warten":
      return "role-pill role-pill-warten";
    case "aktiv":
      return "role-pill role-pill-aktiv";
    case "fertig":
      return "role-pill role-pill-fertig";
    case "storniert":
      return "role-pill role-pill-storniert";
    default:
      return "role-pill role-pill-aktiv";
  }
}

export const HV_AUFTRAG_TIMELINE: Array<{ id: RoleTimelineStep; label: string }> = [
  { id: "beauftragt", label: "Beauftragt" },
  { id: "auftrag", label: "Ausführung" },
  { id: "abschluss", label: "Abnahme" },
  { id: "erledigt", label: "Erledigt" },
];

export const HANDWERKER_AUFTRAG_TIMELINE: Array<{ id: RoleTimelineStep; label: string }> = [
  { id: "auftrag", label: "Durchführung" },
  { id: "abschluss", label: "Abschluss" },
  { id: "abschluss", label: "Abnahme (HV)" },
  { id: "erledigt", label: "Erledigt" },
];

function buildTimelineFromOrder(
  order: Array<{ id: RoleTimelineStep; label: string }>,
  currentStep: RoleTimelineStep,
  overrides?: Partial<Record<number, string>>
): TimelineStepView[] {
  let currentIdx = 0;
  order.forEach((s, i) => {
    if (s.id === currentStep) currentIdx = i;
  });
  if (currentStep === "erledigt") currentIdx = order.length - 1;

  return order.map((s, i) => ({
    id: `${s.id}-${i}`,
    label: overrides?.[i] ?? s.label,
    done: i < currentIdx || currentStep === "erledigt",
    active: i === currentIdx && currentStep !== "erledigt",
  }));
}

export function buildMieterTimelineSteps(resolved: ResolvedVorgang): TimelineStepView[] {
  return buildMieterTimelineFromResolver(resolved).map((s) => ({
    id: s.id,
    label: s.label,
    done: s.done,
    active: s.active,
  }));
}

export function buildHandwerkerTimelineSteps(
  resolved: ResolvedVorgang,
  opts?: { hvAbnahmeOffen?: boolean }
): TimelineStepView[] {
  const role = resolveRoleStatus(resolved, "handwerker");
  let step = role.timelineStep;
  if (opts?.hvAbnahmeOffen && step === "abschluss") {
    return buildTimelineFromOrder(
      [
        { id: "auftrag", label: "Durchführung" },
        { id: "abschluss", label: "Abschluss" },
        { id: "abschluss", label: "Abnahme (HV)" },
        { id: "erledigt", label: "Erledigt" },
      ],
      "abschluss",
      { 2: "Abnahme (HV)" }
    );
  }
  if (step === "erledigt") step = "erledigt";
  return buildTimelineFromOrder(
    [
      { id: "auftrag", label: "Durchführung" },
      { id: "abschluss", label: "Abschluss" },
      { id: "abschluss", label: "Abnahme (HV)" },
      { id: "erledigt", label: "Erledigt" },
    ],
    step
  );
}

export function buildHvAuftragTimelineSteps(
  resolved: ResolvedVorgang,
  opts?: { abnahmeOffen?: boolean; abgenommen?: boolean }
): TimelineStepView[] {
  if (opts?.abgenommen || resolved.unterstatus === "abgeschlossen") {
    return buildTimelineFromOrder(HV_AUFTRAG_TIMELINE, "erledigt");
  }
  if (opts?.abnahmeOffen || resolved.unterstatus === "abnahme") {
    return buildTimelineFromOrder(HV_AUFTRAG_TIMELINE, "abschluss");
  }
  let step: RoleTimelineStep = "beauftragt";
  if (resolved.phase === "auftrag") step = "auftrag";
  if (resolved.phase === "rechnung") step = "erledigt";
  return buildTimelineFromOrder(HV_AUFTRAG_TIMELINE, step);
}

/** Fallback-Timeline ohne vollständigen Resolver (Listen/Detail-Helfer). */
export function buildSimpleMieterTimeline(stufe: string): TimelineStepView[] {
  const order = ["eingegangen", "in_bearbeitung", "beauftragt", "erledigt"] as const;
  const labels: Record<(typeof order)[number], string> = {
    eingegangen: "Eingegangen",
    in_bearbeitung: "In Bearbeitung",
    beauftragt: "Beauftragt",
    erledigt: "Erledigt",
  };
  const norm = stufe.toLowerCase().replace(/[\s-]+/g, "_");
  const idx = Math.max(0, order.indexOf(norm as (typeof order)[number]));
  return order.map((id, i) => ({
    id,
    label: labels[id],
    done: i < idx || norm === "erledigt",
    active: i === idx && norm !== "erledigt",
  }));
}

export { resolveRoleStatus };
