/**
 * Sofortmaßnahmen → Direktauftrag (ohne HV-Angebotsfreigabe).
 * Matching pro Fall-ID; HV-Whitelist entscheidet (leer = nichts).
 */

import {
  normalizeMeldeDachProblem,
  normalizeMeldeFensterProblem,
  normalizeMeldeHeizungProblem,
  normalizeMeldeStromProblem,
  normalizeMeldeWasserProblem,
} from "@/lib/funnel/melde-dynamic-questions";
import type { AkutFallId } from "@/lib/org/sofortmassnahme-faelle";
import type { MeldeBereichId } from "@/lib/org/melde-bereiche";
import type { MeldeKategorie } from "@/lib/org/types";

export type MeldeDirektauftragAnswers = Record<
  string,
  string | string[] | undefined
>;

function ans(a: MeldeDirektauftragAnswers, id: string): string {
  const v = a[id];
  return Array.isArray(v) ? String(v[0] ?? "") : String(v ?? "");
}

function problemIs(
  a: MeldeDirektauftragAnswers,
  ...ids: string[]
): boolean {
  return ids.includes(ans(a, "melde_problem"));
}

/** Welche Katalog-Fälle passen zu den Funnel-Antworten (unabhängig von HV-Whitelist). */
export function matchAkutFallIds(
  bereichId: MeldeBereichId,
  answers: MeldeDirektauftragAnswers | null | undefined
): AkutFallId[] {
  const a = answers ?? {};
  const hit: AkutFallId[] = [];

  if (bereichId === "wasser") {
    const problem = normalizeMeldeWasserProblem(ans(a, "melde_problem"));
    const laeuft = ans(a, "melde_laeuft_noch");
    if (problemIs(a, "laeuft", "ueberschwemmt", "laeuft_stark")) {
      hit.push("wasser_laeuft");
    }
    if (laeuft === "ja" || laeuft === "weiss_nicht") {
      if (!hit.includes("wasser_laeuft")) hit.push("wasser_laeuft");
    }
    if (
      (problem === "von_decke_wand" ||
        problemIs(a, "von_decke", "von_oben")) &&
      laeuft !== "nein"
    ) {
      hit.push("wasser_decke_wand");
    }
    const gefahr = ans(a, "melde_gefahr");
    if (gefahr === "rutsch" || gefahr === "strom") {
      hit.push("wasser_gefahr");
    }
    return hit;
  }

  if (bereichId === "strom") {
    const problem = normalizeMeldeStromProblem(ans(a, "melde_problem"));
    const sicherung = ans(a, "melde_sicherung_raus");
    const wieder = ans(a, "melde_wieder_raus");

    if (problem === "kein_strom" || problemIs(a, "kein_strom")) {
      hit.push("strom_kein");
    }

    if (problem === "fi_sicherung" || problemIs(a, "fi_sicherung")) {
      if (wieder === "ja" || wieder === "weiss_nicht") {
        hit.push("strom_fi_wieder");
      } else if (sicherung === "ja" && wieder !== "nein") {
        hit.push("strom_fi_wieder");
      }
    }
    return hit;
  }

  if (bereichId === "heizung") {
    const problem = normalizeMeldeHeizungProblem(ans(a, "melde_problem"));
    const kaltUmfang = ans(a, "melde_heizung_kalt");
    const laeuft = ans(a, "melde_laeuft_noch");

    if (problem === "wohnung_kalt" && kaltUmfang === "ja") {
      hit.push("heizung_wohnung_kalt");
    }
    if (problemIs(a, "kalt", "nicht_warm") && kaltUmfang === "ja") {
      if (!hit.includes("heizung_wohnung_kalt")) hit.push("heizung_wohnung_kalt");
    }

    if (problem === "kein_warmwasser") {
      hit.push("heizung_kein_warmwasser");
    }
    if (problemIs(a, "kein_ww") && ans(a, "melde_warmwasser") !== "ja") {
      if (!hit.includes("heizung_kein_warmwasser")) {
        hit.push("heizung_kein_warmwasser");
      }
    }

    if (
      problem === "wasser_am_hk" &&
      (laeuft === "ja" || laeuft === "weiss_nicht")
    ) {
      hit.push("heizung_wasser_hk");
    }
    if (
      problemIs(a, "tropft_hk", "wasser_aus") &&
      (laeuft === "ja" ||
        laeuft === "weiss_nicht" ||
        ans(a, "melde_seit_wann") === "gerade_eben")
    ) {
      if (!hit.includes("heizung_wasser_hk")) hit.push("heizung_wasser_hk");
    }
    return hit;
  }

  if (bereichId === "dach") {
    const problem = normalizeMeldeDachProblem(ans(a, "melde_problem"));
    const beiRegen = ans(a, "melde_bei_regen");
    const seit = ans(a, "melde_seit_wann");
    if (problemIs(a, "dach_undicht")) {
      hit.push("dach_undicht");
    }
    if (
      (problem === "regenrinne_ueber" ||
        problem === "wasser_fassade" ||
        problem === "ziegel_boden" ||
        problemIs(
          a,
          "regenrinne_ueber",
          "wasser_fassade",
          "ziegel_boden",
          "ziegel",
          "rinne",
          "fallrohr"
        )) &&
      (beiRegen === "ja" ||
        beiRegen === "weiss_nicht" ||
        seit === "gerade_eben" ||
        seit === "heute")
    ) {
      hit.push("dach_rinne_akut");
    }
    return hit;
  }

  if (bereichId === "fenster_tuer") {
    const problem = normalizeMeldeFensterProblem(ans(a, "melde_problem"));
    if (
      problem === "scheibe_kaputt" ||
      problemIs(a, "scheibe_kaputt", "glas")
    ) {
      hit.push("fenster_scheibe");
    }
    if (
      problemIs(a, "schloss") ||
      ans(a, "melde_tuer_detail") === "schluessel"
    ) {
      hit.push("fenster_schloss");
    }
    const ort = ans(a, "melde_ort_tuer") || ans(a, "melde_ort_schluessel");
    const istTuer =
      problem === "tuer_schloss" ||
      problemIs(a, "tuer_problem", "tuer_klemmt", "schloss");
    if (
      istTuer &&
      ans(a, "melde_geht_zu") === "nein" &&
      (ort === "wohnungstuer" || ort === "haustuer")
    ) {
      hit.push("fenster_tuer_nicht_absperrbar");
    }
    return hit;
  }

  return hit;
}

