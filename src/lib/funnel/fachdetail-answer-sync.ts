/**
 * Synchronisiert flache fachdetailAnswers in die bestehende FachdetailsState-Struktur
 * (Preiskalkulation / zu_komplex).
 */

import type { FachdetailsState } from "@/lib/funnel/types";

function bucket(
  fd: FachdetailsState,
  gewerk: string
): Record<string, string | string[] | null | undefined> {
  const cur = (fd as Record<string, unknown>)[gewerk];
  if (cur && typeof cur === "object" && !Array.isArray(cur)) {
    return { ...(cur as Record<string, unknown>) } as Record<
      string,
      string | string[] | null | undefined
    >;
  }
  return {};
}

/** Antwort setzen: fachdetailAnswers + Legacy-Felder. */
export function buildPatchForFachdetailAnswer(
  fd: FachdetailsState,
  questionId: string,
  value: string | string[]
): Partial<FachdetailsState> {
  const nextAnswers: Record<string, string | string[] | undefined> = {
    ...(fd.fachdetailAnswers ?? {}),
    [questionId]: value,
  };
  const patch: Partial<FachdetailsState> = {
    fachdetailAnswers: nextAnswers,
  };

  const str = (v: string | string[]): string | undefined =>
    Array.isArray(v) ? v.join(",") : v;

  switch (questionId) {
    case "bad_was":
      patch.sanitaer = {
        ...fd.sanitaer,
        badWas: str(value as string),
        badObjekte: undefined,
        lage: str(value as string) === "wanne_dusche" ? "sichtbar" : undefined,
        rohre: undefined,
        badHeizkoerper: undefined,
        badHeizkoerperAnzahl: undefined,
        badHeizkoerperAuswahl: undefined,
        badBadewanne: undefined,
        badZusatzWanneAntwort: undefined,
      };
      break;
    case "bad_objekte":
      patch.sanitaer = {
        ...fd.sanitaer,
        badObjekte: Array.isArray(value)
          ? value
          : String(value)
              .split(",")
              .filter(Boolean),
      };
      break;
    case "sanitaer_lage":
      patch.sanitaer = {
        ...fd.sanitaer,
        lage: str(value as string),
        rohre: undefined,
      };
      break;
    case "sanitaer_rohre":
      patch.sanitaer = {
        ...fd.sanitaer,
        rohre: str(value as string),
      };
      break;
    case "bad_heizkoerper": {
      const hv = str(value as string);
      const base = { ...fd.sanitaer };
      base.badHeizkoerperAuswahl =
        hv === "keine"
          ? "keine"
          : hv === "handtuchwaermer_1"
            ? "handtuchwaermer_1"
            : hv === "handtuchwaermer_2"
              ? "handtuchwaermer_2"
              : undefined;
      if (hv === "keine" || !hv) {
        base.badHeizkoerper = undefined;
        base.badHeizkoerperAnzahl = undefined;
      } else if (hv === "handtuchwaermer_1") {
        base.badHeizkoerper = "handtuchwaermer";
        base.badHeizkoerperAnzahl = 1;
      } else if (hv === "handtuchwaermer_2") {
        base.badHeizkoerper = "handtuchwaermer";
        base.badHeizkoerperAnzahl = 2;
      }
      patch.sanitaer = base;
      break;
    }
    case "bad_zusatz_wanne_dusche": {
      const zv = str(value as string);
      patch.sanitaer = {
        ...fd.sanitaer,
        badZusatzWanneAntwort: zv === "ja" ? "ja" : "nein",
        badBadewanne: zv === "ja" ? "dusche" : undefined,
      };
      break;
    }
    case "sanitaer_notfall":
      patch.sanitaer = {
        ...fd.sanitaer,
        notfallSchwere: str(value as string),
      };
      break;
    case "sanitaer_problem":
      patch.sanitaer = {
        ...fd.sanitaer,
        lage: str(value as string),
      };
      break;
    case "elektro_notfall":
      patch.elektro = {
        ...fd.elektro,
        problem: str(value as string),
        folge: undefined,
      };
      break;
    case "elektro_erneuern":
      patch.elektro = {
        ...fd.elektro,
        problem: str(value as string),
        folge: undefined,
      };
      break;
    case "elektro_kaputt":
      patch.elektro = {
        ...fd.elektro,
        problem: str(value as string),
        folge: undefined,
      };
      break;
    case "elektro_folge_sicherung":
    case "elektro_folge_steckdose":
    case "elektro_folge_leitungen":
      patch.elektro = {
        ...fd.elektro,
        problem: fd.elektro?.problem,
        folge: str(value as string),
      };
      break;
    case "heizung_notfall":
      patch.heizung = {
        ...fd.heizung,
        typ: str(value as string),
        alter: undefined,
        vorhaben: undefined,
      };
      break;
    case "heizung_erneuern":
      patch.heizung = {
        ...fd.heizung,
        typ: str(value as string),
        alter: undefined,
        vorhaben: undefined,
      };
      break;
    case "heizung_oel_alter": {
      const v = str(value as string);
      patch.heizung = {
        ...fd.heizung,
        typ: fd.heizung?.typ,
        alter: v,
        vorhaben: undefined,
      };
      break;
    }
    case "heizung_kaputt":
      patch.heizung = {
        ...fd.heizung,
        typ: str(value as string),
        alter: undefined,
        vorhaben: undefined,
      };
      break;
    case "maler_was":
      patch.maler = {
        ...fd.maler,
        was: str(value as string),
        zustand: undefined,
        fassade: undefined,
      };
      break;
    case "maler_zustand":
      patch.maler = {
        ...fd.maler,
        was: fd.maler?.was,
        zustand: str(value as string),
        fassade: undefined,
      };
      break;
    case "maler_fassade_art":
      patch.maler = {
        ...fd.maler,
        was: fd.maler?.was,
        zustand: undefined,
        fassade: str(value as string),
      };
      break;
    case "boden_material":
      patch.boden = {
        ...fd.boden,
        aktuell: str(value as string),
        verlegung: undefined,
      };
      break;
    case "boden_verlegung":
      patch.boden = {
        ...fd.boden,
        aktuell: fd.boden?.aktuell,
        verlegung: str(value as string),
      };
      break;
    case "dach_vorhaben":
      patch.dach = {
        ...fd.dach,
        vorhaben: str(value as string),
        alter: undefined,
      };
      break;
    case "dach_alter":
      patch.dach = {
        ...fd.dach,
        vorhaben: fd.dach?.vorhaben,
        alter: str(value as string),
      };
      break;
    case "fenster_erneuern":
      patch.fenster = {
        ...fd.fenster,
        ausstattung: str(value as string) as "standard" | "premium",
        defekt: undefined,
      };
      break;
    case "fenster_defekt":
      patch.fenster = {
        ...fd.fenster,
        defekt: str(value as string),
        ausstattung: undefined,
      };
      break;
    case "garten_was": {
      const w = str(value as string);
      patch.garten = {
        ...fd.garten,
        was: w,
        haeufigkeit: w === "pflege" ? fd.garten?.haeufigkeit : undefined,
        baumgroesse: w === "baum" ? fd.garten?.baumgroesse : undefined,
        gestaltung:
          w === "gestaltung" ? fd.garten?.gestaltung : undefined,
      };
      break;
    }
    case "garten_followup": {
      const w = fd.garten?.was;
      if (w === "gestaltung" && Array.isArray(value)) {
        patch.garten = {
          ...fd.garten,
          was: w,
          gestaltung: value,
        };
      } else if (w === "pflege") {
        patch.garten = {
          ...fd.garten,
          was: w,
          haeufigkeit: str(value as string),
        };
      } else if (w === "baum") {
        patch.garten = {
          ...fd.garten,
          was: w,
          baumgroesse: str(value as string),
        };
      }
      break;
    }
    default:
      if (questionId.endsWith("_freitext")) {
        const g = questionId.replace(/_freitext$/, "");
        const ft = str(value as string) ?? "";
        const v = ft.trim() === "" ? null : ft.slice(0, 150);
        switch (g) {
          case "elektro":
            patch.elektro = { ...fd.elektro, freitext: v };
            break;
          case "sanitaer":
            patch.sanitaer = { ...fd.sanitaer, freitext: v };
            break;
          case "heizung":
            patch.heizung = { ...fd.heizung, freitext: v };
            break;
          case "maler":
            patch.maler = { ...fd.maler, freitext: v };
            break;
          case "boden":
            patch.boden = { ...fd.boden, freitext: v };
            break;
          case "dach":
            patch.dach = { ...fd.dach, freitext: v };
            break;
          case "garten":
            patch.garten = { ...fd.garten, freitext: v };
            break;
          case "fenster":
            patch.fenster = { ...fd.fenster, freitext: v };
            break;
          default:
            break;
        }
      }
      break;
  }

  return patch;
}

