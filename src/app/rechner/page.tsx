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
} from "@/lib/funnel/config";
import {
  firstFachdetailsScreenId,
  getBwRechnerScreenSequence,
  getNextBwRechnerScreen,
  getPreviousBwRechnerScreen,
  getBwFachdetailGewerkFromScreen,
  isBwFachdetailScreenId,
  type FachdetailsScreenId,
} from "@/lib/funnel/bw-rechner-sequence";
import { isFachdetailGewerkChainComplete } from "@/lib/funnel/fachdetails-chain-complete";
import { getAktiveFachdetailGewerke } from "@/lib/funnel/fachdetails-notfall";
import { getBwFunnelProgressStep } from "@/lib/funnel/bw-funnel-progress";
import {
  BW_FUNNEL_STEP1_OPTIONS,
  BW_FUNNEL_STEP1_ORDER,
} from "@/lib/situation-options";
import {
  calculatePrice,
  getBwResultModus,
} from "@/lib/funnel/price-calc";
import type { BwResultModus } from "@/lib/funnel/price-calc";
import { getPlzStatus } from "@/lib/funnel/plz";
import type {
  FunnelStep,
  Kundentyp,
  ObjektZustand,
  Situation,
  StepOption as FunnelStepOption,
  Zeitraum,
  Zugaenglichkeit,
} from "@/lib/funnel/types";
import { isB2B } from "@/lib/funnel/types";
import { isBwTrustScreenId } from "@/lib/funnel/types";
import { tileIconForStepValue } from "@/lib/funnel-tile-icons";
import type { StepOption as LibStepOption } from "@/lib/types";
import { cn } from "@/lib/utils";

const LEAD_FORM_ID = "bw-funnel-lead";
const BERATUNG_LEAD_FORM_ID = "bw-beratung-lead";

type Screen =
  | "trust_intro"
  | "trust_preis"
  | "trust_qualitaet"
  | "situation"
  | "bereiche"
  | FachdetailsScreenId
  | "kundentyp"
  | "umfang"
  | "zugaenglichkeit"
  | "zustand"
  | "groesse"
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