/**
 * True = Sofortmaßnahme laut HV-Whitelist.
 * `allowedFallIds` leer / fehlend → nie Direktauftrag.
 */
export function isMeldeDirektauftrag(
  bereichId: MeldeBereichId,
  answers: MeldeDirektauftragAnswers | null | undefined,
  allowedFallIds: readonly string[] | null | undefined
): boolean {
  const allowed = (allowedFallIds ?? [])
    .map((id) => String(id).trim())
    .filter(Boolean);
  if (!allowed.length) return false;
  const allowedSet = new Set(allowed);
  return matchAkutFallIds(bereichId, answers).some((id) => allowedSet.has(id));
}

/** Melde-Kategorie für Persistenz — nie pauschal „notfall“ aus dem Bereich. */
export function meldeKategorieForDirektauftragFlow(
  bereichId: MeldeBereichId,
  direktauftrag: boolean
): MeldeKategorie {
  if (direktauftrag) {
    if (
      bereichId === "wasser" ||
      bereichId === "dach" ||
      bereichId === "strom"
    ) {
      return "schaden";
    }
    return "reparatur";
  }
  if (bereichId === "wasser" || bereichId === "dach" || bereichId === "schimmel") {
    return "schaden";
  }
  return "reparatur";
}

/** Lead-Flag: Sofortmaßnahme / Direktauftrag-Pfad. */
export function leadIstMeldeDirektauftrag(lead: {
  freigabe_bypass_grund?: string | null;
  funnel_daten?: unknown;
}): boolean {
  if ((lead.freigabe_bypass_grund ?? "").trim() === "akut") return true;
  const fd = lead.funnel_daten as
    | {
        direktauftrag?: unknown;
        notfall?: unknown;
        havarie?: unknown;
        melde_kategorie?: unknown;
      }
    | null
    | undefined;
  if (!fd || typeof fd !== "object") return false;
  if (fd.direktauftrag === true) return true;
  if (fd.notfall === true || fd.havarie === true) return true;
  return (
    typeof fd.melde_kategorie === "string" &&
    fd.melde_kategorie.trim() === "notfall"
  );
}
