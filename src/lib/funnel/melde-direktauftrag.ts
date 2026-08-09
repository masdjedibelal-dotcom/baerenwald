/**
 * Sofortmaßnahmen → Direktauftrag (ohne HV-Angebotsfreigabe).
 * Nicht Bereich pauschal, sondern harte Fachfragen / Symptome.
 */

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
    if (problemIs(a, "laeuft", "ueberschwemmt", "laeuft_stark")) return true;
    if (ans(a, "melde_laeuft_noch") === "ja") return true;
    if (
      problemIs(a, "von_decke", "von_oben") &&
      ans(a, "melde_laeuft_noch") !== "nein"
    ) {
      return true;
    }
    const gefahr = ans(a, "melde_gefahr");
    if (gefahr === "rutsch" || gefahr === "strom") return true;
    return false;
  }

  if (bereichId === "strom") {
    if (problemIs(a, "kein_strom")) return true;
    if (
      problemIs(a, "fi_sicherung") &&
      ans(a, "melde_wieder_raus") === "ja"
    ) {
      return true;
    }
    return false;
  }

  if (bereichId === "heizung") {
    if (
      problemIs(a, "kalt", "nicht_warm") &&
      ans(a, "melde_heizung_kalt") === "ja"
    ) {
      return true;
    }
    if (
      problemIs(a, "kein_ww") &&
      ans(a, "melde_warmwasser") === "nein"
    ) {
      return true;
    }
    if (problemIs(a, "tropft_hk") && ans(a, "melde_seit_wann") === "gerade_eben") {
      return true;
    }
    return false;
  }

  if (bereichId === "dach") {
    if (problemIs(a, "dach_undicht")) return true;
    if (
      problemIs(a, "regenrinne_ueber", "wasser_fassade") &&
      (ans(a, "melde_bei_regen") === "ja" ||
        ans(a, "melde_seit_wann") === "gerade_eben" ||
        ans(a, "melde_seit_wann") === "heute")
    ) {
      return true;
    }
    if (
      problemIs(a, "ziegel_boden", "ziegel") &&
      (ans(a, "melde_seit_wann") === "gerade_eben" ||
        ans(a, "melde_seit_wann") === "heute")
    ) {
      return true;
    }
    return false;
  }

  if (bereichId === "fenster_tuer") {
    if (problemIs(a, "scheibe_kaputt", "glas")) return true;
    if (
      problemIs(a, "schloss") ||
      (problemIs(a, "tuer_problem") &&
        ans(a, "melde_tuer_detail") === "schluessel")
    ) {
      return true;
    }
    if (
      ans(a, "melde_geht_zu") === "nein" &&
      (ans(a, "melde_ort_tuer") === "wohnungstuer" ||
        ans(a, "melde_ort_tuer") === "haustuer" ||
        ans(a, "melde_ort_schluessel") === "wohnungstuer" ||
        ans(a, "melde_ort_schluessel") === "haustuer")
    ) {
      return true;
    }
    return false;
  }

  // Schimmel / Feuchtigkeit ohne aktives Wasser → kein Direktauftrag
  // Sonstiges → nie auto
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
