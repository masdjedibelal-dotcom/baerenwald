/**
 * Lineare Sub-Step-Reihenfolge für Fachdetails (ein Screen pro Gewerk, mehrere Fragen).
 * Genutzt für interne Zurück/Weiter-Navigation entkoppelt vom globalen stepSequence.
 */

import { isFachdetailGewerkChainComplete } from "@/lib/funnel/fachdetails-chain-complete";
import {
  BODEN_FOLLOWUPS,
  BODEN_Q1,
  DACH_FOLLOWUPS,
  DACH_Q1,
  ELEKTRO_FOLLOWUPS,
  GARTEN_FOLLOWUPS,
  GARTEN_Q1,
  getElektroQ1ForSituation,
  HEIZUNG_FOLLOWUPS,
  HEIZUNG_KAPUTT_Q1,
  HEIZUNG_Q1,
  MALER_FOLLOWUPS,
  MALER_Q1,
  SANITAER_BAD_OBJEKTE_MULTI,
  SANITAER_BAD_Q,
  SANITAER_FOLLOWUPS,
  SANITAER_Q1,
} from "@/lib/funnel/fachdetails-questions";
import {
  FACHDETAILS_NOTFALL,
  type FachdetailGewerkKey,
} from "@/lib/funnel/fachdetails-notfall";
import type { FachdetailsState, FunnelState, Situation } from "@/lib/funnel/types";

function needElektro(bereiche: string[]): boolean {
  const s = new Set(bereiche);
  return s.has("strom") || s.has("elektrik") || s.has("elektro");
}

function needSan(bereiche: string[]): boolean {
  const s = new Set(bereiche);
  return (
    s.has("bad") ||
    s.has("wasser") ||
    s.has("sanitaer") ||
    s.has("feuchtigkeit_schimmel")
  );
}

function needMaler(bereiche: string[]): boolean {
  const s = new Set(bereiche);
  return (
    s.has("maler") ||
    s.has("streichen") ||
    s.has("waende") ||
    s.has("waende_boeden") ||
    s.has("feuchtigkeit_schimmel")
  );
}

function needBoden(bereiche: string[]): boolean {
  const s = new Set(bereiche);
  return s.has("boden") || s.has("waende_boeden");
}

function needGarten(bereiche: string[]): boolean {
  const s = new Set(bereiche);
  return (
    s.has("garten") ||
    s.has("gestaltung") ||
    s.has("baum") ||
    s.has("baumarbeiten")
  );
}

function needFenster(bereiche: string[]): boolean {
  const s = new Set(bereiche);
  return (
    s.has("fenster") ||
    s.has("fenster_tueren") ||
    s.has("fenster_tuer")
  );
}

export function sanitaerShortDone(
  bereiche: string[],
  situation: Situation | null,
  s: NonNullable<FachdetailsState["sanitaer"]>
): boolean {
  const needBadExtra = bereiche.includes("bad");
  if (
    needBadExtra &&
    situation === "erneuern" &&
    s.badWas === "wanne_dusche"
  ) {
    return true;
  }
  if (
    needBadExtra &&
    situation === "erneuern" &&
    s.badWas &&
    s.badWas !== "wanne_dusche" &&
    s.badWas !== "objekte"
  ) {
    return true;
  }
  return false;
}

function collectSanitaerSubStepIds(state: FunnelState): string[] {
  const b = state.bereiche;
  const situation = state.situation;
  const fd = state.fachdetails;
  const s = fd.sanitaer ?? {};
  const ids: string[] = [];

  if (situation === "notfall") {
    ids.push(FACHDETAILS_NOTFALL.sanitaer.id);
    return ids;
  }

  const needBadExtra = b.includes("bad");

  if (needBadExtra) {
    ids.push(SANITAER_BAD_Q.id);
  }

  if (needBadExtra && !s.badWas) {
    return ids;
  }

  if (needBadExtra && s.badWas === "objekte") {
    ids.push(SANITAER_BAD_OBJEKTE_MULTI.id);
  }

  if (
    needBadExtra &&
    s.badWas === "objekte" &&
    (s.badObjekte?.length ?? 0) === 0
  ) {
    return ids;
  }

  if (sanitaerShortDone(b, situation, s)) {
    return ids;
  }

  ids.push(SANITAER_Q1.id);

  if (s.lage === "wand") {
    ids.push(SANITAER_FOLLOWUPS.sanitaer_folge_rohre.id);
  }

  return ids;
}

function collectElektroSubStepIds(state: FunnelState): string[] {
  const fd = state.fachdetails;
  const situation = state.situation;
  const ids: string[] = [];

  if (situation === "notfall") {
    ids.push(FACHDETAILS_NOTFALL.elektro.id);
    return ids;
  }

  const q1 = getElektroQ1ForSituation(situation);
  ids.push(q1.id);
  const p = fd.elektro?.problem;
  if (!p) return ids;
  const opt = q1.options.find((o) => o.value === p);
  const fid = opt?.followUpId;
  if (fid && ELEKTRO_FOLLOWUPS[fid]) {
    ids.push(ELEKTRO_FOLLOWUPS[fid]!.id);
  }
  return ids;
}

