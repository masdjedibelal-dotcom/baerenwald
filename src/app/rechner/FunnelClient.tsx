"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { ProgressBar } from "@/components/layout/ProgressBar";
import { CalendarPicker } from "@/components/funnel/CalendarPicker";
import { ChipSelector } from "@/components/funnel/ChipSelector";
import { ExtraQuestion } from "@/components/funnel/ExtraQuestion";
import { LeadForm } from "@/components/funnel/LeadForm";
import { LoadingScreen } from "@/components/funnel/LoadingScreen";
import { PhotoUpload } from "@/components/funnel/PhotoUpload";
import {
  LeadAvailabilityHint,
  ResultScreen,
} from "@/components/funnel/ResultScreen";
import { SelectionTile } from "@/components/funnel/SelectionTile";
import { SituationStep } from "@/components/funnel/SituationStep";
import { SliderCard } from "@/components/funnel/SliderCard";
import { StepWrapper } from "@/components/funnel/StepWrapper";
import { ThankYou } from "@/components/funnel/ThankYou";
import type { FunnelAction } from "@/hooks/useFunnelState";
import { useFunnelState } from "@/hooks/useFunnelState";
import { SITE_CONFIG } from "@/lib/config";
import { getExtraQuestions, extraQuestionCount } from "@/lib/extra-questions";
import {
  getVisibleSteps,
  getWarnTextForSelection,
  isAkutNotfall,
  shouldShowConsultationOnly,
} from "@/lib/funnel-config";
import {
  isConfigStepAnswerValid,
  isLeadStepValid,
  isPlzZeitraumValid,
} from "@/lib/funnel-validation";
import { tileIconForStepValue } from "@/lib/funnel-tile-icons";
import { calculatePrice } from "@/lib/price-calc";
import type { FunnelStep, PlzZeitraumAnswer, Situation } from "@/lib/types";
import { Input } from "@/components/ui/input";

const LEAD_FORM_ID = "funnel-lead-form";
const ACC = SITE_CONFIG.accentColor;

function segmentProgress(
  screen: number,
  E: number,
  n: number
): { currentStep: number; completedSteps: number[] } {
  const plz = E + n;
  const load = plz + 1;
  const result = plz + 2;
  const contact = plz + 3;
  const thanks = plz + 4;

  if (screen === 0) return { currentStep: 1, completedSteps: [] };
  if (screen >= 1 && screen < plz) {
    return { currentStep: 2, completedSteps: [1] };
  }
  if (screen === plz) return { currentStep: 3, completedSteps: [1, 2] };
  if (screen === load || screen === result) {
    return { currentStep: 4, completedSteps: [1, 2, 3] };
  }
  if (screen === contact) {
    return { currentStep: 5, completedSteps: [1, 2, 3, 4] };
  }
  if (screen >= thanks) {
    return { currentStep: 5, completedSteps: [1, 2, 3, 4, 5] };
  }
  return { currentStep: 1, completedSteps: [] };
}

