import {
  BODEN_FOLLOWUPS,
  BODEN_Q1,
  DACH_FOLLOWUPS,
  DACH_Q1,
  ELEKTRO_FOLLOWUPS,
  ELEKTRO_Q1,
  GARTEN_FOLLOWUPS,
  GARTEN_Q1,
  HEIZUNG_FOLLOWUPS,
  MALER_FOLLOWUPS,
  MALER_Q1,
} from "@/lib/funnel/fachdetails-questions";
import type { FachdetailGewerkKey } from "@/lib/funnel/fachdetails-notfall";
import type { FachdetailsState } from "@/lib/funnel/types";

/** Ob für ein Gewerk alle in der UI gestaffelten Fragen beantwortet sind (inkl. Folgefragen). */
export function isFachdetailGewerkChainComplete(
  bereiche: string[],
  situationNotfall: boolean,
  fd: FachdetailsState,
  g: FachdetailGewerkKey
): boolean {
  const needBadExtra = bereiche.includes("bad");

  if (situationNotfall && g === "elektro") return Boolean(fd.elektro?.problem);
  if (situationNotfall && g === "sanitaer")
    return Boolean(fd.sanitaer?.notfallSchwere);
  if (situationNotfall && g === "heizung") return Boolean(fd.heizung?.typ);

  const elektroFollowQ = (() => {
    if (situationNotfall) return null;
    const p = fd.elektro?.problem;
    if (!p) return null;
    const opt = ELEKTRO_Q1.options.find((o) => o.value === p);
    const id = opt?.followUpId;
    if (!id) return null;
    return ELEKTRO_FOLLOWUPS[id] ?? null;
  })();

  const heizFollowQ = (() => {
    if (situationNotfall) return null;
    const t = fd.heizung?.typ;
    if (t === "oel") return HEIZUNG_FOLLOWUPS.heizung_folge_oel_alter;
    if (t === "waermepumpe") return HEIZUNG_FOLLOWUPS.heizung_folge_wp_vorhaben;
    return null;
  })();

  const malerFollowQ = (() => {
    const w = fd.maler?.was;
    if (!w) return null;
    const opt = MALER_Q1.options.find((o) => o.value === w);
    const id = opt?.followUpId;
    if (!id) return null;
    return MALER_FOLLOWUPS[id] ?? null;
  })();

  const bodenFollowQ = (() => {
    const a = fd.boden?.aktuell;
    if (!a) return null;
    const opt = BODEN_Q1.options.find((o) => o.value === a);
    const id = opt?.followUpId;
    if (!id) return null;
    return BODEN_FOLLOWUPS[id] ?? null;
  })();

  const dachFollowQ = (() => {
    const v = fd.dach?.vorhaben;
    if (!v) return null;
    const opt = DACH_Q1.options.find((o) => o.value === v);
    const id = opt?.followUpId;
    if (!id) return null;
    return DACH_FOLLOWUPS[id] ?? null;
  })();

  const gartenFollowQ = (() => {
    const w = fd.garten?.was;
    if (!w) return null;
    const opt = GARTEN_Q1.options.find((o) => o.value === w);
    const id = opt?.followUpId;
    if (!id) return null;
    return GARTEN_FOLLOWUPS[id] ?? null;
  })();

  switch (g) {
    case "elektro": {
      if (!fd.elektro?.problem) return false;
      if (!elektroFollowQ) return true;
      return fd.elektro?.folge !== undefined;
    }
    case "sanitaer": {
      if (!fd.sanitaer?.lage) return false;
      if (fd.sanitaer.lage === "wand" && fd.sanitaer.rohre === undefined) {
        return false;
      }
      if (needBadExtra && !fd.sanitaer?.badWas) return false;
      if (
        needBadExtra &&
        fd.sanitaer.badWas === "objekte" &&
        (fd.sanitaer.badObjekte?.length ?? 0) === 0
      ) {
        return false;
      }
      return true;
    }
    case "heizung": {
      if (!fd.heizung?.typ) return false;
      if (!heizFollowQ) return true;
      if (heizFollowQ.id === "heizung_folge_oel_alter") {
        return fd.heizung?.alter !== undefined;
      }
      return fd.heizung?.vorhaben !== undefined;
    }
    case "maler": {
      if (!fd.maler?.was) return false;
      if (!malerFollowQ) return true;
      if (malerFollowQ.id === "maler_folge_fassade") {
        return fd.maler?.fassade !== undefined;
      }
      return fd.maler?.zustand !== undefined;
    }
    case "boden": {
      if (!fd.boden?.aktuell) return false;
      if (!bodenFollowQ) return true;
      return fd.boden?.verlegung !== undefined;
    }
    case "dach": {
      if (!fd.dach?.vorhaben) return false;
      if (!dachFollowQ) return true;
      return fd.dach?.alter !== undefined;
    }
    case "garten": {
      if (!fd.garten?.was) return false;
      if (!gartenFollowQ) return true;
      if (gartenFollowQ.id === "garten_folge_gestaltung") {
        return (fd.garten?.gestaltung?.length ?? 0) > 0;
      }
      if (gartenFollowQ.id === "garten_folge_haeufigkeit") {
        return fd.garten?.haeufigkeit !== undefined;
      }
      if (gartenFollowQ.id === "garten_folge_baum") {
        return fd.garten?.baumgroesse !== undefined;
      }
      return true;
    }
    default:
      return true;
  }
}
