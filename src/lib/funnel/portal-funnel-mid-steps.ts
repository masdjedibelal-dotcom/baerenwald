/**
 * Portal-Funnel: mittlere Schritte 1:1 aus Website
 * {@link getResolvedStepsForSituation} (Projekt-Extras, Bad, Zustand, …).
 */

import { getResolvedStepsForSituation } from "@/lib/funnel/config";
import { getActiveFachdetailQuestionIds } from "@/lib/funnel/fachdetail-questions-flat";
import { getBwResultModus } from "@/lib/funnel/price-calc";
import type {
  FachdetailsState,
  FunnelState,
  FunnelStep,
  Situation,
} from "@/lib/funnel/types";

/** Steps zwischen Bereiche/Dringlichkeit und Medien/Result. */
export type PortalFunnelMidStepId =
  | "dringlichkeit"
  | "fachdetail"
  | "groesse"
  | "zugaenglichkeit"
  | "zustand"
  | "bad_ausstattung"
  | "projekt_terrasse_material"
  | "projekt_terrasse_unterbau"
  | "projekt_durchbruch_anzahl"
  | "projekt_durchbruch_statik"
  | "projekt_garten_leistung"
  | "projekt_garten_terrasse_material"
  | "projekt_garten_zaun"
  | "projekt_garten_zugang"
  | "projekt_ausbau_rohbau"
  | "projekt_ausbau_deckenhoehe";

const ONE_TO_ONE = new Set<string>([
  "zugaenglichkeit",
  "zustand",
  "bad_ausstattung",
  "projekt_terrasse_material",
  "projekt_terrasse_unterbau",
  "projekt_durchbruch_anzahl",
  "projekt_durchbruch_statik",
  "projekt_garten_leistung",
  "projekt_garten_terrasse_material",
  "projekt_garten_zaun",
  "projekt_garten_zugang",
  "projekt_ausbau_rohbau",
  "projekt_ausbau_deckenhoehe",
]);

export function isPortalFunnelMidStepId(
  id: string
): id is PortalFunnelMidStepId {
  return (
    id === "dringlichkeit" ||
    id === "fachdetail" ||
    id === "groesse" ||
    ONE_TO_ONE.has(id)
  );
}

export function getPortalResolvedFunnelSteps(
  state: Pick<
    FunnelState,
    "situation" | "bereiche" | "fachdetails" | "umfang"
  >
): FunnelStep[] {
  if (!state.situation || state.bereiche.length === 0) return [];
  return getResolvedStepsForSituation(
    state.situation,
    state.bereiche,
    state.fachdetails,
    state.umfang,
    getBwResultModus(state as FunnelState) === "zu_komplex"
  );
}

/**
 * Website-Schritte → Portal-StepIds (ohne Bereiche; Dringlichkeit optional schon gesetzt).
 */
export function mapResolvedStepsToPortalMid(
  resolved: FunnelStep[],
  state: Pick<FunnelState, "situation" | "bereiche" | "fachdetails">,
  opts?: { skipDringlichkeit?: boolean }
): PortalFunnelMidStepId[] {
  const out: PortalFunnelMidStepId[] = [];
  for (const step of resolved) {
    const id = step.id;
    if (id.includes("bereiche")) continue;
    if (id === "kaputt_dringlichkeit") {
      if (!opts?.skipDringlichkeit) out.push("dringlichkeit");
      continue;
    }
    if (id === "fachdetails") {
      if (getActiveFachdetailQuestionIds(state).length > 0) {
        out.push("fachdetail");
      }
      continue;
    }
    if (id.toLowerCase().includes("groesse")) {
      out.push("groesse");
      continue;
    }
    if (ONE_TO_ONE.has(id)) {
      out.push(id as PortalFunnelMidStepId);
    }
  }
  return out;
}

export function findResolvedStepDef(
  resolved: FunnelStep[],
  stepId: string
): FunnelStep | undefined {
  return resolved.find((s) => s.id === stepId);
}

export function findResolvedGroesseStep(
  resolved: FunnelStep[]
): FunnelStep | undefined {
  return resolved.find((s) => s.id.toLowerCase().includes("groesse"));
}

export type ProjektPatch = NonNullable<FachdetailsState["projekt"]>;

export function portalProjektStepAnswered(
  stepId: PortalFunnelMidStepId,
  projekt: FachdetailsState["projekt"] | undefined
): boolean {
  const p = projekt;
  switch (stepId) {
    case "projekt_ausbau_rohbau":
      return p?.ausbauRohbau != null;
    case "projekt_ausbau_deckenhoehe":
      return p?.ausbauDeckenhoehe != null;
    case "projekt_garten_leistung":
      return p?.gartenLeistung != null;
    case "projekt_garten_terrasse_material":
      return p?.gartenTerrasseMaterial != null;
    case "projekt_garten_zaun":
      return p?.gartenZaun != null;
    case "projekt_garten_zugang":
      return p?.gartenZugaenglichkeit != null;
    case "projekt_durchbruch_anzahl":
      return p?.durchbruchAnzahl != null;
    case "projekt_durchbruch_statik":
      return p?.durchbruchTragend !== undefined;
    case "projekt_terrasse_material":
      return p?.terrasseMaterial != null;
    case "projekt_terrasse_unterbau":
      return p?.terrasseUnterbau != null;
    default:
      return true;
  }
}

export function portalMidStepLabel(stepId: PortalFunnelMidStepId): string {
  if (stepId.startsWith("projekt_")) return "Ausbau & Umbau";
  if (stepId === "bad_ausstattung") return "Bad";
  if (stepId === "zustand") return "Zustand";
  if (stepId === "zugaenglichkeit") return "Zugang";
  return "Details";
}

/** Situation für Mid-Steps (nicht Melde-Kaputt-Sonderflow). */
export function shouldUseWebsiteMidSteps(
  situation: Situation | null,
  meldeKaputtFlow: boolean
): boolean {
  return Boolean(situation) && !meldeKaputtFlow;
}