export function FunnelClient() {
  const searchParams = useSearchParams();
  const urlInit = useRef(false);
  const { funnel, dispatch, startSituation, setAnswer } = useFunnelState();
  const [screen, setScreen] = useState(0);
  const [loadKey, setLoadKey] = useState(0);

  const visibleSteps = useMemo(() => getVisibleSteps(funnel), [funnel]);
  const n = visibleSteps.length;
  const E = extraQuestionCount(funnel.situation);
  const extras = useMemo(
    () => getExtraQuestions(funnel.situation),
    [funnel.situation]
  );

  const plzScreen = E + n;
  const loadScreen = plzScreen + 1;
  const resultScreen = plzScreen + 2;
  const contactScreen = plzScreen + 3;
  const thanksScreen = plzScreen + 4;

  const skipCal =
    isAkutNotfall(funnel) || shouldShowConsultationOnly(funnel);

  const { currentStep, completedSteps } = segmentProgress(screen, E, n);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--acc", SITE_CONFIG.accentColor);
    root.style.setProperty("--accent", SITE_CONFIG.accentColor);
    root.style.setProperty("--ring", SITE_CONFIG.accentColor);
    return () => {
      root.style.removeProperty("--acc");
      root.style.removeProperty("--accent");
      root.style.removeProperty("--ring");
    };
  }, []);

  useEffect(() => {
    if (urlInit.current) return;
    const raw = searchParams.get("situation");
    const valid = (x: string): x is Situation =>
      ["renovierung", "neubau", "akut", "pflege", "b2b"].includes(x);
    if (raw && valid(raw)) {
      startSituation(raw);
      setScreen(1);
    }
    urlInit.current = true;
  }, [searchParams, startSituation]);

  const patchLead = useCallback(
    (
      patch: Partial<
        Pick<
          import("@/lib/types").FunnelState,
          | "vorname"
          | "nachname"
          | "email"
          | "telefon"
          | "plz"
          | "anmerkungen"
        >
      >
    ) => {
      (Object.keys(patch) as (keyof typeof patch)[]).forEach((k) => {
        const v = patch[k];
        if (v !== undefined) {
          dispatch({
            type: "SET_LEAD_FIELD",
            field: k as Extract<
              FunnelAction,
              { type: "SET_LEAD_FIELD" }
            >["field"],
            value: v,
          });
        }
      });
    },
    [dispatch]
  );

  const applyExtraSideEffects = useCallback(
    (id: string, value: string) => {
      if (id === "extra_renov_plaene") {
        dispatch({ type: "SET_BERATUNG", value: value === "beratung" });
      }
      if (id === "extra_pflege_entscheider") {
        dispatch({ type: "SET_ENTSCHEIDER", value: value !== "fragen" });
      }
      if (id === "extra_b2b_prio") {
        dispatch({ type: "SET_B2B_PRIO", value });
      }
    },
    [dispatch]
  );

  const handleNext = useCallback(() => {
    if (screen === 0) {
      if (!funnel.situation) return;
      setScreen(1);
      return;
    }
    if (screen >= 1 && screen <= E) {
      const def = extras[screen - 1];
      const a = funnel.answers[def.id];
      if (typeof a !== "string" || !a.trim()) return;
      if (screen === E) {
        setScreen(E + 1);
        return;
      }
      setScreen((s) => s + 1);
      return;
    }
    if (screen >= E + 1 && screen <= plzScreen) {
      const step = visibleSteps[screen - E - 1];
      if (!isConfigStepAnswerValid(funnel, step)) return;
      if (screen === plzScreen) {
        const { min, max, breakdown } = calculatePrice(funnel);
        dispatch({
          type: "SET_PRICE",
          priceMin: min,
          priceMax: max,
          priceBreakdown: breakdown,
        });
        setLoadKey((k) => k + 1);
        setScreen(loadScreen);
        return;
      }
      setScreen((s) => s + 1);
      return;
    }
    if (screen === loadScreen) return;
    if (screen === resultScreen) {
      setScreen(contactScreen);
      return;
    }
    if (screen === contactScreen) {
      (
        document.getElementById(LEAD_FORM_ID) as HTMLFormElement | null
      )?.requestSubmit();
    }
  }, [
    E,
    dispatch,
    extras,
    funnel,
    loadScreen,
    plzScreen,
    resultScreen,
    contactScreen,
    screen,
    visibleSteps,
  ]);

  const handleBack = useCallback(() => {
    if (screen <= 0) return;
    if (screen === contactScreen) {
      setScreen(resultScreen);
      return;
    }
    if (screen === resultScreen) {
      setScreen(plzScreen);
      return;
    }
    if (screen === loadScreen) {
      setScreen(plzScreen);
      return;
    }
    setScreen((s) => s - 1);
  }, [contactScreen, loadScreen, plzScreen, resultScreen, screen]);

  const slotOk =
    skipCal ||
    funnel.skipCalendar ||
    (funnel.selectedSlot !== null &&
      Boolean(funnel.selectedSlot.dateISO && funnel.selectedSlot.time));

  const nextDisabled = useMemo(() => {
    if (screen === 0) return !funnel.situation;
    if (screen >= 1 && screen <= E) {
      const def = extras[screen - 1];
      const a = funnel.answers[def.id];
      return typeof a !== "string" || !a.trim();
    }
    if (screen >= E + 1 && screen <= plzScreen) {
      const step = visibleSteps[screen - E - 1];
      return !isConfigStepAnswerValid(funnel, step);
    }
    if (screen === loadScreen) return true;
    if (screen === resultScreen) return false;
    if (screen === contactScreen) {
      return !isLeadStepValid(funnel) || !slotOk;
    }
    if (screen === thanksScreen) return true;
    return false;
  }, [
    E,
    contactScreen,
    extras,
    funnel,
    loadScreen,
    plzScreen,
    resultScreen,
    screen,
    thanksScreen,
    visibleSteps,
    slotOk,
  ]);

  const nextLabel = useMemo(() => {
    if (screen === plzScreen) return "Preis berechnen";
    if (screen === resultScreen) {
      return funnel.entscheider
        ? "Weiter"
        : "Ergebnis per E-Mail senden — weiter";
    }
    if (screen === contactScreen) {
      return "Termin anfragen & Ergebnis sichern →";
    }
    return "Weiter";
  }, [funnel.entscheider, contactScreen, plzScreen, resultScreen, screen]);

  const renderPlzZeitraum = (step: FunnelStep) => {
    const raw = funnel.answers.shared_plz;
    const cur: PlzZeitraumAnswer = isPlzZeitraumValid(raw)
      ? raw
      : { plz: funnel.plz || "", zeitraum: funnel.zeitraum || "" };
    const opts = (step.options ?? []).map((o) => ({
      value: o.value,
      label: o.label,
    }));
    return (
      <div className="space-y-5">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-[#666]">
            Postleitzahl
          </label>
          <Input
            className="h-11 rounded-[var(--r)] border border-[#e8e8e8] px-3 text-base focus-visible:border-funnel-accent"
            inputMode="numeric"
            maxLength={5}
            value={cur.plz}
            onChange={(e) =>
              setAnswer("shared_plz", {
                ...cur,
                plz: e.target.value.replace(/\D/g, "").slice(0, 5),
              })
            }
            autoComplete="postal-code"
          />
        </div>
        <div>
          <p className="mb-2 text-[13px] font-medium text-text-primary">
            Wann passt es dir?
          </p>
          <ChipSelector
            options={opts}
            selected={cur.zeitraum}
            multi={false}
            accentColor={ACC}
            onChange={(vals) =>
              setAnswer("shared_plz", {
                ...cur,
                zeitraum: vals[0] ?? "",
              })
            }
          />
        </div>
      </div>
    );
  };

  const renderConfigStep = (step: FunnelStep) => {
    const opts = step.options ?? [];
    const raw = funnel.answers[step.id];
    const selectedMulti = Array.isArray(raw)
      ? raw
      : typeof raw === "string" && raw
        ? [raw]
        : [];
    const selectedSingle = typeof raw === "string" ? raw : "";

    if (step.inputType === "plz-zeitraum") {
      return renderPlzZeitraum(step);
    }

    if (
      step.inputType === "tiles-single" ||
      step.inputType === "tiles-multi"
    ) {
      const multi = step.inputType === "tiles-multi";
      return (
        <div className="space-y-3">
          {opts.map((opt) => {
            const selected = multi
              ? selectedMulti.includes(opt.value)
              : selectedSingle === opt.value;
            return (
              <SelectionTile
                key={opt.value}
                option={opt}
                icon={tileIconForStepValue(opt.value)}
                selected={selected}
                multi={multi}
                onChange={(value, sel) => {
                  if (multi) {
                    const set = new Set(selectedMulti);
                    if (sel) set.add(value);
                    else set.delete(value);
                    setAnswer(step.id, Array.from(set));
                  } else {
                    setAnswer(step.id, sel ? value : "");
                  }
                }}
              />
            );
          })}
        </div>
      );
    }

    if (
      step.inputType === "chips-single" ||
      step.inputType === "chips-multi"
    ) {
      const multi = step.inputType === "chips-multi";
      const selVals = multi ? selectedMulti : selectedSingle;
      const warn = getWarnTextForSelection(
        step,
        multi ? selectedMulti : [selectedSingle].filter(Boolean)
      );
      return (
        <div className="space-y-4">
          <ChipSelector
            options={opts.map((o) => ({ value: o.value, label: o.label }))}
            selected={selVals}
            multi={multi}
            accentColor={ACC}
            onChange={(vals) => setAnswer(step.id, multi ? vals : vals[0] ?? "")}
          />
          {warn ? (
            <div className="warning-box text-[12px]">{warn}</div>
          ) : null}
        </div>
      );
    }

    if (step.inputType === "slider" && step.sliderConfig) {
      const val =
        typeof raw === "number" ? raw : step.sliderConfig.defaultValue;
      return (
        <SliderCard
          config={step.sliderConfig}
          label={step.question}
          value={val}
          onChange={(v) => setAnswer(step.id, v)}
          infoText={step.infoText}
          livePrice={
            funnel.priceMin > 0 || funnel.priceMax > 0
              ? { min: funnel.priceMin, max: funnel.priceMax }
              : null
          }
          accentColor={ACC}
        />
      );
    }

    if (step.inputType === "text") {
      return (
        <textarea
          rows={4}
          className="w-full rounded-[var(--r)] border border-[#e8e8e8] p-3 text-base text-text-primary outline-none focus-visible:border-funnel-accent"
          placeholder="Kurz beschreiben …"
          value={typeof raw === "string" ? raw : ""}
          onChange={(e) => setAnswer(step.id, e.target.value)}
        />
      );
    }

    return null;
  };

  const bookingSummary = useMemo(() => {
    const s = funnel.selectedSlot;
    if (!s?.dateISO || !s.time) return null;
    const d = new Date(s.dateISO);
    if (Number.isNaN(d.getTime())) return null;
    const dateLabel = d.toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return { dateLabel, timeLabel: s.time };
  }, [funnel.selectedSlot]);

  const mainContent = () => {
    if (screen === 0) {
      return (
        <StepWrapper
          stepLabel="Vorhaben"
          question="Was planst du?"
          subtext="Beantworte unsere Fragen, um eine erste Preisindikation zu erhalten."
          animateKey="sit"
        >
          <SituationStep
            value={funnel.situation}
            onSelect={(s) => startSituation(s)}
          />
        </StepWrapper>
      );
    }

    if (screen >= 1 && screen <= E) {
      const def = extras[screen - 1];
      return (
        <StepWrapper
          stepLabel="Details"
          question={def.label}
          animateKey={def.id}
        >
          <ExtraQuestion
            def={def}
            value={funnel.answers[def.id]}
            accentColor={ACC}
            onChange={(v) => {
              setAnswer(def.id, v);
              applyExtraSideEffects(def.id, v);
            }}
          />
        </StepWrapper>
      );
    }

    if (screen >= E + 1 && screen <= plzScreen) {
      const step = visibleSteps[screen - E - 1];
      const stepLabel = screen === plzScreen ? "Objekt" : "Details";
      return (
        <StepWrapper
          stepLabel={stepLabel}
          question={step.question}
          subtext={step.subtext}
          animateKey={step.id}
        >
          {step.infoText && step.inputType !== "slider" ? (
            <div className="info-box mb-4 text-[12px]">{step.infoText}</div>
          ) : null}
          {renderConfigStep(step)}
        </StepWrapper>
      );
    }

    if (screen === loadScreen) {
      return (
        <StepWrapper animateKey={`load-${loadKey}`}>
          <LoadingScreen
            key={loadKey}
            situation={funnel.situation}
            onComplete={() => setScreen(resultScreen)}
          />
        </StepWrapper>
      );
    }

    if (screen === resultScreen) {
      return (
        <StepWrapper stepLabel="Ergebnis" animateKey="result">
          <ResultScreen state={funnel} companyPhone={SITE_CONFIG.phone} />
        </StepWrapper>
      );
    }

    if (screen === contactScreen) {
      const tel = SITE_CONFIG.phone.replace(/\s/g, "");
      return (
        <StepWrapper
          stepLabel="Termin"
          question="Fast geschafft"
          subtext="Optional Fotos, Terminwunsch und Kontakt — wir melden uns."
          animateKey="contact"
        >
          <LeadAvailabilityHint className="mb-4" />
          <PhotoUpload
            files={funnel.photos}
            onChange={(files) => dispatch({ type: "SET_PHOTOS", photos: files })}
            className="mb-4"
          />

          {isAkutNotfall(funnel) ? (
            <div className="mb-4 rounded-[var(--r)] border border-border-default bg-[#fff7f7] p-4 text-center">
              <p className="text-sm font-semibold text-[#C0392B]">Notfall</p>
              <a
                href={`tel:${tel}`}
                className="mt-2 block text-2xl font-bold text-text-primary"
              >
                {SITE_CONFIG.phone}
              </a>
              <a
                href={`tel:${tel}`}
                className="mt-3 inline-flex rounded-[999px] bg-[#C0392B] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Jetzt anrufen
              </a>
            </div>
          ) : null}

          {!skipCal ? (
            <>
              <CalendarPicker
                key={`cal-${funnel.selectedSlot?.dateISO ?? "x"}-${funnel.selectedSlot?.time ?? ""}`}
                selectedSlot={funnel.selectedSlot}
                onSlotSelect={(date, time) => {
                  dispatch({ type: "SET_SKIP_CALENDAR", value: false });
                  dispatch({
                    type: "SET_SELECTED_SLOT",
                    slot: {
                      dateISO: date.toISOString(),
                      time,
                    },
                  });
                }}
                className="mb-3"
              />
              <button
                type="button"
                className="mb-6 text-[12px] font-medium text-text-secondary underline underline-offset-2"
                onClick={() => dispatch({ type: "SET_SKIP_CALENDAR", value: true })}
              >
                Termin später festlegen →
              </button>
            </>
          ) : null}

          <LeadForm
            funnel={funnel}
            value={{
              vorname: funnel.vorname,
              nachname: funnel.nachname,
              email: funnel.email,
              telefon: funnel.telefon,
              plz: funnel.plz,
              anmerkungen: funnel.anmerkungen,
            }}
            onChange={patchLead}
            onSuccess={() => setScreen(thanksScreen)}
            formId={LEAD_FORM_ID}
          />
        </StepWrapper>
      );
    }

    if (screen === thanksScreen) {
      return (
        <ThankYou
          variant={bookingSummary ? "termin" : "anfrage"}
          dateLabel={bookingSummary?.dateLabel}
          timeLabel={bookingSummary?.timeLabel}
        />
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-background pb-24 pt-[132px]">
      <Header
        companyName={SITE_CONFIG.companyName}
        phone={SITE_CONFIG.phone}
        logoInitials={SITE_CONFIG.logoInitials}
        accentColor={ACC}
      />
      <ProgressBar
        currentStep={currentStep}
        completedSteps={completedSteps}
        accentColor={ACC}
      />
      <main className="mx-auto w-full max-w-[540px] py-6">{mainContent()}</main>
      <Footer
        onBack={
          screen > 0 && screen !== thanksScreen && screen !== loadScreen
            ? handleBack
            : undefined
        }
        onNext={
          screen === thanksScreen || screen === loadScreen ? undefined : handleNext
        }
        nextDisabled={nextDisabled}
        nextLabel={nextLabel}
        showBack={screen > 0 && screen !== thanksScreen && screen !== loadScreen}
        hideNext={screen === thanksScreen || screen === loadScreen}
        accentColor={ACC}
      />
    </div>
  );
}
