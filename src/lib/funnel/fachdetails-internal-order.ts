/**
 * Lineare Sub-Step-Reihenfolge für Fachdetails (ein Screen pro Gewerk, mehrere Fragen).
 * Genutzt für interne Zurück/Weiter-Navigation entkoppelt vom globalen stepSequence.
 */

import { isFachdetailGewerkChainComplete } from "@/lib/funnel/fachdetails-chain-complete";
import {
  BODEN_FOLLOWUPS,
  BODEN_Q1,
  BODEN_ZIEL_Q,
  DACH_FOLLOWUPS,
  getDachQ1ForSituation,
  ELEKTRO_FOLLOWUPS,
  GARTEN_FOLLOWUPS,
  GARTEN_Q1,
  getElektroQ1ForSituation,
  HEIZUNG_FOLLOWUPS,
  FASSADE_ART_Q1,
  HEIZUNG_KAPUTT_Q1,
  HEIZUNG_Q1,
  HEIZUNG_ZIEL,
  MALER_FOLLOWUPS,
  MALER_Q1,
  SANITAER_BAD_OBJEKT_LISTE,
  SANITAER_BAD_Q,
  SANITAER_FOLLOWUPS,
  SANITAER_Q1,
} from "@/lib/funnel/fachdetails-questions";
import type { FachdetailGewerkKey } from "@/lib/funnel/fachdetails-notfall";
import { isReparaturNotfallSituation } from "@/lib/funnel/reparatur-flow";
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

/** Kurzschluss ohne Sanitär-Wasser-Frage — z. B. nur Fliesen oder Komplett ohne Leck-Follow-up. */
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
    s.badWas !== "objekte" &&
    s.badWas !== "sanitaer"
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

  const needBadExtra = b.includes("bad");

  if (needBadExtra) {
    ids.push(SANITAER_BAD_Q.id);
  }

  if (needBadExtra && !s.badWas) {
    return ids;
  }

  if (
    needBadExtra &&
    (s.badWas === "objekte" || s.badWas === "sanitaer")
  ) {
    ids.push(SANITAER_BAD_OBJEKT_LISTE.id);
  }

  if (
    needBadExtra &&
    (s.badWas === "objekte" || s.badWas === "sanitaer") &&
    s.objektListe === undefined
  ) {
    return ids;
  }

  if (sanitaerShortDone(b, situation, s)) {
    return ids;
  }

  if (situation === "kaputt" && !b.includes("bad")) {
    ids.push("sanitaer_problem");
    if (!s.lage) {
      return ids;
    }
    if (s.lage === "leitung_leck") {
      ids.push(SANITAER_FOLLOWUPS.sanitaer_folge_leck_zugang.id);
    }
    return ids;
  }

  ids.push(SANITAER_Q1.id);

  if (s.lage === "leitung_leck") {
    ids.push(SANITAER_FOLLOWUPS.sanitaer_folge_leck_zugang.id);
  }

  return ids;
}