function collectHeizungSubStepIds(state: FunnelState): string[] {
  const fd = state.fachdetails;
  const b = state.bereiche;
  const situation = state.situation;
  const ids: string[] = [];

  if (situation === "notfall") {
    ids.push(FACHDETAILS_NOTFALL.heizung.id);
    return ids;
  }

  if (situation === "kaputt" && b.includes("heizung")) {
    ids.push(HEIZUNG_KAPUTT_Q1.id);
    return ids;
  }

  ids.push(HEIZUNG_Q1.id);
  const t = fd.heizung?.typ;
  if (!t) return ids;
  if (t === "oel") {
    ids.push(HEIZUNG_FOLLOWUPS.heizung_folge_oel_alter.id);
  } else if (t === "waermepumpe") {
    ids.push(HEIZUNG_FOLLOWUPS.heizung_folge_wp_vorhaben.id);
  }
  return ids;
}

function collectMalerSubStepIds(state: FunnelState): string[] {
  const fd = state.fachdetails;
  const ids = [MALER_Q1.id];
  const w = fd.maler?.was;
  if (!w) return ids;
  const opt = MALER_Q1.options.find((o) => o.value === w);
  const fid = opt?.followUpId;
  if (fid && MALER_FOLLOWUPS[fid]) {
    ids.push(MALER_FOLLOWUPS[fid]!.id);
  }
  return ids;
}

function collectBodenSubStepIds(state: FunnelState): string[] {
  const fd = state.fachdetails;
  const ids = [BODEN_Q1.id];
  const a = fd.boden?.aktuell;
  if (!a) return ids;
  const opt = BODEN_Q1.options.find((o) => o.value === a);
  const fid = opt?.followUpId;
  if (fid && BODEN_FOLLOWUPS[fid]) {
    ids.push(BODEN_FOLLOWUPS[fid]!.id);
  }
  return ids;
}

function collectDachSubStepIds(state: FunnelState): string[] {
  const fd = state.fachdetails;
  const ids = [DACH_Q1.id];
  const v = fd.dach?.vorhaben;
  if (!v) return ids;
  const opt = DACH_Q1.options.find((o) => o.value === v);
  const fid = opt?.followUpId;
  if (fid && DACH_FOLLOWUPS[fid]) {
    ids.push(DACH_FOLLOWUPS[fid]!.id);
  }
  return ids;
}

function collectGartenSubStepIds(state: FunnelState): string[] {
  const fd = state.fachdetails;
  const ids = [GARTEN_Q1.id];
  const w = fd.garten?.was;
  if (!w) return ids;
  const opt = GARTEN_Q1.options.find((o) => o.value === w);
  const fid = opt?.followUpId;
  if (fid && GARTEN_FOLLOWUPS[fid]) {
    ids.push(GARTEN_FOLLOWUPS[fid]!.id);
  }
  return ids;
}

function collectFensterSubStepIds(state: FunnelState): string[] {
  const b = state.bereiche;
  const situation = state.situation;
  const fensterDefektKaputt =
    situation === "kaputt" &&
    b.includes("fenster_tuer") &&
    !b.includes("fenster");
  return [fensterDefektKaputt ? "fenster_defekt_was" : "fenster_ausstattung"];
}

/** Geordnete Sub-Step-IDs für das Gewerk (vollständiger Pfad der aktuellen Verzweigung). */
export function getFachdetailSubStepIds(
  state: FunnelState,
  gewerk: FachdetailGewerkKey
): string[] {
  const b = state.bereiche;
  switch (gewerk) {
    case "elektro":
      return needElektro(b) ? collectElektroSubStepIds(state) : [];
    case "sanitaer":
      return needSan(b) ? collectSanitaerSubStepIds(state) : [];
    case "heizung":
      return b.includes("heizung") ? collectHeizungSubStepIds(state) : [];
    case "maler":
      return needMaler(b) ? collectMalerSubStepIds(state) : [];
    case "boden":
      return needBoden(b) ? collectBodenSubStepIds(state) : [];
    case "dach":
      return b.includes("dach") ? collectDachSubStepIds(state) : [];
    case "garten":
      return needGarten(b) ? collectGartenSubStepIds(state) : [];
    case "fenster":
      return needFenster(b) ? collectFensterSubStepIds(state) : [];
    default:
      return [];
  }
}

