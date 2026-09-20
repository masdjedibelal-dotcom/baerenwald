import {
  bereicheOptions,
  dringlichkeitOptions,
  fachAnswerLabel,
  optionLabel,
} from "@/components/funnel/portal-funnel-options";
import type {
  HvMieterOption,
  PortalFunnelMeldeCtx,
  PortalFunnelObjekt,
  PortalFunnelStepId,
  SummaryRow,
} from "@/components/funnel/portal-funnel-types";
import {
  BW_FUNNEL_STEP_BAD_AUSSTATTUNG,
  BW_FUNNEL_STEP_ZUGAENGLICHKEIT,
  getZustandDisplayLabel,
} from "@/lib/funnel/config";
import { getActiveFachdetailQuestions } from "@/lib/funnel/fachdetail-questions-flat";
import { BW_FUNNEL_STEP1_OPTIONS } from "@/lib/funnel/situation-options";
import { findResolvedStepDef } from "@/lib/funnel/portal-funnel-mid-steps";
import type { FunnelState, FunnelStep } from "@/lib/funnel/types";
import type { StepOption } from "@/lib/types";

export type BuildPortalFunnelSummaryArgs = {
  objekt: PortalFunnelObjekt | null;
  melde?: PortalFunnelMeldeCtx;
  isHvIntern: boolean;
  mieterMode: "ohne" | "liste" | "neu";
  selectedMieterId: string | null;
  hvMieterListe: HvMieterOption[];
  mieterVollname: string;
  mieterStrasse: string;
  mieterHausnummer: string;
  mieterPlz: string;
  mieterOrt: string;
  mieterEmail: string;
  mieterTel: string;
  einheit: string;
  state: FunnelState;
  forceKaputt: boolean;
  includePhotos: boolean;
  stripTerminInfos: boolean;
  steps: PortalFunnelStepId[];
  useMeldeKaputtFlow: boolean;
  meldeFachfragen: Array<{
    id: string;
    frage: string;
    optionen: Array<{ value: string; label: string }>;
  }>;
  resolvedWebsiteSteps: FunnelStep[];
};