function collectElektroSubStepIds(state: FunnelState): string[] {
  const fd = state.fachdetails;
  const situation = state.situation;
  const ids: string[] = [];

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

  if (situation === "kaputt" && b.includes("heizung")) {
    ids.push(HEIZUNG_KAPUTT_Q1.id);
    return ids;
  }

  ids.push(HEIZUNG_Q1.id);
  const t = fd.heizung?.typ;
  if (!t) return ids;
  if (situation === "erneuern" && b.includes("heizung")) {
    ids.push(HEIZUNG_ZIEL.id);
    if (!fd.heizung?.ziel) return ids;
  }
  if (t === "heizkoerper") {
    ids.push("heizung_heizkoerper_anzahl");
    return ids;
  }
  if (t === "oel") {
    ids.push(HEIZUNG_FOLLOWUPS.heizung_folge_oel_alter.id);
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
  ids.push(BODEN_ZIEL_Q.id);
  const noFollowUpMaterial =
    a === "parkett_schleifen" ||
    a === "balkon_belag" ||
    a === "teppich" ||
    a === "estrich";
  if (noFollowUpMaterial) return ids;
  const opt = BODEN_Q1.options.find((o) => o.value === a);
  const fid = opt?.followUpId;
  if (fid && BODEN_FOLLOWUPS[fid]) {
    ids.push(BODEN_FOLLOWUPS[fid]!.id);
  }
  return ids;
}

function collectDachSubStepIds(state: FunnelState): string[] {
  const fd = state.fachdetails;
  const q1 = getDachQ1ForSituation(state.situation);
  if (isReparaturNotfallSituation(state.situation)) {
    return [q1.id];
  }
  const ids = [q1.id];
  const v = fd.dach?.vorhaben;
  if (!v) return ids;
  const opt = q1.options.find((o) => o.value === v);
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
  if (
    state.situation === "betreuung" &&
    (w === "baum" || w === "pflege")
  ) {
    return ids;
  }
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

function needFassadeFromBereich(bereiche: string[]): boolean {
  return bereiche.includes("fassade");
}

function collectFassadeSubStepIds(): string[] {
  return [FASSADE_ART_Q1.id];
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
    case "fassade":
      return needFassadeFromBereich(b) ? collectFassadeSubStepIds() : [];
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
  switch (stepId) {
    case "sanitaer_bad_was":
      return Boolean(fd.sanitaer?.badWas);
    case "sanitaer_bad_objekt_liste":
      return fd.sanitaer?.objektListe !== undefined;
    case "sanitaer_problem":
    case SANITAER_Q1.id: {
      const l = fd.sanitaer?.lage;
      return Boolean(l) && l !== "leitung_leck";
    }
    case SANITAER_FOLLOWUPS.sanitaer_folge_leck_zugang.id:
      return (
        fd.sanitaer?.lage === "sichtbar" || fd.sanitaer?.lage === "wand"
      );
    default:
      break;
  }

  if (gewerk === "elektro") {
    const q1 = getElektroQ1ForSituation(situation);
    if (stepId === q1.id) return Boolean(fd.elektro?.problem);
    const fu = ELEKTRO_FOLLOWUPS[stepId];
    if (fu) return fd.elektro?.folge !== undefined;
  }

  if (gewerk === "heizung") {
    if (stepId === HEIZUNG_KAPUTT_Q1.id) return Boolean(fd.heizung?.typ);
    if (stepId === HEIZUNG_Q1.id) return Boolean(fd.heizung?.typ);
    if (stepId === HEIZUNG_ZIEL.id) return Boolean(fd.heizung?.ziel);
    if (stepId === "heizung_heizkoerper_anzahl") {
      return (
        fd.heizung?.anzahl !== undefined &&
        fd.heizung.anzahl >= 1
      );
    }
    if (stepId === HEIZUNG_FOLLOWUPS.heizung_folge_oel_alter.id) {
      return fd.heizung?.alter !== undefined;
    }
  }

  if (gewerk === "fassade") {
    if (stepId === FASSADE_ART_Q1.id) {
      const a =
        fd.fassade?.art ??
        fd.fachdetailAnswers?.["fassade_art"];
      return typeof a === "string" && a !== "";
    }
  }

  if (gewerk === "maler") {
    if (stepId === MALER_Q1.id) return Boolean(fd.maler?.was);
    if (stepId === "maler_folge_zustand") {
      return fd.maler?.zustand !== undefined;
    }
  }

  if (gewerk === "boden") {
    if (stepId === BODEN_Q1.id) return Boolean(fd.boden?.aktuell);
    if (stepId === BODEN_ZIEL_Q.id) return Boolean(fd.boden?.ziel);
    if (BODEN_FOLLOWUPS[stepId]) {
      return fd.boden?.verlegung !== undefined;
    }
  }

  if (gewerk === "dach") {
    const q1 = getDachQ1ForSituation(situation);
    if (stepId === q1.id) return Boolean(fd.dach?.vorhaben);
    if (DACH_FOLLOWUPS[stepId]) {
      return fd.dach?.alter !== undefined;
    }
  }

  if (gewerk === "garten") {
    if (stepId === GARTEN_Q1.id) return Boolean(fd.garten?.was);
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
      if (stepId === "sanitaer_bad_was") {
        return {
          sanitaer: {
            ...fd.sanitaer,
            badWas: undefined,
            objektListe: undefined,
            lage: undefined,
            rohre: undefined,
          },
        };
      }
      if (stepId === "sanitaer_bad_objekt_liste") {
        return {
          sanitaer: {
            ...fd.sanitaer,
            objektListe: undefined,
            lage: fd.sanitaer?.lage,
            rohre: fd.sanitaer?.rohre,
            badWas: fd.sanitaer?.badWas,
          },
        };
      }
      if (stepId === SANITAER_Q1.id || stepId === "sanitaer_problem") {
        return {
          sanitaer: {
            ...fd.sanitaer,
            lage: undefined,
            rohre: undefined,
            badWas: fd.sanitaer?.badWas,
            objektListe: fd.sanitaer?.objektListe,
          },
        };
      }
      if (stepId === SANITAER_FOLLOWUPS.sanitaer_folge_leck_zugang.id) {
        return {
          sanitaer: {
            ...fd.sanitaer,
            lage: "leitung_leck",
            rohre: undefined,
            badWas: fd.sanitaer?.badWas,
            objektListe: fd.sanitaer?.objektListe,
          },
        };
      }
      return {};
    }
    case "heizung": {
      if (stepId === HEIZUNG_Q1.id || stepId === HEIZUNG_KAPUTT_Q1.id) {
        return {
          heizung: {
            typ: undefined,
            alter: undefined,
            vorhaben: undefined,
            anzahl: undefined,
            ziel: undefined,
          },
        };
      }
      if (stepId === HEIZUNG_ZIEL.id) {
        return {
          heizung: {
            ...fd.heizung,
            typ: fd.heizung?.typ,
            alter: fd.heizung?.alter,
            vorhaben: fd.heizung?.vorhaben,
            anzahl: fd.heizung?.anzahl,
            ziel: undefined,
          },
        };
      }
      if (stepId === "heizung_heizkoerper_anzahl") {
        return {
          heizung: {
            ...fd.heizung,
            typ: fd.heizung?.typ,
            alter: fd.heizung?.alter,
            vorhaben: fd.heizung?.vorhaben,
            ziel: fd.heizung?.ziel,
            anzahl: undefined,
          },
        };
      }
      if (stepId === HEIZUNG_FOLLOWUPS.heizung_folge_oel_alter.id) {
        return {
          heizung: {
            ...fd.heizung,
            typ: fd.heizung?.typ,
            alter: undefined,
            vorhaben: undefined,
            ziel: fd.heizung?.ziel,
          },
        };
      }
      return {};
    }
    case "fassade": {
      if (stepId === FASSADE_ART_Q1.id) {
        return {
          fassade: { art: undefined },
        };
      }
      return {};
    }
    case "maler": {
      if (stepId === MALER_Q1.id) {
        return {
          maler: { was: undefined, zustand: undefined, fassade: undefined },
          fassade: { ...fd.fassade, art: undefined },
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
        return {
          boden: {
            aktuell: undefined,
            ziel: undefined,
            zustand: undefined,
            verlegung: undefined,
            freitext: fd.boden?.freitext,
          },
        };
      }
      if (stepId === BODEN_ZIEL_Q.id) {
        return {
          boden: {
            aktuell: fd.boden?.aktuell,
            ziel: undefined,
            zustand: fd.boden?.zustand,
            verlegung: undefined,
            freitext: fd.boden?.freitext,
          },
        };
      }
      return {
        boden: {
          aktuell: fd.boden?.aktuell,
          ziel: fd.boden?.ziel,
          zustand: fd.boden?.zustand,
          verlegung: undefined,
          freitext: fd.boden?.freitext,
        },
      };
    }
    case "dach": {
      const q1 = getDachQ1ForSituation(situation);
      if (stepId === q1.id) {
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
      state.fachdetails,
      gewerk,
      state.situation
    );
  }
  return false;
}