export function isFachdetailSubStepComplete(
  state: FunnelState,
  gewerk: FachdetailGewerkKey,
  stepId: string
): boolean {
  const fd = state.fachdetails;
  const situation = state.situation;
  const b = state.bereiche;
  const isNotfall = situation === "notfall";

  switch (stepId) {
    case FACHDETAILS_NOTFALL.elektro.id:
      return Boolean(fd.elektro?.problem);
    case FACHDETAILS_NOTFALL.sanitaer.id:
      return Boolean(fd.sanitaer?.notfallSchwere);
    case FACHDETAILS_NOTFALL.heizung.id:
      return Boolean(fd.heizung?.typ);
    case "sanitaer_bad_was":
      return Boolean(fd.sanitaer?.badWas);
    case "sanitaer_bad_objekte_multi":
      return (fd.sanitaer?.badObjekte?.length ?? 0) > 0;
    case SANITAER_Q1.id:
      return Boolean(fd.sanitaer?.lage);
    case SANITAER_FOLLOWUPS.sanitaer_folge_rohre.id:
      return fd.sanitaer?.rohre !== undefined;
    default:
      break;
  }

  if (gewerk === "elektro" && !isNotfall) {
    const q1 = getElektroQ1ForSituation(situation);
    if (stepId === q1.id) return Boolean(fd.elektro?.problem);
    const fu = ELEKTRO_FOLLOWUPS[stepId];
    if (fu) return fd.elektro?.folge !== undefined;
  }

  if (gewerk === "heizung" && !isNotfall) {
    if (stepId === HEIZUNG_KAPUTT_Q1.id) return Boolean(fd.heizung?.typ);
    if (stepId === HEIZUNG_Q1.id) return Boolean(fd.heizung?.typ);
    if (stepId === HEIZUNG_FOLLOWUPS.heizung_folge_oel_alter.id) {
      return fd.heizung?.alter !== undefined;
    }
    if (stepId === HEIZUNG_FOLLOWUPS.heizung_folge_wp_vorhaben.id) {
      return fd.heizung?.vorhaben !== undefined;
    }
  }

  if (gewerk === "maler") {
    if (stepId === MALER_Q1.id) return Boolean(fd.maler?.was);
    if (stepId === "maler_folge_fassade") {
      return fd.maler?.fassade !== undefined;
    }
    if (stepId === "maler_folge_zustand") {
      return fd.maler?.zustand !== undefined;
    }
  }

  if (gewerk === "boden") {
    if (stepId === BODEN_Q1.id) return Boolean(fd.boden?.aktuell);
    if (BODEN_FOLLOWUPS[stepId]) {
      return fd.boden?.verlegung !== undefined;
    }
  }

  if (gewerk === "dach") {
    if (stepId === DACH_Q1.id) return Boolean(fd.dach?.vorhaben);
    if (DACH_FOLLOWUPS[stepId]) {
      return fd.dach?.alter !== undefined;
    }
  }

  if (gewerk === "garten") {
    if (stepId === GARTEN_Q1.id) return Boolean(fd.garten?.was);
    if (stepId === "garten_folge_gestaltung") {
      return (fd.garten?.gestaltung?.length ?? 0) > 0;
    }
    if (stepId === "garten_folge_haeufigkeit") {
      return fd.garten?.haeufigkeit !== undefined;
    }
    if (stepId === "garten_folge_baum") {
      return fd.garten?.baumgroesse !== undefined;
    }
  }

  if (gewerk === "fenster") {
    const fensterDefektKaputt =
      situation === "kaputt" &&
      b.includes("fenster_tuer") &&
      !b.includes("fenster");
    if (stepId === "fenster_defekt_was") {
      return fensterDefektKaputt ? Boolean(fd.fenster?.defekt) : true;
    }
    if (stepId === "fenster_ausstattung") {
      return !fensterDefektKaputt ? Boolean(fd.fenster?.ausstattung) : true;
    }
  }

  return false;
}