export function buildPortalFunnelSummaryRows(
  args: BuildPortalFunnelSummaryArgs
): SummaryRow[] {
  const {
    objekt,
    melde,
    isHvIntern,
    mieterMode,
    selectedMieterId,
    hvMieterListe,
    mieterVollname,
    mieterStrasse,
    mieterHausnummer,
    mieterPlz,
    mieterOrt,
    mieterEmail,
    mieterTel,
    einheit,
    state,
    forceKaputt,
    includePhotos,
    stripTerminInfos,
    steps,
    useMeldeKaputtFlow,
    meldeFachfragen,
    resolvedWebsiteSteps,
  } = args;

    const rows: SummaryRow[] = [];
    const push = (label: string, value: string | null | undefined) => {
      const v = (value ?? "").trim();
      if (v) rows.push({ label, value: v });
    };

    if (objekt) {
      const adr = [objekt.strasse, objekt.hausnummer, objekt.plz, objekt.ort]
        .filter(Boolean)
        .join(" ")
        .trim();
      push("Objekt", adr ? `${objekt.titel} · ${adr}` : objekt.titel);
    } else if (melde?.objektTitel?.trim()) {
      const adr = melde.objektAdresse?.trim();
      push(
        "Objekt",
        adr ? `${melde.objektTitel.trim()} · ${adr}` : melde.objektTitel.trim()
      );
    } else if (melde?.orgName) {
      push("Verwaltung", melde.orgName);
    }

    if (isHvIntern) {
      if (mieterMode === "ohne") {
        push("Mieter", "Ohne Mieter");
      } else if (mieterMode === "liste" && selectedMieterId) {
        const m = hvMieterListe.find((x) => x.id === selectedMieterId);
        push("Mieter", m?.name ?? "Aus Liste");
        if (m?.einheitLabel) push("Einheit", m.einheitLabel);
      } else if (mieterMode === "neu") {
        push("Mieter", mieterVollname || null);
        const adr = [
          mieterStrasse,
          mieterHausnummer,
          mieterPlz,
          mieterOrt,
        ]
          .map((s) => s.trim())
          .filter(Boolean)
          .join(" ");
        push("Mieter-Adresse", adr || null);
        push("E-Mail", mieterEmail.trim() || null);
        push("Telefon", mieterTel.trim() || null);
      }
    }

    if (einheit.trim()) push("Einheit", einheit.trim());

    if (state.situation && !forceKaputt) {
      const sit = BW_FUNNEL_STEP1_OPTIONS.find((o) => o.id === state.situation);
      push("Situation", sit?.label ?? state.situation);
    }

    if (state.situation && state.bereiche.length > 0) {
      const opts = bereicheOptions(state.situation, useMeldeKaputtFlow);
      push(
        "Bereich",
        state.bereiche.map((b) => optionLabel(opts, b)).join(", ")
      );
    }

    if (state.groesse != null && state.groesse > 0) {
      const einheitLabel =
        state.groesseEinheit === "stueck"
          ? "Stück"
          : state.groesseEinheit === "meter"
            ? "m"
            : "m²";
      push("Umfang", `${state.groesse} ${einheitLabel}`);
    }

    if (state.dringlichkeit) {
      push(
        "Dringlichkeit",
        optionLabel(
          dringlichkeitOptions({ stripSlaCopy: stripTerminInfos }),
          state.dringlichkeit
        )
      );
    }

    const pj = state.fachdetails?.projekt;
    if (pj?.ausbauRohbau) {
      push(
        "Rohbau",
        pj.ausbauRohbau === "ja" ? "Vorhanden" : "Muss erstellt werden"
      );
    }
    if (pj?.ausbauDeckenhoehe) {
      const labels: Record<string, string> = {
        niedrig: "Unter 2,00 m",
        mittel: "2,00–2,40 m",
        hoch: "Über 2,40 m",
      };
      push("Deckenhöhe", labels[pj.ausbauDeckenhoehe] ?? pj.ausbauDeckenhoehe);
    }
    if (pj?.gartenLeistung) {
      const gl = findResolvedStepDef(
        resolvedWebsiteSteps,
        "projekt_garten_leistung"
      );
      push(
        "Garten-Leistung",
        optionLabel((gl?.options ?? []) as StepOption[], pj.gartenLeistung)
      );
    }
    if (pj?.gartenTerrasseMaterial) {
      const labels: Record<string, string> = {
        holz_wpc: "Holz / WPC",
        naturstein: "Naturstein / Platten",
        noch_offen: "Noch offen",
      };
      push(
        "Terrassen-Material",
        labels[pj.gartenTerrasseMaterial] ?? pj.gartenTerrasseMaterial
      );
    }
    if (pj?.gartenZaun) {
      push("Zaunbau", pj.gartenZaun === "ja" ? "Ja" : "Nein");
    }
    if (pj?.gartenZugaenglichkeit) {
      push(
        "Garten-Zugang",
        pj.gartenZugaenglichkeit === "einfach" ? "Einfach" : "Schwer"
      );
    }
    if (pj?.durchbruchAnzahl != null) {
      push(
        "Durchbrüche",
        pj.durchbruchAnzahl >= 3 ? "Drei oder mehr" : String(pj.durchbruchAnzahl)
      );
    }
    if (pj?.durchbruchTragend !== undefined) {
      push(
        "Tragende Wände",
        pj.durchbruchTragend ? "Ja, tragend" : "Nein, nicht tragend"
      );
    }
    if (state.badAusstattung) {
      push(
        "Bad-Ausstattung",
        optionLabel(
          (BW_FUNNEL_STEP_BAD_AUSSTATTUNG.options ?? []) as StepOption[],
          state.badAusstattung
        )
      );
    }
    if (state.zugaenglichkeit) {
      push(
        "Zugänglichkeit",
        optionLabel(
          (BW_FUNNEL_STEP_ZUGAENGLICHKEIT.options ?? []) as StepOption[],
          state.zugaenglichkeit
        )
      );
    }
    if (state.zustand) {
      push(
        "Zustand",
        getZustandDisplayLabel(state.zustand, state.bereiche)
      );
    }

    if (useMeldeKaputtFlow) {
      for (const q of meldeFachfragen) {
        const raw = state.fachdetails?.fachdetailAnswers?.[q.id];
        const s = Array.isArray(raw) ? raw[0] : raw;
        if (!s) {
          push(q.frage, null);
          continue;
        }
        const opt = q.optionen.find((o) => o.value === s);
        push(q.frage, opt?.label ?? String(s));
      }
    } else {
      for (const q of getActiveFachdetailQuestions(state)) {
        const raw = state.fachdetails?.fachdetailAnswers?.[q.id];
        push(q.frage, fachAnswerLabel(q.optionen, raw));
      }
    }

    if (includePhotos && state.situation !== "erneuern") {
      const n = state.photos.length;
      push("Fotos", n === 0 ? "Keine" : `${n} Datei${n === 1 ? "" : "en"}`);
    }

    push("Beschreibung", state.leadBeschreibung.trim() || null);

    const contactName =
      `${state.vorname.trim()} ${state.nachname.trim()}`.trim() ||
      state.name.trim();
    const showKontakt =
      steps.includes("kontakt") ||
      Boolean(contactName) ||
      Boolean(state.email.trim());
    if (showKontakt) {
      push("Name", contactName || null);
      push("E-Mail", state.email.trim() || null);
      push("Telefon", state.telefon.trim() || null);
      const adr = [
        state.strasse.trim(),
        state.hausnummer.trim(),
        [state.plz.trim(), state.ort.trim()].filter(Boolean).join(" "),
      ]
        .filter(Boolean)
        .join(", ");
      push("Adresse", adr || null);
    }

    return rows;
}
