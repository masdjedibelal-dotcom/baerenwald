/**
 * Sofortmaßnahmen → Direktauftrag (ohne HV-Angebotsfreigabe).
 * Nicht Bereich pauschal, sondern harte Fachfragen / Symptome.
 */

import {
  normalizeMeldeDachProblem,
  normalizeMeldeFensterProblem,
  normalizeMeldeHeizungProblem,
  normalizeMeldeStromProblem,
  normalizeMeldeWasserProblem,
} from "@/lib/funnel/melde-dynamic-questions";
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

/**
 * True = Sofortmaßnahme (Notdienst / Schaden stoppen).
 * False = normaler Vorgang mit Angebot/Freigabe.
 */
export function isMeldeDirektauftrag(
  bereichId: MeldeBereichId,
  answers: MeldeDirektauftragAnswers | null | undefined
): boolean {
  const a = answers ?? {};

  if (bereichId === "wasser") {
    const problem = normalizeMeldeWasserProblem(ans(a, "melde_problem"));
    const laeuft = ans(a, "melde_laeuft_noch");
    // Legacy: starkes Symptom ohne Folgefrage
    if (problemIs(a, "laeuft", "ueberschwemmt", "laeuft_stark")) return true;
    if (laeuft === "ja" || laeuft === "weiss_nicht") return true;
    if (
      (problem === "von_decke_wand" ||
        problemIs(a, "von_decke", "von_oben")) &&
      laeuft !== "nein"
    ) {
      return true;
    }
    const gefahr = ans(a, "melde_gefahr");
    if (gefahr === "rutsch" || gefahr === "strom") return true;
    return false;
  }

  if (bereichId === "strom") {
    const problem = normalizeMeldeStromProblem(ans(a, "melde_problem"));
    const sicherung = ans(a, "melde_sicherung_raus");
    const wieder = ans(a, "melde_wieder_raus");

    if (problem === "kein_strom" || problemIs(a, "kein_strom")) return true;

    if (problem === "fi_sicherung" || problemIs(a, "fi_sicherung")) {
      if (wieder === "ja" || wieder === "weiss_nicht") return true;
      if (sicherung === "ja" && wieder !== "nein") return true;
    }
    return false;
  }

  if (bereichId === "heizung") {
    const problem = normalizeMeldeHeizungProblem(ans(a, "melde_problem"));
    const kaltUmfang = ans(a, "melde_heizung_kalt");
    const laeuft = ans(a, "melde_laeuft_noch");

    if (problem === "wohnung_kalt" && kaltUmfang === "ja") return true;
    // Legacy: kalt + melde_heizung_kalt ja
    if (problemIs(a, "kalt", "nicht_warm") && kaltUmfang === "ja") return true;

    if (problem === "kein_warmwasser") return true;
    // Legacy: kein_ww + warmwasser nein (oder Problem allein)
    if (problemIs(a, "kein_ww")) {
      if (ans(a, "melde_warmwasser") !== "ja") return true;
    }

    if (
      problem === "wasser_am_hk" &&
      (laeuft === "ja" || laeuft === "weiss_nicht")
    ) {
      return true;
    }
    // Legacy: tropft_hk + gerade eben
    if (
      problemIs(a, "tropft_hk", "wasser_aus") &&
      (laeuft === "ja" ||
        laeuft === "weiss_nicht" ||
        ans(a, "melde_seit_wann") === "gerade_eben")
    ) {
      return true;
    }
    return false;
  }

  if (bereichId === "dach") {
    const problem = normalizeMeldeDachProblem(ans(a, "melde_problem"));
    const beiRegen = ans(a, "melde_bei_regen");
    const seit = ans(a, "melde_seit_wann");
    if (problemIs(a, "dach_undicht")) return true;
    if (
      (problem === "regenrinne_ueber" ||
        problem === "wasser_fassade" ||
        problem === "ziegel_boden" ||
        problemIs(a, "regenrinne_ueber", "wasser_fassade", "ziegel_boden", "ziegel", "rinne", "fallrohr")) &&
      (beiRegen === "ja" ||
        beiRegen === "weiss_nicht" ||
        seit === "gerade_eben" ||
        seit === "heute")
    ) {
      return true;
    }
    return false;
  }

  if (bereichId === "fenster_tuer") {
    const problem = normalizeMeldeFensterProblem(ans(a, "melde_problem"));
    if (
      problem === "scheibe_kaputt" ||
      problemIs(a, "scheibe_kaputt", "glas")
    ) {
      return true;
    }
    // Legacy: explizites Schloss / Schlüssel
    if (
      problemIs(a, "schloss") ||
      ans(a, "melde_tuer_detail") === "schluessel"
    ) {
      return true;
    }
    const ort =
      ans(a, "melde_ort_tuer") || ans(a, "melde_ort_schluessel");
    const istTuer =
      problem === "tuer_schloss" ||
      problemIs(a, "tuer_problem", "tuer_klemmt", "schloss");
    if (
      istTuer &&
      ans(a, "melde_geht_zu") === "nein" &&
      (ort === "wohnungstuer" || ort === "haustuer")
    ) {
      return true;
    }
    return false;
  }

  // Schimmel / Sonstiges → kein Direktauftrag
  return false;
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
  // Legacy: frühere Auto-Notfälle / explizites Flag
  if (fd.notfall === true || fd.havarie === true) return true;
  return (
    typeof fd.melde_kategorie === "string" &&
    fd.melde_kategorie.trim() === "notfall"
  );
}