export function buildPatchClearFachdetailAnswer(
  fd: FachdetailsState,
  questionId: string
): Partial<FachdetailsState> {
  const next = { ...(fd.fachdetailAnswers ?? {}) };
  delete next[questionId];
  const patch: Partial<FachdetailsState> = {
    fachdetailAnswers: next,
  };

  switch (questionId) {
    case "bad_was":
      patch.sanitaer = {
        ...fd.sanitaer,
        badWas: undefined,
        badObjekte: undefined,
        lage: undefined,
        rohre: undefined,
        badHeizkoerper: undefined,
        badHeizkoerperAnzahl: undefined,
        badHeizkoerperAuswahl: undefined,
        badBadewanne: undefined,
        badZusatzWanneAntwort: undefined,
      };
      break;
    case "bad_objekte":
      patch.sanitaer = { ...fd.sanitaer, badObjekte: undefined };
      break;
    case "bad_heizkoerper":
      patch.sanitaer = {
        ...fd.sanitaer,
        badHeizkoerper: undefined,
        badHeizkoerperAnzahl: undefined,
        badHeizkoerperAuswahl: undefined,
      };
      break;
    case "bad_zusatz_wanne_dusche":
      patch.sanitaer = {
        ...fd.sanitaer,
        badBadewanne: undefined,
        badZusatzWanneAntwort: undefined,
      };
      break;
    case "sanitaer_lage":
      patch.sanitaer = {
        ...fd.sanitaer,
        lage: undefined,
        rohre: undefined,
      };
      break;
    case "sanitaer_rohre":
      patch.sanitaer = { ...fd.sanitaer, rohre: undefined };
      break;
    case "sanitaer_notfall":
      patch.sanitaer = {
        ...fd.sanitaer,
        notfallSchwere: undefined,
      };
      break;
    case "sanitaer_problem":
      patch.sanitaer = { ...fd.sanitaer, lage: undefined };
      break;
    case "elektro_notfall":
    case "elektro_erneuern":
    case "elektro_kaputt":
      patch.elektro = {
        ...fd.elektro,
        problem: undefined,
        folge: undefined,
      };
      break;
    case "elektro_folge_sicherung":
    case "elektro_folge_steckdose":
    case "elektro_folge_leitungen":
      patch.elektro = { ...fd.elektro, folge: undefined };
      break;
    case "heizung_notfall":
    case "heizung_erneuern":
    case "heizung_kaputt":
      patch.heizung = {
        ...fd.heizung,
        typ: undefined,
        alter: undefined,
        vorhaben: undefined,
      };
      break;
    case "heizung_oel_alter":
      patch.heizung = { ...fd.heizung, alter: undefined };
      break;
    case "maler_was":
    case "maler_zustand":
    case "maler_fassade_art":
      patch.maler = {
        was: undefined,
        zustand: undefined,
        fassade: undefined,
        freitext: fd.maler?.freitext,
      };
      break;
    case "boden_material":
    case "boden_verlegung":
      patch.boden = {
        aktuell: undefined,
        verlegung: undefined,
        freitext: fd.boden?.freitext,
      };
      break;
    case "dach_vorhaben":
    case "dach_alter":
      patch.dach = {
        vorhaben: undefined,
        alter: undefined,
        freitext: fd.dach?.freitext,
      };
      break;
    case "fenster_erneuern":
    case "fenster_defekt":
      patch.fenster = {
        ausstattung: undefined,
        defekt: undefined,
        freitext: fd.fenster?.freitext,
      };
      break;
    case "garten_was":
    case "garten_followup":
      patch.garten = {
        was: undefined,
        haeufigkeit: undefined,
        baumgroesse: undefined,
        gestaltung: undefined,
        freitext: fd.garten?.freitext,
      };
      break;
    default:
      if (questionId.endsWith("_freitext")) {
        const g = questionId.replace(/_freitext$/, "");
        const b = bucket(fd, g);
        b.freitext = null;
        (patch as Record<string, unknown>)[g] = b;
      }
      break;
  }
  return patch;
}