const BW_TAG_CLASS: Record<"multi" | "abo" | "notfall", string> = {
  multi: "bg-blue-50 text-blue-800",
  abo: "bg-green-50 text-green-800",
  notfall: "bg-amber-50 text-amber-900",
};

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
  /** Nach erstem „Preis berechnen“: auf „ort“ wieder „Weiter →“ (Footer rendert zuverlässig). */
  const [priceConfirmed, setPriceConfirmed] = useState(false);
  const [microNote, setMicroNote] = useState<{
    target: Screen;
    text: string;
  } | null>(null);
  /** Pro Fachdetail-Screen: letzter bekannter Vollständigkeitszustand (für Auto-Weiter ohne Skip beim Zurück). */
  const fachdetailVisitRef = useRef<{
    id: string;
    wasComplete: boolean;
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
      state.fachdetails?.heizung?.vorhaben,
      state.fachdetails?.garten?.baumgroesse,
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
          s.id === "notfall_dringlichkeit" ||
          s.id === "betreuung_haeufigkeit" ||
          s.id === "neubauen_planung"
      ) ?? null,
    [resolvedSteps]
  );
  const stepZugaenglichkeit = useMemo(() => {
    if (state.situation === "notfall") return null;
    if (state.situation === "gewerbe" || state.situation === "gastro")
      return null;
    if (zuKomplexForSteps) return null;
    return resolvedSteps.find((s) => s.id === "zugaenglichkeit") ?? null;
  }, [resolvedSteps, state.situation, zuKomplexForSteps]);

  const stepZustand = useMemo(() => {
    if (state.situation === "notfall") return null;
    if (state.situation === "gewerbe" || state.situation === "gastro")
      return null;
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
    [state.situation, state.bereiche]
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
    state.situation === "notfall"
      ? Boolean(state.dringlichkeit)
      : Boolean(state.umfang);

  /** Screen-Reihenfolge (ohne loading/result/lead) — stabil, damit handleBack & Fachdetail „X von Y“ konsistent bleiben. */
  const stepSequence = useMemo(
    () => getBwRechnerScreenSequence(state),
    [
      state.situation,
      state.bereiche,
      state.umfang,
      state.dringlichkeit,
      state.groesse,
      state.badAusstattung ?? null,
      state.fachdetails,
    ]
  );

  useEffect(() => {
    if (urlInit.current) return;
    let raw = searchParams.get("situation");
    if (raw === "renovieren" || raw === "sanieren") {
      raw = "erneuern";
    }
    if (raw && isSituation(raw)) {
      setSituation(raw);
      setPriceConfirmed(false);
      if (raw === "gewerbe" || raw === "gastro") {
        setScreen("beratung-lead");
      } else {
        setScreen("bereiche");
      }
    }
    urlInit.current = true;
  }, [searchParams, setSituation]);

  useEffect(() => {
    if (isBwTrustScreenId(screen) && !stepSequence.includes(screen)) {
      setScreen((stepSequence[0] ?? "situation") as Screen);
    }
  }, [screen, stepSequence]);

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
    const firstFd = firstFachdetailsScreenId(state.bereiche);
    if (firstFd) setScreen(firstFd);
    else if (hasKundentypStep) setScreen("kundentyp");
    else setScreen("ort");
  }, [hasBadAusstattungStep, hasKundentypStep, state.bereiche]);

  const goGroesseOrPostGroesse = useCallback(() => {
    if (hasGroesseStep) setScreen("groesse");
    else goPostGroesseChain();
  }, [hasGroesseStep, goPostGroesseChain]);

  const goAfterZugaenglichkeit = useCallback(() => {
    if (stepZustand) setScreen("zustand");
    else goGroesseOrPostGroesse();
  }, [stepZustand, goGroesseOrPostGroesse]);

  const goAfterZustandScreen = useCallback(() => {
    if (fachdetailsBeforeGroesse && hasFachdetailsStep) {
      const firstFd = firstFachdetailsScreenId(state.bereiche);
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
    state.bereiche,
  ]);

  const goNextFromCompletedFachdetailScreen = useCallback(
    (fromScreen: Screen) => {
      const g = getBwFachdetailGewerkFromScreen(fromScreen);
      if (!g) return;
      if (
        !isFachdetailGewerkChainComplete(
          state.bereiche,
          state.situation === "notfall",
          state.fachdetails,
          g,
          state.situation
        )
      ) {
        return;
      }
      const next = getNextBwRechnerScreen(state, fromScreen);
      if (!next) return;
      if (next === "groesse" && fachdetailsBeforeGroesse && hasGroesseStep) {
        setMicroNote({
          target: "groesse",
          text: "Fast geschafft — noch Größe bzw. Fläche angeben",
        });
      }
      setScreen(next as Screen);
    },
    [
      state.bereiche,
      state.situation,
      state.fachdetails,
      fachdetailsBeforeGroesse,
      hasGroesseStep,
    ]
  );

  const handleReset = useCallback(() => {
    const prevSit = state.situation;
    fachdetailVisitRef.current = null;
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

    const first: Screen =
      prevSit === "notfall" ||
      prevSit === "gewerbe" ||
      prevSit === "gastro"
        ? "situation"
        : "trust_intro";
    setScreen(first);

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant" as ScrollBehavior,
    });
  }, [reset, setSubmitted, state.situation]);

  const handleNext = useCallback(() => {
    const fachGewerk = getBwFachdetailGewerkFromScreen(screen);
    if (fachGewerk) {
      if (
        !isFachdetailGewerkChainComplete(
          state.bereiche,
          state.situation === "notfall",
          state.fachdetails,
          fachGewerk
        )
      ) {
        return;
      }
      goNextFromCompletedFachdetailScreen(screen);
      return;
    }

    if (isBwTrustScreenId(screen)) {
      const nextTrust = getNextBwRechnerScreen(state, screen);
      if (nextTrust) setScreen(nextTrust as Screen);
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
        if (state.kundentyp) setScreen("ort");
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
          if (hasBadAusstattungStep) {
            setScreen("bad_ausstattung");
          } else if (fachdetailsBeforeGroesse) {
            if (hasKundentypStep) setScreen("kundentyp");
            else setScreen("ort");
          } else if (hasFachdetailsStep) {
            const firstFd = firstFachdetailsScreenId(state.bereiche);
            if (firstFd) setScreen(firstFd);
            else if (hasKundentypStep) setScreen("kundentyp");
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
          if (fachdetailsBeforeGroesse) {
            if (hasKundentypStep) setScreen("kundentyp");
            else setScreen("ort");
          } else if (hasFachdetailsStep) {
            const firstFd = firstFachdetailsScreenId(state.bereiche);
            if (firstFd) setScreen(firstFd);
            else if (hasKundentypStep) setScreen("kundentyp");
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
        } = calculatePrice(state);
        setPrice(min, max, breakdown, istFallback);
        setMindestauftrag(mindestauftragAktiv);
        setResultModus(rm);
        setSchwellenwertAusgeloest(swa);
        setPriceConfirmed(true);
        setScreen("loading");
        break;
      }
      case "result":
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
  ]);

  useEffect(() => {
    if (!isBwFachdetailScreenId(screen)) {
      fachdetailVisitRef.current = null;
      return;
    }
    const g = getBwFachdetailGewerkFromScreen(screen);
    if (!g) return;
    const complete = isFachdetailGewerkChainComplete(
      state.bereiche,
      state.situation === "notfall",
      state.fachdetails,
      g,
      state.situation
    );
    const visit = fachdetailVisitRef.current;
    if (!visit || visit.id !== screen) {
      fachdetailVisitRef.current = { id: screen, wasComplete: complete };
      return;
    }
    if (complete && !visit.wasComplete) {
      goNextFromCompletedFachdetailScreen(screen);
      fachdetailVisitRef.current = { id: screen, wasComplete: true };
      return;
    }
    fachdetailVisitRef.current = { id: screen, wasComplete: complete };
  }, [
    screen,
    state.bereiche,
    state.situation,
    state.fachdetails,
    goNextFromCompletedFachdetailScreen,
  ]);

  const handleBack = useCallback(() => {
    const steps = stepSequence;
    const currentIndex = steps.indexOf(screen);
    if (currentIndex > 0) {
      const prevStep = steps[currentIndex - 1]!;
      setScreen(prevStep as Screen);
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant" as ScrollBehavior,
      });
      return;
    }
    if (currentIndex < 0 && isBwFachdetailScreenId(screen)) {
      const g = getBwFachdetailGewerkFromScreen(screen);
      if (g) {
        const order = getAktiveFachdetailGewerke(state.bereiche, 2);
        const gi = order.indexOf(g);
        if (gi > 0) {
          const prevId = `fachdetails_${order[gi - 1]!}` as Screen;
          if (steps.includes(prevId)) {
            setScreen(prevId);
            window.scrollTo({
              top: 0,
              left: 0,
              behavior: "instant" as ScrollBehavior,
            });
            return;
          }
        }
        const firstFdIdx = steps.findIndex((s) => isBwFachdetailScreenId(s));
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
    }
    switch (screen) {
      case "loading":
        setPriceConfirmed(true);
        setScreen("ort");
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: "instant" as ScrollBehavior,
        });
        break;
      case "result":
        setPriceConfirmed(true);
        setScreen("ort");
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
  }, [screen, state, stepSequence]);

  const nextDisabled = useMemo(() => {
    if (isBwFachdetailScreenId(screen)) {
      const g = getBwFachdetailGewerkFromScreen(screen);
      if (!g) return true;
      return !isFachdetailGewerkChainComplete(
        state.bereiche,
        state.situation === "notfall",
        state.fachdetails,
        g,
        state.situation
      );
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
      case "umfang":
        return !umfangOk;
      case "zugaenglichkeit":
        return !state.zugaenglichkeit;
      case "zustand":
        return !state.zustand;
      case "groesse":
        return state.groesse == null;
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
        return false;
      case "lead":
        return (
          !state.name.trim() ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim()) ||
          state.telefon.trim().length < 5
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
  }, [screen, state, umfangOk, schimmelBeratung]);

  const nextLabel = useMemo(() => {
    if (screen === "trust_intro") return "Los geht's →";
    if (screen === "ort") {
      return priceConfirmed ? "Weiter →" : "Preis berechnen";
    }
    if (screen === "lead") return "Absenden →";
    if (screen === "beratung-lead") return "Rückruf anfordern →";
    if (screen === "result" && resultModus === "preisrahmen_warnung")
      return "Vor-Ort-Termin anfragen →";
    return "Weiter →";
  }, [screen, resultModus, priceConfirmed]);

  const showFooterNav = screen !== "danke" && screen !== "ausserhalb";

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nextDisabled && screen === "lead") return;
    const nameTrim = state.name.trim();
    const body = {
      name: nameTrim,
      vorname: nameTrim.split(/\s+/)[0] ?? "",
      email: state.email.trim(),
      telefon: state.telefon.trim(),
      situation: state.situation,
      bereiche: state.bereiche,
      priceMin: state.priceMin,
      priceMax: state.priceMax,
      breakdown: state.breakdown,
      plz: state.plz,
      zeitraum: state.zeitraum,
      budgetCheck: state.budgetCheck,
      budgetGespraech: state.budgetCheck === "zu_hoch",
      selectedSlot: state.selectedSlot,
      photoCount: state.photos.length,
      dringlichkeit: state.dringlichkeit,
      umfang: state.umfang,
      kundentyp: state.kundentyp ?? "nicht angegeben",
      leadType: "system" as const,
    };
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { success?: boolean };
    if (!res.ok || !data.success) return;
    setSubmitted(true);
    setScreen("danke");
  };

  const handleBeratungLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!beratungDatenschutz) {
      setBeratungDatenschutzError(true);
      return;
    }
    if (nextDisabled && screen === "beratung-lead") return;
    const name = `${state.vorname} ${state.nachname}`.trim();
    const body = {
      name,
      vorname: state.vorname.trim(),
      email: state.email.trim(),
      telefon: state.telefon.trim(),
      situation: state.situation,
      bereiche: state.bereiche,
      beschreibung: state.leadBeschreibung.trim(),
      photoCount: state.photos.length,
      kundentyp: isB2B(state.situation)
        ? (state.situation ?? "b2b")
        : (state.kundentyp ?? "nicht angegeben"),
      leadType: "beratung" as const,
      priceMin: 0,
      priceMax: 0,
      plz: state.plz || "",
      zeitraum: null,
      budgetCheck: null,
      budgetGespraech: false,
      selectedSlot: null,
      dringlichkeit: null,
      umfang: null,
    };
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { success?: boolean };
    if (!res.ok || !data.success) return;
    setSubmitted(true);
    setScreen("danke");
  };

  const handleAusserhalbLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ausserhalbDatenschutz) {
      setAusserhalbDatenschutzError(true);
      return;
    }
    const name = `${state.vorname} ${state.nachname}`.trim();
    if (!state.telefon.trim()) return;
    const body = {
      name: name || state.name.trim(),
      vorname: state.vorname.trim(),
      email: state.email.trim(),
      telefon: state.telefon.trim(),
      situation: state.situation,
      bereiche: state.bereiche,
      beschreibung: ausserhalbBeschreibung.trim(),
      plz: state.plz || "",
      zeitraum: null,
      budgetCheck: null,
      budgetGespraech: false,
      selectedSlot: null,
      dringlichkeit: null,
      umfang: null,
      priceMin: 0,
      priceMax: 0,
      photoCount: 0,
      kundentyp: state.kundentyp ?? "nicht angegeben",
      leadType: "ausserhalb" as const,
    };
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { success?: boolean };
    if (!res.ok || !data.success) return;
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
                  if (multi && sel && funnelOpt.direktKomplex) {
                    setBereiche([value]);
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
    if (state.situation === "notfall") {
      return (
        <div className="space-y-3">
          {stepUmfang.options.map((opt) => {
            const libOpt = asLibOpt(opt);
            const selected = state.dringlichkeit === opt.value;
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
                    setDringlichkeit(null);
                    setUmfang(null, 1);
                    return;
                  }
                  setDringlichkeit(
                    value as "akut" | "stabil" | "nutzbar" | "keine_eile"
                  );
                  setUmfang(value, opt.faktor ?? 1);
                }}
              />
            );
          })}
        </div>
      );
    }
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
    if (isBwFachdetailScreenId(screen)) {
      const g = getBwFachdetailGewerkFromScreen(screen);
      if (!g) return null;
      const fachdetailSteps = stepSequence.filter((s) =>
        s.startsWith("fachdetails_")
      );
      const fachdetailIndex = fachdetailSteps.indexOf(screen);
      const gewerkIndex = fachdetailIndex >= 0 ? fachdetailIndex : 0;
      const totalGewerke = fachdetailSteps.length;
      return (
        <StepWrapper
          stepLabel="Details"
          animateKey={`${screen}-${state.bereiche.join(",")}`}
          banner={microBannerFor(screen)}
        >
          <FachdetailsStep
            gewerk={g}
            totalGewerke={totalGewerke}
            gewerkIndex={gewerkIndex}
            isLastFachdetailScreen={
              totalGewerke > 0 && gewerkIndex === totalGewerke - 1
            }
            showOmitHint={state.showOmitHint ?? false}
            state={state}
            onChange={setFachdetails}
          />
        </StepWrapper>
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
                const tagType = opt.tagType;
                const tagClass = tagType ? BW_TAG_CLASS[tagType] : "";
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSituation(opt.id)}
                    className={cn(
                      "funnel-tile",
                      active && "selected",
                      opt.highlight && "funnel-tile--notfall-highlight"
                    )}
                  >
                    <span className="funnel-tile-emoji" aria-hidden>
                      {opt.emoji}
                    </span>
                    <span className="funnel-tile-label">{opt.label}</span>
                    <span className="funnel-tile-hint">{opt.hint}</span>
                    {opt.tag && tagType ? (
                      <span
                        className={cn(
                          "mt-1.5 inline-block rounded-lg px-2 py-0.5 text-[10px] font-medium",
                          tagClass
                        )}
                      >
                        {opt.tag}
                      </span>
                    ) : null}
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

      case "kundentyp":
        return (
          <StepWrapper
            stepLabel="Details"
            question={stepKundentyp?.question ?? ""}
            subtext={stepKundentyp?.subtext}
            banner={microBannerFor("kundentyp")}
            animateKey={`${screen}-${state.situation}`}
          >
            <div className="funnel-step-tiles-card space-y-3">
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

      case "groesse":
        return groesseSliderConfig ? (
          <StepWrapper
            stepLabel="Umfang"
            question={stepGroesse?.question ?? ""}
            subtext={stepGroesse?.subtext}
            animateKey={`${screen}-${state.situation}-${state.bereiche.join(",")}`}
            tilesCard
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
            <div className="funnel-step-tiles-card">
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
              beratungSubline="Wir rufen dich innerhalb von 24h zurück — ohne Verpflichtung."
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
          const gastro = state.situation === "gastro";
          return (
            <ThankYou
              variant="beratung"
              beratungHeadline="Anfrage eingegangen."
              beratungSubline={
                gastro
                  ? "Gastro-Projekte planen wir persönlich. Wir melden uns innerhalb von 24h."
                  : "Wir melden uns innerhalb von 24h persönlich bei dir — ohne Verpflichtung."
              }
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
      <FunnelHeader onFunnelReset={handleReset} />
      <FunnelProgressBar
        currentStep={progressStep}
        situation={state.situation}
        activeScreen={screen}
      />
      <main className="funnel-rechner-main w-full">{main()}</main>
      {showFooterNav ? (
        <FunnelFooter
          onNext={handleNext}
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
                Wir melden uns innerhalb von 24h
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