/** Patch: Antworten ab diesem Sub-Step (inkl.) für das Gewerk zurücksetzen. */
export function getClearFachdetailPatchFromSubStep(
  gewerk: FachdetailGewerkKey,
  stepId: string,
  state: Pick<FunnelState, "situation" | "fachdetails">
): Partial<FachdetailsState> {
  const { situation, fachdetails: fd } = state;
  switch (gewerk) {
    case "elektro": {
      if (stepId === FACHDETAILS_NOTFALL.elektro.id) {
        return { elektro: undefined };
      }
      const q1 = getElektroQ1ForSituation(situation);
      if (stepId === q1.id) {
        return { elektro: { problem: undefined, folge: undefined } };
      }
      return {
        elektro: {
          ...fd.elektro,
          problem: fd.elektro?.problem,
          folge: undefined,
        },
      };
    }
    case "sanitaer": {
      if (stepId === FACHDETAILS_NOTFALL.sanitaer.id) {
        return { sanitaer: undefined };
      }
      if (stepId === "sanitaer_bad_was") {
        return {
          sanitaer: {
            ...fd.sanitaer,
            badWas: undefined,
            badObjekte: undefined,
            lage: undefined,
            rohre: undefined,
          },
        };
      }
      if (stepId === "sanitaer_bad_objekte_multi") {
        return {
          sanitaer: {
            ...fd.sanitaer,
            badObjekte: undefined,
            lage: fd.sanitaer?.lage,
            rohre: fd.sanitaer?.rohre,
            badWas: fd.sanitaer?.badWas,
          },
        };
      }
      if (stepId === SANITAER_Q1.id) {
        return {
          sanitaer: {
            ...fd.sanitaer,
            lage: undefined,
            rohre: undefined,
          },
        };
      }
      if (stepId === SANITAER_FOLLOWUPS.sanitaer_folge_rohre.id) {
        return {
          sanitaer: {
            ...fd.sanitaer,
            lage: fd.sanitaer?.lage,
            rohre: undefined,
            badWas: fd.sanitaer?.badWas,
            badObjekte: fd.sanitaer?.badObjekte,
          },
        };
      }
      return {};
    }
    case "heizung": {
      if (stepId === FACHDETAILS_NOTFALL.heizung.id) {
        return { heizung: undefined };
      }
      if (stepId === HEIZUNG_Q1.id || stepId === HEIZUNG_KAPUTT_Q1.id) {
        return {
          heizung: { typ: undefined, alter: undefined, vorhaben: undefined },
        };
      }
      if (stepId === HEIZUNG_FOLLOWUPS.heizung_folge_oel_alter.id) {
        return {
          heizung: {
            ...fd.heizung,
            typ: fd.heizung?.typ,
            alter: undefined,
            vorhaben: undefined,
          },
        };
      }
      if (stepId === HEIZUNG_FOLLOWUPS.heizung_folge_wp_vorhaben.id) {
        return {
          heizung: {
            ...fd.heizung,
            typ: fd.heizung?.typ,
            alter: fd.heizung?.alter,
            vorhaben: undefined,
          },
        };
      }
      return {};
    }
    case "maler": {
      if (stepId === MALER_Q1.id) {
        return {
          maler: { was: undefined, zustand: undefined, fassade: undefined },
        };
      }
      if (stepId === "maler_folge_fassade") {
        return {
          maler: {
            ...fd.maler,
            was: fd.maler?.was,
            fassade: undefined,
          },
        };
      }
      if (stepId === "maler_folge_zustand") {
        return {
          maler: {
            ...fd.maler,
            was: fd.maler?.was,
            zustand: undefined,
          },
        };
      }
      return {};
    }
    case "boden": {
      if (stepId === BODEN_Q1.id) {
        return { boden: { aktuell: undefined, verlegung: undefined } };
      }
      return {
        boden: {
          aktuell: fd.boden?.aktuell,
          verlegung: undefined,
        },
      };
    }
    case "dach": {
      if (stepId === DACH_Q1.id) {
        return { dach: { vorhaben: undefined, alter: undefined } };
      }
      return {
        dach: {
          vorhaben: fd.dach?.vorhaben,
          alter: undefined,
        },
      };
    }
    case "garten": {
      if (stepId === GARTEN_Q1.id) {
        return {
          garten: {
            was: undefined,
            haeufigkeit: undefined,
            baumgroesse: undefined,
            gestaltung: undefined,
          },
        };
      }
      if (stepId === "garten_folge_gestaltung") {
        return {
          garten: {
            ...fd.garten,
            was: fd.garten?.was,
            gestaltung: undefined,
          },
        };
      }
      if (stepId === "garten_folge_haeufigkeit") {
        return {
          garten: {
            ...fd.garten,
            was: fd.garten?.was,
            haeufigkeit: undefined,
          },
        };
      }
      if (stepId === "garten_folge_baum") {
        return {
          garten: {
            ...fd.garten,
            was: fd.garten?.was,
            baumgroesse: undefined,
          },
        };
      }
      return {};
    }
    case "fenster": {
      return { fenster: { defekt: undefined, ausstattung: undefined } };
    }
    default:
      return {};
  }
}

export function isFachdetailInternalNextDisabled(
  state: FunnelState,
  gewerk: FachdetailGewerkKey,
  stepIds: string[],
  currentIndex: number
): boolean {
  if (stepIds.length === 0) return true;
  const id = stepIds[currentIndex];
  if (!id) return true;
  if (!isFachdetailSubStepComplete(state, gewerk, id)) return true;
  const last = currentIndex >= stepIds.length - 1;
  if (last) {
    return !isFachdetailGewerkChainComplete(
      state.bereiche,
      state.situation === "notfall",
      state.fachdetails,
      gewerk,
      state.situation
    );
  }
  return false;
}
