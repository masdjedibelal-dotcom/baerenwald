"use client";

import {
  Fragment,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

import "@/app/baerenwald-landing.css";

import { BwBeratungLead } from "@/components/funnel/BwBeratungLead";
import { BwResultScreen } from "@/components/funnel/BwResultScreen";
import { FachdetailsStep } from "@/components/funnel/FachdetailsStep";
import { FunnelErrorBoundary } from "@/components/funnel/FunnelErrorBoundary";
import { HWLeadForm } from "@/components/funnel/HWLeadForm";
import {
  buildBwLeadPayload,
  buildFullLeadNotizen,
  submitBwLead,
  serializeFunnelStateForLead,
} from "@/components/funnel/LeadStep";
import { LeadAvailabilityHint } from "@/components/funnel/ResultScreen";
import { FunnelFooter } from "@/components/funnel/FunnelFooter";
import { FunnelHeader } from "@/components/funnel/FunnelHeader";
import { FunnelProgressBar } from "@/components/funnel/FunnelProgressBar";
import { TrustScreen } from "@/components/funnel/TrustScreen";
import { GroesseStep } from "@/components/funnel/GroesseStep";
import { LoadingScreen } from "@/components/funnel/LoadingScreen";
import { PlzStep } from "@/components/funnel/PlzStep";
import { SelectionTile } from "@/components/funnel/SelectionTile";
import { StepWrapper } from "@/components/funnel/StepWrapper";
import { ThankYou } from "@/components/funnel/ThankYou";
import { DatenschutzCheckbox } from "@/components/funnel/DatenschutzCheckbox";
import { useFunnelState } from "@/hooks/funnel/useFunnelState";
import {
  getGroesseConfig,
  getKundentypStep,
  BW_FUNNEL_PREIS_HINWEIS_ZUG_ZUSTAND,
  getResolvedStepsForSituation,
  groesseEinheitFromConfig,
  shouldSwapFachdetailsBeforeGroesse,
  BW_FUNNEL_STEP_BAD_AUSSTATTUNG,
  needsZeitraumSelection,
  getZeitraumOptions,
  getZeitraumFragen,
} from "@/lib/funnel/config";
import {
  firstFachdetailQuestionScreenId,
  getBwRechnerScreenSequence,
  getNextBwRechnerScreen,
  getPreviousBwRechnerScreen,
  isBwFachdetailQuestionScreenId,
  resolveNextBwRechnerScreenFromFachdetail,
  type FachdetailQuestionScreenId,
} from "@/lib/funnel/bw-rechner-sequence";
import {
  resolveFachdetailQuestionForUi,
  fachdetailAnswer,
  getFachdetailQuestionIdFromScreen,
} from "@/lib/funnel/fachdetail-questions-flat";
import { getBwFunnelProgressStep } from "@/lib/funnel/bw-funnel-progress";
import {
  getLeistungRechnerPreset,
  isRechnerDeepLinkPair,
} from "@/lib/funnel/leistung-rechner-preset";
import {
  BW_FUNNEL_STEP1_OPTIONS,
  BW_FUNNEL_STEP1_ORDER,
} from "@/lib/situation-options";
import {
  calculatePrice,
  getBwResultModus,
  isBwZuKomplexErgebnis,
} from "@/lib/funnel/price-calc";
import type { BwResultModus } from "@/lib/funnel/price-calc";
import { getPlzStatus } from "@/lib/funnel/plz";
import type {
  FunnelState,
  FunnelStep,
  Kundentyp,
  ObjektZustand,
  Situation,
  StepOption as FunnelStepOption,
  Zeitraum,
  Zugaenglichkeit,
} from "@/lib/funnel/types";
import { isReparaturNotfallSituation } from "@/lib/funnel/reparatur-flow";
import { isB2B } from "@/lib/funnel/types";
import { isBwTrustScreenId } from "@/lib/funnel/types";
import { tileIconForStepValue } from "@/lib/funnel-tile-icons";
import type { StepOption as LibStepOption } from "@/lib/types";
import { cn } from "@/lib/utils";

const LEAD_FORM_ID = "bw-funnel-lead";
const BERATUNG_LEAD_FORM_ID = "bw-beratung-lead";

/** CRM-Regel: mindestens gültige E-Mail oder Telefon (mind. 3 Zeichen). */
function bwLeadContactOk(email: string, telefon: string): boolean {
  const e = email.trim();
  const t = telefon.trim();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const telOk = t.length >= 3;
  return emailOk || telOk;
}

/** Betreuung: kein Ort-/PLZ-Schritt in {@link getBwRechnerScreenSequence}. */
function bwSkipsOrtPlzScreen(situation: Situation | null): boolean {
  return situation === "betreuung";
}

type Screen =
  | "trust_intro"
  | "trust_preis"
  | "trust_qualitaet"
  | "situation"
  | "bereiche"
  | FachdetailQuestionScreenId
  | "kundentyp"
  | "umfang"
  | "zeitpunkt"
  | "zugaenglichkeit"
  | "zustand"
  | "groesse"
  | "projekt_terrasse_material"
  | "projekt_terrasse_unterbau"
  | "projekt_durchbruch_anzahl"
  | "projekt_durchbruch_statik"
  | "projekt_garten_leistung"
  | "projekt_garten_zaun"
  | "projekt_garten_zugang"
  | "projekt_ausbau_rohbau"
  | "projekt_ausbau_deckenhoehe"
  | "bad_ausstattung"
  | "ort"
  | "loading"
  | "result"
  | "lead"
  | "beratung-lead"
  | "ausserhalb"
  | "danke";

function isSituation(x: string): x is Situation {
  return (BW_FUNNEL_STEP1_ORDER as readonly string[]).includes(x);
}

/**
 * Marketing-/Legacy-Query-Werte → Funnel-Situation (wie HomeLanding.rechnerSituationParam).
 * Ohne diese Abbildung liefern Ratgeber/Leistungen z. B. ?situation=renovierung — wird bisher ignoriert.
 */
function normalizeSituationQueryParam(raw: string | null): Situation | null {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  const aliasMap: Record<string, Situation> = {
    renovieren: "erneuern",
    sanieren: "erneuern",
    renovierung: "erneuern",
    gastro: "gewerbe",
    neubau: "erneuern",
    neubauen: "erneuern",
    pflege: "betreuung",
    akut: "kaputt",
    notfall: "kaputt",
    b2b: "gewerbe",
  };
  const candidate = aliasMap[lower] ?? lower;
  return isSituation(candidate) ? candidate : null;
}

function asLibOpt(o: FunnelStepOption): LibStepOption {
  return {
    value: o.value,
    label: o.label,
    hint: o.hint,
    emoji: o.emoji,
    priceTag: o.priceTag,
    infoExpand: o.infoText,
    warnText: o.warnText,
    triggerGewerke: o.triggerGewerke,
  };
}

function FunnelRechnerInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlInit = useRef(false);
  const [screen, setScreen] = useState<Screen>("trust_intro");
  const [mindestauftragAktiv, setMindestauftrag] = useState(false);
  const [isAusserhalbLead, setIsAusserhalbLead] = useState(false);
  const [ausserhalbBeschreibung, setAusserhalbBeschreibung] = useState("");
  const [beratungDatenschutz, setBeratungDatenschutz] = useState(false);
  const [beratungDatenschutzError, setBeratungDatenschutzError] = useState(false);
  const [ausserhalbDatenschutz, setAusserhalbDatenschutz] = useState(false);
  const [ausserhalbDatenschutzError, setAusserhalbDatenschutzError] = useState(false);
  const [resultModus, setResultModus] = useState<BwResultModus>("preisrahmen");
  const [schwellenwertAusgeloest, setSchwellenwertAusgeloest] = useState(false);
  const [komplexRueckrufDanke, setKomplexRueckrufDanke] = useState(false);
  /** Direkt nach Schimmel-Kachel: Beratungs-Lead mit Spezialtext */
  const [schimmelBeratung, setSchimmelBeratung] = useState(false);
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSubmitError, setLeadSubmitError] = useState<string | null>(null);
  /** Kurzzeit-Hinweis nach Suche ohne Allowlist-Treffer (`?nf=1`). */
  const [searchNotFoundBanner, setSearchNotFoundBanner] = useState(false);
  /** Nach erstem „Preis berechnen“: auf „ort“ wieder „Weiter →“ (Footer rendert zuverlässig). */
  const [priceConfirmed, setPriceConfirmed] = useState(false);
  const [microNote, setMicroNote] = useState<{
    target: Screen;
    text: string;
  } | null>(null);
  const {
    state,
    setSituation,
    setBereiche,
    toggleBereich,
    setUmfang,
    setGroesse,
    setPlz,
    setZeitraum,
    setPrice,
    setSlot,
    updateLeadField,
    addPhotos,
    setDringlichkeit,
    setSubmitted,
    setKundentyp,
    setZugaenglichkeit,
    setZustand,
    setFachdetails,
    clearFachdetailAnswer,
    setBadAusstattung,
    reset,
  } = useFunnelState();

  const fachdetailsBeforeGroesse = useMemo(
    () => shouldSwapFachdetailsBeforeGroesse(state.situation, state.bereiche),
    [state.situation, state.bereiche]
  );

  const zuKomplexForSteps = useMemo(
    () => getBwResultModus(state) === "zu_komplex",
    [
      state.situation,
      state.umfang,
      state.bereiche,
      state.fachdetails?.fachdetailAnswers,
      state.fachdetails?.heizung?.typ,
      state.fachdetails?.heizung?.ziel,
      state.fachdetails?.heizung?.alter,
      state.fachdetails?.heizung?.vorhaben,
      state.fachdetails?.garten?.baumgroesse,
      state.fachdetails?.maler?.was,
      state.fachdetails?.maler?.fassade,
      state.fachdetails?.projekt,
    ]
  );

  const resolvedSteps = useMemo(
    () =>
      getResolvedStepsForSituation(
        state.situation,
        state.bereiche,
        state.fachdetails,
        state.umfang,
        zuKomplexForSteps
      ),
    [
      state.situation,
      state.bereiche,
      state.fachdetails,
      state.umfang,
      zuKomplexForSteps,
    ]
  );

  const hasGroesseStep = useMemo(
    () =>
      resolvedSteps.some((s) => s.id.toLowerCase().includes("groesse")),
    [resolvedSteps]
  );

  const hasBadAusstattungStep = useMemo(
    () => resolvedSteps.some((s) => s.id === "bad_ausstattung"),
    [resolvedSteps]
  );

  const stepBereiche = resolvedSteps[0] ?? null;
  const hasFachdetailsStep = useMemo(
    () => resolvedSteps.some((s) => s.id === "fachdetails"),
    [resolvedSteps]
  );
  const stepUmfang = useMemo(
    () =>
      resolvedSteps.find(
        (s) =>
          s.id.endsWith("_umfang") ||
          s.id === "betreuung_haeufigkeit"
      ) ?? null,
    [resolvedSteps]
  );
  const stepZugaenglichkeit = useMemo(() => {
    if (isReparaturNotfallSituation(state.situation)) return null;
    if (state.situation === "gewerbe") return null;
    if (zuKomplexForSteps) return null;
    return resolvedSteps.find((s) => s.id === "zugaenglichkeit") ?? null;
  }, [resolvedSteps, state.situation, zuKomplexForSteps]);

  const stepZustand = useMemo(() => {
    if (isReparaturNotfallSituation(state.situation)) return null;
    if (state.situation === "gewerbe") return null;
    if (zuKomplexForSteps) return null;
    return resolvedSteps.find((s) => s.id === "zustand") ?? null;
  }, [resolvedSteps, state.situation, zuKomplexForSteps]);
  const stepGroesse = useMemo(
    () =>
      resolvedSteps.find((s) => s.id.toLowerCase().includes("groesse")) ??
      null,
    [resolvedSteps]
  );

  const groesseSliderConfig = useMemo(
    () => getGroesseConfig(state),
    [state.situation, state.bereiche, state.fachdetails]
  );

  const stepKundentyp = useMemo(
    () => (state.situation ? getKundentypStep(state.situation) : null),
    [state.situation]
  );

  const hasKundentypStep = useMemo(
    () => Boolean(stepKundentyp?.options && stepKundentyp.options.length > 0),
    [stepKundentyp]
  );

  const umfangOk =
    isReparaturNotfallSituation(state.situation)
      ? Boolean(state.zeitraum)
      : stepUmfang
        ? Boolean(state.umfang)
        : true;

  /** Screen-Reihenfolge (ohne loading/result/lead) — stabil, damit handleBack & Fachdetail „X von Y“ konsistent bleiben. */
  const stepSequence = useMemo(
    () => getBwRechnerScreenSequence(state),
    [
      state.situation,
      state.bereiche,
      state.umfang,
      state.dringlichkeit,
      state.zeitraum,
      state.groesse,
      state.badAusstattung ?? null,
      state.fachdetails,
      zuKomplexForSteps,
    ]
  );

  useEffect(() => {
    if (searchParams.get("nf") !== "1") return;
    setSearchNotFoundBanner(true);
    if (typeof window === "undefined") return;
    const next = new URL(window.location.href);
    next.searchParams.delete("nf");
    const qs = next.searchParams.toString();
    router.replace(qs ? `${next.pathname}?${qs}` : next.pathname, {
      scroll: false,
    });
  }, [router, searchParams]);

  useEffect(() => {
    if (urlInit.current) return;
    const leistungPreset = getLeistungRechnerPreset(searchParams.get("leistung"));
    if (leistungPreset) {
      setSituation(leistungPreset.situation);
      setBereiche(leistungPreset.bereiche);
      setPriceConfirmed(false);
      if (leistungPreset.situation === "gewerbe") {
        setScreen("beratung-lead");
      } else {
        setScreen("bereiche");
      }
      urlInit.current = true;
      return;
    }
    const gewerkRaw = searchParams.get("gewerk")?.trim();
    const normalizedSit = normalizeSituationQueryParam(
      searchParams.get("situation")
    );
    if (normalizedSit && gewerkRaw && isRechnerDeepLinkPair(normalizedSit, gewerkRaw)) {
      setSituation(normalizedSit);
      setBereiche([gewerkRaw]);
      setPriceConfirmed(false);
      if (normalizedSit === "gewerbe") {
        setScreen("beratung-lead");
      } else {
        setScreen("bereiche");
      }
      urlInit.current = true;
      return;
    }
    const normalized = normalizeSituationQueryParam(searchParams.get("situation"));
    if (normalized) {
      setSituation(normalized);
      setPriceConfirmed(false);
      if (normalized === "gewerbe") {
        setScreen("beratung-lead");
      } else {
        setScreen("bereiche");
      }
    }
    urlInit.current = true;
  }, [searchParams, setSituation, setBereiche]);

  useEffect(() => {
    if (isBwTrustScreenId(screen) && !stepSequence.includes(screen)) {
      setScreen((stepSequence[0] ?? "situation") as Screen);
    }
  }, [screen, stepSequence]);

  /** Betreuung ohne PLZ-Schritt: falscher Screen „ort“ vermeiden (z. B. nach Zurück vom Ergebnis). */
  useEffect(() => {
    if (screen !== "ort") return;
    if (!bwSkipsOrtPlzScreen(state.situation)) return;
    if (!stepSequence.includes("ort")) {
      setScreen("kundentyp");
    }
  }, [screen, state.situation, stepSequence]);

  /** Fachdetail-Screen nicht mehr in Sequenz (z. B. Kurzschluss nach Sanitär „wand“) — ohne leeren Screen weiter. */
  useEffect(() => {
    if (!isBwFachdetailQuestionScreenId(screen)) return;
    if (stepSequence.includes(screen)) return;
    const next = resolveNextBwRechnerScreenFromFachdetail(state, screen);
    if (next) setScreen(next as Screen);
  }, [screen, stepSequence, state]);

  /** Reparatur/Notfall: kein m² — leerer Größen-Screen vermeiden, falls Sequenz fehlerhaft `groesse` enthält. */
  useEffect(() => {
    if (screen !== "groesse") return;
    if (!isReparaturNotfallSituation(state.situation)) return;
    if (groesseSliderConfig) return;
    const next = getNextBwRechnerScreen(state, "groesse");
    if (next) setScreen(next as Screen);
  }, [screen, state, groesseSliderConfig]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (screen === "loading") {
        window.scrollTo(0, 0);
        return;
      }
      if (window.scrollY < 1) return;
      window.scrollTo(0, 0);
    });
    return () => cancelAnimationFrame(id);
  }, [screen]);

  useEffect(() => {
    if (!microNote) return;
    if (screen !== microNote.target) {
      setMicroNote(null);
      return;
    }
    const id = window.setTimeout(() => setMicroNote(null), 9000);
    return () => window.clearTimeout(id);
  }, [screen, microNote]);

  const microBannerFor = useCallback(
    (target: Screen) =>
      microNote?.target === target ? (
        <span className="font-medium text-text-primary">{microNote.text}</span>
      ) : null,
    [microNote]
  );

  const goPostGroesseChain = useCallback(() => {
    if (hasBadAusstattungStep) {
      setScreen("bad_ausstattung");
      return;
    }
    const firstFd = firstFachdetailQuestionScreenId(state);
    if (firstFd) {
      setScreen(firstFd);
    } else if (hasKundentypStep) setScreen("kundentyp");
    else setScreen("ort");
  }, [
    hasBadAusstattungStep,
    hasKundentypStep,
    state,
  ]);

  const goGroesseOrPostGroesse = useCallback(() => {
    if (hasGroesseStep) setScreen("groesse");
    else goPostGroesseChain();
  }, [hasGroesseStep, goPostGroesseChain]);

  const goAfterZugaenglichkeit = useCallback(() => {
    if (stepZustand) {
      setScreen("zustand");
      return;
    }
    /** Ohne Zustand-Schritt (z. B. nur Dach/Fenster): nicht direkt zur Größe —
     * sonst werden Fachdetails (z. B. `dach_vorhaben`) nur beim Zurück sichtbar. */
    if (fachdetailsBeforeGroesse && hasFachdetailsStep) {
      const firstFd = firstFachdetailQuestionScreenId(state);
      if (firstFd) {
        setScreen(firstFd);
        return;
      }
    }
    goGroesseOrPostGroesse();
  }, [
    stepZustand,
    goGroesseOrPostGroesse,
    fachdetailsBeforeGroesse,
    hasFachdetailsStep,
    state,
  ]);

  const goAfterZustandScreen = useCallback(() => {
    if (fachdetailsBeforeGroesse && hasFachdetailsStep) {
      const firstFd = firstFachdetailQuestionScreenId(state);
      if (firstFd) {
        setScreen(firstFd);
        return;
      }
    }
    goGroesseOrPostGroesse();
  }, [
    fachdetailsBeforeGroesse,
    hasFachdetailsStep,
    goGroesseOrPostGroesse,
    state,
  ]);

  const goNextFromCompletedFachdetailScreen = useCallback(
    (fromScreen: Screen) => {
      const next = resolveNextBwRechnerScreenFromFachdetail(
        state,
        fromScreen
      );
      if (!next) return;
      if (next === "groesse" && fachdetailsBeforeGroesse && hasGroesseStep) {
        setMicroNote({
          target: "groesse",
          text: "Fast geschafft — noch Größe bzw. Fläche angeben",
        });
      }
      setScreen(next as Screen);
    },
    [state, fachdetailsBeforeGroesse, hasGroesseStep]
  );

  const handleReset = useCallback(() => {
    reset();
    setSubmitted(false);
    setMindestauftrag(false);
    setIsAusserhalbLead(false);
    setAusserhalbBeschreibung("");
    setBeratungDatenschutz(false);
    setBeratungDatenschutzError(false);
    setAusserhalbDatenschutz(false);
    setAusserhalbDatenschutzError(false);
    setResultModus("preisrahmen");
    setSchwellenwertAusgeloest(false);
    setKomplexRueckrufDanke(false);
    setMicroNote(null);
    setPriceConfirmed(false);
    setSchimmelBeratung(false);
    setLeadSubmitting(false);
    setLeadSubmitError(null);

    /** Erster Story-/Trust-Screen überspringen — direkt Situation wählen. */
    setScreen("situation");
    router.replace("/rechner", { scroll: false });

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant" as ScrollBehavior,
    });
  }, [reset, setSubmitted, router]);

  const handleNext = useCallback(() => {
    if (isBwFachdetailQuestionScreenId(screen)) {
      const qid = getFachdetailQuestionIdFromScreen(screen);
      if (!qid) return;
      const q = resolveFachdetailQuestionForUi(state, qid);
      if (!q) return;
      const v = fachdetailAnswer(state, qid);
      const multi = q.inputType === "multi";
      let ok = false;
      if (multi) {
        const n = Array.isArray(v)
          ? v.length
          : typeof v === "string" && v
            ? v.split(",").filter(Boolean).length
            : 0;
        ok = n > 0;
      } else {
        ok = v !== undefined && v !== "";
      }
      if (!ok) return;
      goNextFromCompletedFachdetailScreen(screen);
      return;
    }

    if (isBwTrustScreenId(screen)) {
      const nextTrust = getNextBwRechnerScreen(state, screen);
      if (nextTrust) setScreen(nextTrust as Screen);
      return;
    }

    if (
      screen === "projekt_terrasse_material" ||
      screen === "projekt_terrasse_unterbau" ||
      screen === "projekt_durchbruch_anzahl" ||
      screen === "projekt_durchbruch_statik" ||
      screen === "projekt_garten_leistung" ||
      screen === "projekt_garten_zaun" ||
      screen === "projekt_garten_zugang" ||
      screen === "projekt_ausbau_rohbau" ||
      screen === "projekt_ausbau_deckenhoehe"
    ) {
      const nextProj = getNextBwRechnerScreen(state, screen);
      if (nextProj) setScreen(nextProj as Screen);
      return;
    }

    switch (screen) {
      case "situation":
        if (state.situation) {
          if (isB2B(state.situation)) {
            setScreen("beratung-lead");
          } else {
            setScreen("bereiche");
          }
        }
        break;
      case "bereiche":
        if (state.bereiche.length > 0) {
          if (isB2B(state.situation)) setScreen("beratung-lead");
          else {
            const nextAfterBereiche = getNextBwRechnerScreen(
              state,
              "bereiche"
            );
            if (nextAfterBereiche) setScreen(nextAfterBereiche as Screen);
            else setScreen("umfang");
          }
        }
        break;
      case "kundentyp":
        if (state.kundentyp) {
          if (bwSkipsOrtPlzScreen(state.situation)) {
            const needZ = needsZeitraumSelection(state.situation);
            if (needZ && !state.zeitraum) {
              setZeitraum("flexibel");
            }
            const calcState =
              needZ && !state.zeitraum
                ? { ...state, zeitraum: "flexibel" as Zeitraum }
                : state;
            const {
              min,
              max,
              breakdown,
              mindestauftragAktiv,
              resultModus: rm,
              schwellenwertAusgeloest: swa,
              istFallback,
              komplexReason,
            } = calculatePrice(calcState);
            setPrice(min, max, breakdown, istFallback, komplexReason ?? null);
            setMindestauftrag(mindestauftragAktiv);
            setResultModus(rm);
            setSchwellenwertAusgeloest(swa);
            setPriceConfirmed(true);
            setScreen("loading");
          } else {
            setScreen("ort");
          }
        }
        break;
      case "zeitpunkt":
        if (state.zeitraum) {
          const nextZ = getNextBwRechnerScreen(state, "zeitpunkt");
          if (nextZ) setScreen(nextZ as Screen);
        }
        break;
      case "umfang":
        if (umfangOk) {
          const nextAfterUmfang = getNextBwRechnerScreen(state, "umfang");
          if (nextAfterUmfang) setScreen(nextAfterUmfang as Screen);
        }
        break;
      case "zugaenglichkeit":
        if (state.zugaenglichkeit) goAfterZugaenglichkeit();
        break;
      case "zustand":
        if (state.zustand) goAfterZustandScreen();
        break;
      case "groesse":
        if (state.groesse != null) {
          const nextFromSeq = getNextBwRechnerScreen(state, "groesse");
          if (nextFromSeq) {
            setScreen(nextFromSeq as Screen);
            break;
          }
          if (hasBadAusstattungStep) {
            setScreen("bad_ausstattung");
          } else if (fachdetailsBeforeGroesse) {
            if (hasKundentypStep) setScreen("kundentyp");
            else setScreen("ort");
          } else if (hasFachdetailsStep) {
            const firstFd = firstFachdetailQuestionScreenId(state);
            if (firstFd) {
              setScreen(firstFd);
            } else if (hasKundentypStep) setScreen("kundentyp");
            else setScreen("ort");
          } else if (hasKundentypStep) {
            setScreen("kundentyp");
          } else {
            setScreen("ort");
          }
        }
        break;
      case "bad_ausstattung":
        if (state.badAusstattung ?? null) {
          const nextBad = getNextBwRechnerScreen(state, "bad_ausstattung");
          if (nextBad) {
            setScreen(nextBad as Screen);
            break;
          }
          if (fachdetailsBeforeGroesse) {
            if (hasKundentypStep) setScreen("kundentyp");
            else setScreen("ort");
          } else if (hasFachdetailsStep) {
            const firstFd = firstFachdetailQuestionScreenId(state);
            if (firstFd) {
              setScreen(firstFd);
            } else if (hasKundentypStep) setScreen("kundentyp");
            else setScreen("ort");
          } else if (hasKundentypStep) {
            setScreen("kundentyp");
          } else {
            setScreen("ort");
          }
        }
        break;
      case "ort": {
        if (
          state.plz.length < 4 ||
          (needsZeitraumSelection(state.situation) && !state.zeitraum)
        )
          break;
        const {
          min,
          max,
          breakdown,
          mindestauftragAktiv,
          resultModus: rm,
          schwellenwertAusgeloest: swa,
          istFallback,
          komplexReason,
        } = calculatePrice(state);
        setPrice(min, max, breakdown, istFallback, komplexReason ?? null);
        setMindestauftrag(mindestauftragAktiv);
        setResultModus(rm);
        setSchwellenwertAusgeloest(swa);
        setPriceConfirmed(true);
        setScreen("loading");
        break;
      }
      case "result":
        if (isBwZuKomplexErgebnis(state, resultModus)) break;
        setScreen("lead");
        break;
      case "lead": {
        (
          document.getElementById(LEAD_FORM_ID) as HTMLFormElement | null
        )?.requestSubmit();
        break;
      }
      case "beratung-lead":
        (
          document.getElementById(
            BERATUNG_LEAD_FORM_ID
          ) as HTMLFormElement | null
        )?.requestSubmit();
        break;
      default:
        break;
    }
  }, [
    screen,
    state,
    umfangOk,
    goGroesseOrPostGroesse,
    goAfterZugaenglichkeit,
    goAfterZustandScreen,
    fachdetailsBeforeGroesse,
    hasGroesseStep,
    hasBadAusstattungStep,
    hasFachdetailsStep,
    hasKundentypStep,
    setPrice,
    goNextFromCompletedFachdetailScreen,
    resultModus,
    setZeitraum,
  ]);

  const handleBack = useCallback(() => {
    if (isBwFachdetailQuestionScreenId(screen)) {
      const qid = getFachdetailQuestionIdFromScreen(screen);
      if (qid) clearFachdetailAnswer(qid);
    }
    const prevSeq = getPreviousBwRechnerScreen(state, screen);
    if (prevSeq) {
      setScreen(prevSeq as Screen);
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant" as ScrollBehavior,
      });
      return;
    }
    const steps = stepSequence;
    const currentIndex = steps.lastIndexOf(screen);
    if (currentIndex < 0 && isBwFachdetailQuestionScreenId(screen)) {
      const firstFdIdx = steps.findIndex((s) =>
        isBwFachdetailQuestionScreenId(s)
      );
      if (firstFdIdx > 0) {
        setScreen(steps[firstFdIdx - 1] as Screen);
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: "instant" as ScrollBehavior,
        });
        return;
      }
    }
    switch (screen) {
      case "loading":
        setPriceConfirmed(true);
        setScreen(
          bwSkipsOrtPlzScreen(state.situation) ? "kundentyp" : "ort"
        );
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: "instant" as ScrollBehavior,
        });
        break;
      case "result":
        setPriceConfirmed(true);
        setScreen(
          bwSkipsOrtPlzScreen(state.situation) ? "kundentyp" : "ort"
        );
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: "instant" as ScrollBehavior,
        });
        break;
      case "lead":
        setScreen("result");
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: "instant" as ScrollBehavior,
        });
        break;
      case "beratung-lead":
        if (isB2B(state.situation)) {
          setScreen("situation");
        } else {
          setScreen("bereiche");
        }
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: "instant" as ScrollBehavior,
        });
        break;
      case "ausserhalb":
        setScreen("ort");
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: "instant" as ScrollBehavior,
        });
        break;
      default:
        break;
    }
  }, [screen, state, stepSequence, clearFachdetailAnswer]);

  const nextDisabled = useMemo(() => {
    if (isBwFachdetailQuestionScreenId(screen)) {
      const qid = getFachdetailQuestionIdFromScreen(screen);
      if (!qid) return true;
      const q = resolveFachdetailQuestionForUi(state, qid);
      if (!q) return true;
      const v = fachdetailAnswer(state, qid);
      if (q.inputType === "multi") {
        const n = Array.isArray(v)
          ? v.length
          : typeof v === "string" && v
            ? v.split(",").filter(Boolean).length
            : 0;
        return n === 0;
      }
      return v === undefined || v === "";
    }
    switch (screen) {
      case "trust_intro":
      case "trust_preis":
      case "trust_qualitaet":
        return false;
      case "situation":
        return !state.situation;
      case "bereiche":
        return state.bereiche.length === 0;
      case "kundentyp":
        return !state.kundentyp;
      case "zeitpunkt":
        return !state.zeitraum;
      case "umfang":
        return !umfangOk;
      case "zugaenglichkeit":
        return !state.zugaenglichkeit;
      case "zustand":
        return !state.zustand;
      case "groesse":
        return state.groesse == null;
      case "projekt_terrasse_material":
        return !state.fachdetails?.projekt?.terrasseMaterial;
      case "projekt_terrasse_unterbau":
        return !state.fachdetails?.projekt?.terrasseUnterbau;
      case "projekt_durchbruch_anzahl":
        return state.fachdetails?.projekt?.durchbruchAnzahl == null;
      case "projekt_durchbruch_statik":
        return state.fachdetails?.projekt?.durchbruchTragend === undefined;
      case "projekt_garten_leistung":
        return state.fachdetails?.projekt?.gartenLeistung === undefined;
      case "projekt_garten_zaun":
        return state.fachdetails?.projekt?.gartenZaun === undefined;
      case "projekt_garten_zugang":
        return state.fachdetails?.projekt?.gartenZugaenglichkeit === undefined;
      case "projekt_ausbau_rohbau":
        return !state.fachdetails?.projekt?.ausbauRohbau;
      case "projekt_ausbau_deckenhoehe":
        return !state.fachdetails?.projekt?.ausbauDeckenhoehe;
      case "bad_ausstattung":
        return !(state.badAusstattung ?? null);
      case "ort": {
        if (state.plz.length < 4) return true;
        if (needsZeitraumSelection(state.situation) && !state.zeitraum)
          return true;
        const plzSt = getPlzStatus(state.plz);
        // Ungültige PLZ blockiert, ausserhalb zeigt eigenen Button
        return plzSt === "ungueltig" || plzSt === "ausserhalb";
      }
      case "loading":
        return true;
      case "result":
        return isBwZuKomplexErgebnis(state, resultModus);
      case "lead":
        return (
          !state.name.trim() ||
          !bwLeadContactOk(state.email, state.telefon) ||
          leadSubmitting
        );
      case "beratung-lead":
        return (
          !state.vorname.trim() ||
          !state.nachname.trim() ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim()) ||
          state.telefon.trim().length < 5
        );
      default:
        return true;
    }
  }, [screen, state, umfangOk, schimmelBeratung, leadSubmitting, resultModus]);

  const nextLabel = useMemo(() => {
    if (screen === "trust_intro") return "Los geht's →";
    if (screen === "kundentyp" && bwSkipsOrtPlzScreen(state.situation)) {
      return priceConfirmed ? "Weiter →" : "Preis berechnen";
    }
    if (screen === "ort") {
      return priceConfirmed ? "Weiter →" : "Preis berechnen";
    }
    if (screen === "lead" && leadSubmitting) return "Wird gesendet…";
    if (screen === "lead") return "Absenden →";
    if (screen === "beratung-lead") {
      if (schimmelBeratung || state.bereiche.includes("schimmel")) {
        return "Rückruf anfragen →";
      }
      return "Rückruf anfordern →";
    }
    if (screen === "result" && resultModus === "preisrahmen_warnung")
      return "Vor-Ort-Termin anfragen";
    if (screen === "result") return "Weiter";
    return "Weiter →";
  }, [
    screen,
    resultModus,
    priceConfirmed,
    schimmelBeratung,
    state.bereiche,
    state.situation,
    leadSubmitting,
  ]);

  /** Erklärt, warum „Absenden“ ausgegraut ist (Footer nutzt dieselbe Logik wie nextDisabled). */
  const leadFormBlockHint = useMemo(() => {
    if (screen !== "lead" || leadSubmitting) return null;
    if (!state.name.trim()) {
      return "Bitte trage oben deinen Namen ein — ohne Namen bleibt „Absenden →“ ausgegraut.";
    }
    if (!bwLeadContactOk(state.email, state.telefon)) {
      return "Bitte eine gültige E-Mail oder eine Telefonnummer (mind. 3 Zeichen) angeben — sonst bleibt der Button gesperrt.";
    }
    return null;
  }, [screen, leadSubmitting, state.name, state.email, state.telefon]);

  const showFooterNav = screen !== "danke" && screen !== "ausserhalb";

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (leadSubmitting) return;
    const invalidLead =
      !state.name.trim() || !bwLeadContactOk(state.email, state.telefon);
    if (screen === "lead" && invalidLead) return;
    setLeadSubmitError(null);
    setLeadSubmitting(true);
    const nameTrim = state.name.trim();
    const notizen = buildFullLeadNotizen(state);
    try {
      const emailTrim = state.email.trim();
      const result = await submitBwLead(
        buildBwLeadPayload({
          name: nameTrim,
          email: emailTrim || undefined,
          telefon: state.telefon.trim() || undefined,
          nachricht: notizen || undefined,
          situation: state.situation,
          bereiche: state.bereiche,
          preis_min: state.priceMin,
          preis_max: state.priceMax,
          plz: state.plz,
          zeitraum: state.zeitraum,
          kundentyp: state.kundentyp,
          funnel_daten: serializeFunnelStateForLead(state),
        })
      );
      if (!result.ok) {
        setLeadSubmitError(
          result.error ||
            "Etwas ist schiefgelaufen. Bitte versuch es nochmal oder ruf uns an."
        );
        return;
      }
      setSubmitted(true);
      setScreen("danke");
    } catch {
      setLeadSubmitError(
        "Etwas ist schiefgelaufen. Bitte versuch es nochmal oder ruf uns an."
      );
    } finally {
      setLeadSubmitting(false);
    }
  };

  const handleBeratungLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!beratungDatenschutz) {
      setBeratungDatenschutzError(true);
      return;
    }
    if (nextDisabled && screen === "beratung-lead") return;
    const nachricht = buildFullLeadNotizen(
      state,
      state.leadBeschreibung.trim() || undefined
    );
    const fd = serializeFunnelStateForLead(state) as Record<string, unknown>;
    const result = await submitBwLead(
      buildBwLeadPayload({
        vorname: state.vorname,
        nachname: state.nachname,
        email: state.email.trim() || undefined,
        telefon: state.telefon.trim() || undefined,
        nachricht: nachricht || undefined,
        situation: state.situation,
        bereiche: state.bereiche,
        preis_min: 0,
        preis_max: 0,
        plz: state.plz || "",
        zeitraum: null,
        kundentyp: isB2B(state.situation) ? undefined : state.kundentyp ?? undefined,
        funnel_daten: fd,
        extra_funnel_daten: {
          vorname: state.vorname.trim(),
          nachname: state.nachname.trim(),
          photoCount: state.photos.length,
          umfang: state.umfang,
        },
        funnel_quelle: "beratung",
      })
    );
    if (!result.ok) return;
    setSubmitted(true);
    setScreen("danke");
  };

  const handleAusserhalbLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ausserhalbDatenschutz) {
      setAusserhalbDatenschutzError(true);
      return;
    }
    if (!state.telefon.trim()) return;
    const fd = serializeFunnelStateForLead(state) as Record<string, unknown>;
    const result = await submitBwLead(
      buildBwLeadPayload({
        vorname: state.vorname,
        nachname: state.nachname,
        name: state.name.trim(),
        email: state.email.trim() || undefined,
        telefon: state.telefon.trim() || undefined,
        nachricht:
          buildFullLeadNotizen(
            state,
            ausserhalbBeschreibung.trim() || undefined
          ) || undefined,
        situation: state.situation,
        bereiche: state.bereiche,
        preis_min: 0,
        preis_max: 0,
        plz: state.plz || "",
        zeitraum: null,
        kundentyp: state.kundentyp ?? undefined,
        funnel_daten: fd,
        extra_funnel_daten: {
          vorname: state.vorname.trim(),
          nachname: state.nachname.trim(),
        },
        funnel_quelle: "ausserhalb",
      })
    );
    if (!result.ok) return;
    setIsAusserhalbLead(true);
    setSubmitted(true);
    setScreen("danke");
  };

  const renderTiles = (step: FunnelStep | null) => {
    if (!step?.options?.length) return null;
    const multi = step.inputType === "tiles-multi";
    const selectedMulti = state.bereiche;
    const selectedSingle = state.bereiche[0] ?? "";

    return (
      <div className="space-y-3">
        {step.options.map((opt) => {
          const libOpt = asLibOpt(opt);
          const funnelOpt = opt as FunnelStepOption;
          const selected = multi
            ? selectedMulti.includes(opt.value)
            : selectedSingle === opt.value;
          return (
            <Fragment key={opt.value}>
              {funnelOpt.section ? (
                <p className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-text-tertiary first:mt-0">
                  {funnelOpt.section}
                </p>
              ) : null}
              <SelectionTile
                option={libOpt}
                icon={
                  libOpt.emoji ? undefined : tileIconForStepValue(opt.value)
                }
                selected={selected}
                multi={multi}
                onChange={(value, sel) => {
                  if (sel && funnelOpt.direktKomplex) {
                    setBereiche([value]);
                    if (state.situation === "erneuern" && value === "anbau") {
                      setSchimmelBeratung(false);
                      return;
                    }
                    setSchimmelBeratung(true);
                    setScreen("beratung-lead");
                    return;
                  }
                  if (multi) {
                    toggleBereich(value);
                  } else {
                    setBereiche(sel ? [value] : []);
                  }
                }}
              />
            </Fragment>
          );
        })}
      </div>
    );
  };

  const renderUmfangTiles = () => {
    if (!stepUmfang?.options?.length) return null;

    return (
      <div className="space-y-3">
        {stepUmfang.options.map((opt) => {
          const libOpt = asLibOpt(opt);
          const selected = state.umfang === opt.value;
          return (
            <SelectionTile
              key={opt.value}
              option={libOpt}
              icon={
                libOpt.emoji ? undefined : tileIconForStepValue(opt.value)
              }
              selected={selected}
              multi={false}
              onChange={(value, sel) => {
                if (!sel) {
                  setUmfang(null, 1);
                  return;
                }
                setUmfang(value, opt.faktor ?? 1);
              }}
            />
          );
        })}
      </div>
    );
  };

  const bookingSummary = useMemo(() => {
    const s = state.selectedSlot;
    if (!s?.date || !s.time) return null;
    const d = new Date(s.date);
    if (Number.isNaN(d.getTime())) return null;
    return {
      dateLabel: d.toLocaleDateString("de-DE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      timeLabel: s.time,
    };
  }, [state.selectedSlot]);

  const main = () => {
    if (isBwFachdetailQuestionScreenId(screen)) {
      const qid = getFachdetailQuestionIdFromScreen(screen);
      if (!qid) return null;
      const fachdetailSteps = stepSequence.filter((s) =>
        isBwFachdetailQuestionScreenId(s)
      );
      const fachdetailIndex = fachdetailSteps.indexOf(screen);
      const stepIdx = fachdetailIndex >= 0 ? fachdetailIndex : 0;
      const totalSteps = fachdetailSteps.length;
      return (
        <FachdetailsStep
          questionId={qid}
          state={state}
          onPatch={setFachdetails}
          showOmitHint={state.showOmitHint ?? false}
          detailIndex={stepIdx}
          detailTotal={totalSteps}
          animateKey={`${screen}-${state.bereiche.join(",")}`}
          banner={microBannerFor(screen)}
        />
      );
    }
    switch (screen) {
      case "trust_intro":
        return <TrustScreen variant="intro" />;
      case "trust_preis":
        return <TrustScreen variant="preis" />;
      case "trust_qualitaet":
        return <TrustScreen variant="qualitaet" />;
      case "situation":
        return (
          <StepWrapper
            stepLabel="Vorhaben"
            question="Was planst du?"
            subtext="Beantworte unsere Fragen, um eine erste Preisindikation zu erhalten."
            animateKey={screen}
            tilesCard
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {BW_FUNNEL_STEP1_OPTIONS.map((opt) => {
                const active = state.situation === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSituation(opt.id)}
                    className={cn("funnel-tile", active && "selected")}
                  >
                    <span className="funnel-tile-emoji" aria-hidden>
                      {opt.emoji}
                    </span>
                    <span className="funnel-tile-label">{opt.label}</span>
                    <span className="funnel-tile-hint">{opt.hint}</span>
                  </button>
                );
              })}
            </div>
          </StepWrapper>
        );

      case "bereiche":
        return (
          <StepWrapper
            stepLabel="Vorhaben"
            question={stepBereiche?.question ?? ""}
            subtext={stepBereiche?.subtext}
            animateKey={`${screen}-${state.situation}`}
            tilesCard
          >
            {renderTiles(stepBereiche)}
          </StepWrapper>
        );

      case "zeitpunkt": {
        const zOpts = getZeitraumOptions(state.situation);
        const zFragen = getZeitraumFragen(state.situation);
        return (
          <StepWrapper
            stepLabel="Termin"
            question={zFragen.question || "Wann passt es?"}
            subtext={zFragen.hint}
            banner={microBannerFor("zeitpunkt")}
            animateKey={`${screen}-${state.situation}`}
            tilesCard
          >
            <div className="space-y-3">
              {zOpts.map((opt) => {
                const selected = state.zeitraum === opt.value;
                return (
                  <SelectionTile
                    key={opt.value}
                    option={{
                      value: opt.value,
                      label: opt.label,
                      hint: opt.hint,
                      emoji: opt.emoji,
                    }}
                    selected={selected}
                    multi={false}
                    onChange={(value, sel) => {
                      if (!sel) {
                        setZeitraum(null);
                        setDringlichkeit(null);
                        setUmfang(null, 1);
                        return;
                      }
                      const z = value as Zeitraum;
                      setZeitraum(z);
                      setUmfang(z, 1);
                      if (z === "sofort") setDringlichkeit("sofort");
                      else setDringlichkeit("diese_woche");
                    }}
                  />
                );
              })}
            </div>
          </StepWrapper>
        );
      }

      case "kundentyp":
        return (
          <StepWrapper
            stepLabel="Details"
            question={stepKundentyp?.question ?? ""}
            subtext={stepKundentyp?.subtext}
            banner={microBannerFor("kundentyp")}
            animateKey={`${screen}-${state.situation}`}
            tilesCard
          >
            <div className="space-y-3">
              {stepKundentyp?.options?.map((opt) => {
                const libOpt = asLibOpt(opt);
                const selected = state.kundentyp === opt.value;
                return (
                  <SelectionTile
                    key={opt.value}
                    option={libOpt}
                    icon={
                      libOpt.emoji ? undefined : tileIconForStepValue(opt.value)
                    }
                    selected={selected}
                    multi={false}
                    onChange={(value, sel) => {
                      setKundentyp(sel ? (value as Kundentyp) : null);
                    }}
                  />
                );
              })}
            </div>
          </StepWrapper>
        );

      case "umfang":
        return (
          <StepWrapper
            stepLabel="Umfang"
            question={stepUmfang?.question ?? ""}
            subtext={stepUmfang?.subtext}
            banner={microBannerFor("umfang")}
            animateKey={`${screen}-${state.situation}`}
            tilesCard
          >
            {renderUmfangTiles()}
          </StepWrapper>
        );

      case "zugaenglichkeit":
        return (
          <StepWrapper
            stepLabel="Umfang"
            question={stepZugaenglichkeit?.question ?? ""}
            subtext={stepZugaenglichkeit?.subtext}
            animateKey={`${screen}-${state.situation}`}
            tilesCard
          >
            <div className="space-y-3">
              {stepZugaenglichkeit?.options?.map((opt) => {
                const libOpt = asLibOpt(opt);
                const selected = state.zugaenglichkeit === opt.value;
                return (
                  <SelectionTile
                    key={opt.value}
                    option={libOpt}
                    icon={null}
                    selected={selected}
                    multi={false}
                    onChange={(value, sel) => {
                      setZugaenglichkeit(
                        sel ? (value as Zugaenglichkeit) : null
                      );
                    }}
                  />
                );
              })}
            </div>
            <p className="mt-3 text-center text-[12px] leading-snug text-text-tertiary">
              {BW_FUNNEL_PREIS_HINWEIS_ZUG_ZUSTAND}
            </p>
          </StepWrapper>
        );

      case "zustand":
        return (
          <StepWrapper
            stepLabel="Umfang"
            question={stepZustand?.question ?? ""}
            subtext={stepZustand?.subtext}
            animateKey={`${screen}-${state.situation}`}
            tilesCard
          >
            <div className="space-y-3">
              {stepZustand?.options?.map((opt) => {
                const libOpt = asLibOpt(opt);
                const selected = state.zustand === opt.value;
                return (
                  <SelectionTile
                    key={opt.value}
                    option={libOpt}
                    icon={null}
                    selected={selected}
                    multi={false}
                    onChange={(value, sel) => {
                      setZustand(sel ? (value as ObjektZustand) : null);
                    }}
                  />
                );
              })}
            </div>
            <p className="mt-3 text-center text-[12px] leading-snug text-text-tertiary">
              {BW_FUNNEL_PREIS_HINWEIS_ZUG_ZUSTAND}
            </p>
          </StepWrapper>
        );

      case "projekt_terrasse_material":
      case "projekt_terrasse_unterbau":
      case "projekt_durchbruch_anzahl":
      case "projekt_durchbruch_statik":
      case "projekt_garten_leistung":
      case "projekt_garten_zaun":
      case "projekt_garten_zugang":
      case "projekt_ausbau_rohbau":
      case "projekt_ausbau_deckenhoehe": {
        const def = resolvedSteps.find((s) => s.id === screen);
        if (!def?.options?.length) return null;
        const pj = state.fachdetails?.projekt;
        return (
          <StepWrapper
            stepLabel="Ausbau & Umbau"
            question={def.question}
            subtext={def.subtext}
            animateKey={`${screen}-${state.bereiche.join(",")}`}
            tilesCard
          >
            <div className="space-y-3">
              {def.options.map((opt) => {
                const libOpt = asLibOpt(opt);
                let selected = false;
                if (screen === "projekt_terrasse_material") {
                  selected = pj?.terrasseMaterial === opt.value;
                } else if (screen === "projekt_terrasse_unterbau") {
                  selected = pj?.terrasseUnterbau === opt.value;
                } else if (screen === "projekt_garten_leistung") {
                  selected = pj?.gartenLeistung === opt.value;
                } else if (screen === "projekt_garten_zaun") {
                  selected = pj?.gartenZaun === opt.value;
                } else if (screen === "projekt_garten_zugang") {
                  selected = pj?.gartenZugaenglichkeit === opt.value;
                } else if (screen === "projekt_ausbau_rohbau") {
                  selected = pj?.ausbauRohbau === opt.value;
                } else if (screen === "projekt_ausbau_deckenhoehe") {
                  selected = pj?.ausbauDeckenhoehe === opt.value;
                } else if (screen === "projekt_durchbruch_anzahl") {
                  const n = pj?.durchbruchAnzahl;
                  if (opt.value === "1") selected = n === 1;
                  else if (opt.value === "2") selected = n === 2;
                  else if (opt.value === "3_plus") selected = n === 3;
                } else {
                  selected =
                    opt.value === "tragend"
                      ? pj?.durchbruchTragend === true
                      : pj?.durchbruchTragend === false;
                }
                return (
                  <SelectionTile
                    key={opt.value}
                    option={libOpt}
                    icon={
                      libOpt.emoji ? undefined : tileIconForStepValue(opt.value)
                    }
                    selected={selected}
                    multi={false}
                    onChange={(value, sel) => {
                      if (screen === "projekt_terrasse_material") {
                        setFachdetails({
                          projekt: {
                            ...state.fachdetails.projekt,
                            terrasseMaterial: sel
                              ? (value as "holz" | "stein")
                              : undefined,
                          },
                        });
                      } else if (screen === "projekt_terrasse_unterbau") {
                        setFachdetails({
                          projekt: {
                            ...state.fachdetails.projekt,
                            terrasseUnterbau: sel
                              ? (value as "ja" | "nein")
                              : undefined,
                          },
                        });
                      } else if (screen === "projekt_garten_leistung") {
                        setFachdetails({
                          projekt: {
                            ...state.fachdetails.projekt,
                            gartenLeistung: sel
                              ? (value as "auffrischung" | "neuanlage")
                              : undefined,
                          },
                        });
                      } else if (screen === "projekt_garten_zaun") {
                        setFachdetails({
                          projekt: {
                            ...state.fachdetails.projekt,
                            gartenZaun: sel
                              ? (value as "ja" | "nein")
                              : undefined,
                          },
                        });
                      } else if (screen === "projekt_garten_zugang") {
                        setFachdetails({
                          projekt: {
                            ...state.fachdetails.projekt,
                            gartenZugaenglichkeit: sel
                              ? (value as "einfach" | "schwer")
                              : undefined,
                          },
                        });
                      } else if (screen === "projekt_ausbau_rohbau") {
                        setFachdetails({
                          projekt: {
                            ...state.fachdetails.projekt,
                            ausbauRohbau: sel
                              ? (value as "ja" | "nein")
                              : undefined,
                            ausbauDeckenhoehe: undefined,
                          },
                        });
                      } else if (screen === "projekt_ausbau_deckenhoehe") {
                        setFachdetails({
                          projekt: {
                            ...state.fachdetails.projekt,
                            ausbauDeckenhoehe: sel
                              ? (value as "niedrig" | "mittel" | "hoch")
                              : undefined,
                          },
                        });
                      } else if (screen === "projekt_durchbruch_anzahl") {
                        const raw = def.options?.find((o) => o.value === value);
                        const g =
                          typeof raw?.groesse === "number" ? raw.groesse : 1;
                        setFachdetails({
                          projekt: {
                            ...state.fachdetails.projekt,
                            durchbruchAnzahl: sel ? g : undefined,
                          },
                        });
                      } else {
                        setFachdetails({
                          projekt: {
                            ...state.fachdetails.projekt,
                            durchbruchTragend: sel
                              ? value === "tragend"
                              : undefined,
                          },
                        });
                      }
                    }}
                  />
                );
              })}
            </div>
          </StepWrapper>
        );
      }

      case "groesse":
        return groesseSliderConfig ? (
          <StepWrapper
            stepLabel="Umfang"
            question={stepGroesse?.question ?? ""}
            subtext={stepGroesse?.subtext}
            animateKey={`${screen}-${state.situation}-${state.bereiche.join(",")}`}
          >
            <GroesseStep
              config={groesseSliderConfig}
              groesse={state.groesse}
              onGroesseChange={(n) =>
                setGroesse(n, groesseEinheitFromConfig(groesseSliderConfig))
              }
            />
          </StepWrapper>
        ) : null;

      case "bad_ausstattung":
        return (
          <StepWrapper
            stepLabel="Bad"
            question={BW_FUNNEL_STEP_BAD_AUSSTATTUNG.question}
            subtext={BW_FUNNEL_STEP_BAD_AUSSTATTUNG.subtext}
            animateKey={`${screen}-${state.situation}`}
            tilesCard
          >
            <div className="space-y-3">
              {BW_FUNNEL_STEP_BAD_AUSSTATTUNG.options?.map((opt) => {
                const libOpt = asLibOpt(opt);
                const selected = (state.badAusstattung ?? null) === opt.value;
                return (
                  <SelectionTile
                    key={opt.value}
                    option={libOpt}
                    icon={
                      libOpt.emoji ? undefined : tileIconForStepValue(opt.value)
                    }
                    selected={selected}
                    multi={false}
                    onChange={(value, sel) => {
                      setBadAusstattung(
                        sel
                          ? (value as "standard" | "komfort" | "gehoben")
                          : null
                      );
                    }}
                  />
                );
              })}
            </div>
          </StepWrapper>
        );

      case "ort":
        return (
          <StepWrapper
            stepLabel="Fast fertig"
            question="Wo ist dein Projekt?"
            subtext="Wir arbeiten in München und Umgebung"
            banner={microBannerFor("ort")}
            animateKey={screen}
          >
            <PlzStep
              situation={state.situation}
              plz={state.plz}
              zeitraum={state.zeitraum ?? ""}
              onPlzChange={setPlz}
              onZeitraumChange={(z) => setZeitraum(z as Zeitraum)}
              onAusserhalbAnfrage={() => setScreen("ausserhalb")}
            />
          </StepWrapper>
        );

      case "loading":
        return (
          <StepWrapper animateKey="loading">
            <LoadingScreen
              situation={state.situation}
              onComplete={() => setScreen("result")}
            />
          </StepWrapper>
        );

      case "result":
        return (
          <StepWrapper stepLabel="Ergebnis" animateKey="result">
            <BwResultScreen
              state={state}
              mindestauftragAktiv={mindestauftragAktiv}
              resultModus={resultModus}
              schwellenwertAusgeloest={schwellenwertAusgeloest}
              onKomplexRueckrufSuccess={() => {
                setKomplexRueckrufDanke(true);
                setSubmitted(true);
                setScreen("danke");
              }}
              onReset={handleReset}
            />
          </StepWrapper>
        );

      case "beratung-lead":
        if (state.situation && isB2B(state.situation)) {
          return (
            <BwBeratungLead
              kind="b2b"
              situation={state.situation}
              vorname={state.vorname}
              nachname={state.nachname}
              telefon={state.telefon}
              email={state.email}
              beschreibung={state.leadBeschreibung}
              datenschutz={beratungDatenschutz}
              datenschutzError={beratungDatenschutzError}
              onDatenschutzChange={(v) => {
                setBeratungDatenschutz(v);
                if (v) setBeratungDatenschutzError(false);
              }}
              onFieldChange={updateLeadField}
              formId={BERATUNG_LEAD_FORM_ID}
              onSubmit={handleBeratungLeadSubmit}
            />
          );
        }
        if (
          schimmelBeratung ||
          state.bereiche.includes("schimmel")
        ) {
          return (
            <BwBeratungLead
              kind="schimmel"
              situation={state.situation}
              vorname={state.vorname}
              nachname={state.nachname}
              telefon={state.telefon}
              email={state.email}
              beschreibung={state.leadBeschreibung}
              datenschutz={beratungDatenschutz}
              datenschutzError={beratungDatenschutzError}
              onDatenschutzChange={(v) => {
                setBeratungDatenschutz(v);
                if (v) setBeratungDatenschutzError(false);
              }}
              onFieldChange={updateLeadField}
              formId={BERATUNG_LEAD_FORM_ID}
              onSubmit={handleBeratungLeadSubmit}
            />
          );
        }
        return null;

      case "lead":
        return (
          <StepWrapper
            stepLabel="Ergebnis"
            question="Fast geschafft"
            subtext="Optional Fotos, Terminwunsch — wir melden uns."
            animateKey="lead"
          >
            <LeadAvailabilityHint className="mb-4" />
            {leadFormBlockHint ? (
              <p
                className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
                role="status"
              >
                {leadFormBlockHint}
              </p>
            ) : null}
            <div className="funnel-step-tiles-card">
              {leadSubmitError ? (
                <p
                  className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
                  role="alert"
                >
                  {leadSubmitError}
                </p>
              ) : null}
              <HWLeadForm
                photos={state.photos}
                onPhotosChange={addPhotos}
                selectedSlot={
                  state.selectedSlot
                    ? {
                        dateISO: state.selectedSlot.date,
                        time: state.selectedSlot.time,
                      }
                    : null
                }
                onSlotSelect={(date, time) => {
                  setSlot(date.toISOString(), time);
                }}
                name={state.name}
                email={state.email}
                telefon={state.telefon}
                onFieldChange={(field, value) => updateLeadField(field, value)}
                formId={LEAD_FORM_ID}
                onSubmit={handleLeadSubmit}
              />
            </div>
          </StepWrapper>
        );

      case "ausserhalb":
        return (
          <StepWrapper
            stepLabel="Anfrage"
            question="Wir melden uns bei dir."
            subtext={`Unser Einsatzgebiet ist aktuell München und Umgebung bis ca. 50 km. Hinterlasse deine Kontaktdaten — wir schauen was wir für dich tun können.`}
            animateKey="ausserhalb"
          >
            <div className="funnel-step-tiles-card">
            <form
              onSubmit={handleAusserhalbLeadSubmit}
              className="space-y-3"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  inputMode="text"
                  autoComplete="given-name"
                  autoCapitalize="words"
                  className="funnel-input"
                  placeholder="Vorname"
                  value={state.vorname}
                  onChange={(e) => updateLeadField("vorname", e.target.value)}
                />
                <input
                  type="text"
                  inputMode="text"
                  autoComplete="family-name"
                  autoCapitalize="words"
                  className="funnel-input"
                  placeholder="Nachname"
                  value={state.nachname}
                  onChange={(e) => updateLeadField("nachname", e.target.value)}
                />
              </div>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                className="funnel-input"
                placeholder="+49 151 23456789"
                value={state.telefon}
                onChange={(e) => updateLeadField("telefon", e.target.value)}
              />
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                className="funnel-input"
                placeholder="E-Mail"
                value={state.email}
                onChange={(e) => updateLeadField("email", e.target.value)}
              />
              <input
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                className="funnel-input max-w-[180px]"
                placeholder="PLZ"
                value={state.plz}
                readOnly
              />
              <textarea
                autoCapitalize="sentences"
                autoCorrect="on"
                className="funnel-textarea resize-y"
                placeholder="Kurze Beschreibung deines Vorhabens (optional)"
                rows={3}
                value={ausserhalbBeschreibung}
                onChange={(e) => setAusserhalbBeschreibung(e.target.value)}
              />
              <DatenschutzCheckbox
                checked={ausserhalbDatenschutz}
                onChange={(v) => {
                  setAusserhalbDatenschutz(v);
                  if (v) setAusserhalbDatenschutzError(false);
                }}
                showError={ausserhalbDatenschutzError}
              />
              <button
                type="submit"
                disabled={!state.telefon.trim() || !ausserhalbDatenschutz}
                className="w-full rounded-full bg-funnel-accent px-6 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
              >
                Anfrage senden →
              </button>
              <p className="text-center text-[11px] leading-relaxed text-text-tertiary">
                Wir melden uns innerhalb von 48h — ohne Verpflichtung.
              </p>
            </form>
            </div>
          </StepWrapper>
        );

      case "danke":
        if (komplexRueckrufDanke) {
          return (
            <ThankYou
              variant="beratung"
              beratungHeadline="Wir melden uns persönlich."
              beratungSubline="Wir rufen dich innerhalb von 48h zurück — ohne Verpflichtung."
              showTimeline={false}
              onReset={handleReset}
            />
          );
        }
        if (isAusserhalbLead) {
          return (
            <ThankYou
              variant="beratung"
              beratungHeadline="Anfrage eingegangen"
              beratungSubline="Wir prüfen ob wir in deiner Region helfen können und melden uns innerhalb von 48h persönlich."
              onReset={handleReset}
            />
          );
        }
        if (isB2B(state.situation)) {
          return (
            <ThankYou
              variant="beratung"
              beratungHeadline="Anfrage eingegangen."
              beratungSubline="Wir melden uns innerhalb von 48h persönlich bei dir — ohne Verpflichtung."
              showTimeline={false}
              showCalendar={false}
              onReset={handleReset}
            />
          );
        }
        return (
          <ThankYou
            variant={bookingSummary ? "termin" : "anfrage"}
            dateLabel={bookingSummary?.dateLabel}
            timeLabel={bookingSummary?.timeLabel}
            onReset={handleReset}
          />
        );

      default:
        return null;
    }
  };

  const progressStep = getBwFunnelProgressStep(screen);

  return (
    <div
      className={cn(
        "min-h-dvh funnel-main--strip-a",
        isBwTrustScreenId(screen) && "trust-screen-active"
      )}
    >
      {searchNotFoundBanner ? (
        <div
          className="border-b border-border-default bg-surface-card px-4 py-3 text-center text-sm text-text-secondary"
          role="status"
        >
          <span>
            Zu deiner Eingabe gibt es keinen festen Eintrag — du startest hier
            regulär im Rechner.
          </span>
          <button
            type="button"
            className="ml-3 font-medium text-funnel-accent underline decoration-funnel-accent/40 underline-offset-2 hover:opacity-90"
            onClick={() => setSearchNotFoundBanner(false)}
          >
            OK
          </button>
        </div>
      ) : null}
      <FunnelHeader onFunnelReset={handleReset} />
      <FunnelProgressBar
        currentStep={progressStep}
        situation={state.situation}
        activeScreen={screen}
      />
      <main className="funnel-rechner-main w-full">{main()}</main>
      {showFooterNav ? (
        <FunnelFooter
          onNext={
            screen === "result" && isBwZuKomplexErgebnis(state, resultModus)
              ? undefined
              : handleNext
          }
          onBack={() => {
            if (screen === "situation") {
              const prevSit = getPreviousBwRechnerScreen(state, "situation");
              if (prevSit) {
                setScreen(prevSit as Screen);
                return;
              }
              router.push("/");
              return;
            }
            handleBack();
          }}
          nextDisabled={nextDisabled}
          nextLabel={nextLabel}
          belowActions={
            screen === "beratung-lead" ? (
              <p className="text-center text-xs text-text-tertiary">
                Wir melden uns innerhalb von 48h
              </p>
            ) : screen === "result" && resultModus === "preisrahmen_warnung" ? (
              <p
                className="text-xs text-text-tertiary text-center"
                style={{ marginTop: "8px" }}
              >
                Wir erstellen dir nach dem Termin ein verbindliches
                Festpreisangebot.
              </p>
            ) : null
          }
        />
      ) : null}
    </div>
  );
}

export default function RechnerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background" aria-label="Laden" />
      }
    >
      <FunnelErrorBoundary>
        <FunnelRechnerInner />
      </FunnelErrorBoundary>
    </Suspense>
  );
}
