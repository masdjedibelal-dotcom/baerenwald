"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { BwResultScreen } from "@/components/funnel/BwResultScreen";
import { CalendarPicker } from "@/components/funnel/CalendarPicker";
import { FunnelFooter } from "@/components/funnel/FunnelFooter";
import { FunnelHeader } from "@/components/funnel/FunnelHeader";
import { FunnelProgressBar } from "@/components/funnel/FunnelProgressBar";
import { GroesseSelector } from "@/components/funnel/GroesseSelector";
import { LoadingScreen } from "@/components/funnel/LoadingScreen";
import { PhotoUpload } from "@/components/funnel/PhotoUpload";
import { PlzStep } from "@/components/funnel/PlzStep";
import { SelectionTile } from "@/components/funnel/SelectionTile";
import { StepWrapper } from "@/components/funnel/StepWrapper";
import { ThankYou } from "@/components/funnel/ThankYou";
import { useFunnelState } from "@/hooks/funnel/useFunnelState";
import { getResolvedStepsForSituation } from "@/lib/funnel/config";
import { calculatePrice } from "@/lib/funnel/price-calc";
import type {
  FunnelStep,
  Situation,
  StepOption as FunnelStepOption,
  Zeitraum,
} from "@/lib/funnel/types";
import { tileIconForStepValue } from "@/lib/funnel-tile-icons";
import type { StepOption as LibStepOption } from "@/lib/types";
import { cn } from "@/lib/utils";

const LEAD_FORM_ID = "bw-funnel-lead";

type Screen =
  | "situation"
  | "bereiche"
  | "umfang"
  | "groesse"
  | "ort"
  | "loading"
  | "result"
  | "lead"
  | "danke";

const SIT_ORDER: Situation[] = [
  "renovieren",
  "sanieren",
  "notfall",
  "neubauen",
  "betreuung",
];

function isSituation(x: string): x is Situation {
  return (SIT_ORDER as readonly string[]).includes(x);
}

function asLibOpt(o: FunnelStepOption): LibStepOption {
  return {
    value: o.value,
    label: o.label,
    hint: o.hint,
    priceTag: o.priceTag,
    infoExpand: o.infoText,
    warnText: o.warnText,
    triggerGewerke: o.triggerGewerke,
  };
}

function progressStep(s: Screen): number {
  if (s === "situation") return 1;
  if (s === "bereiche") return 2;
  if (s === "umfang") return 3;
  if (s === "groesse") return 4;
  return 5;
}

function groesseEinheit(state: {
  situation: Situation | null;
  bereiche: string[];
}): "qm" | "stueck" | "meter" {
  if (state.situation !== "betreuung") return "qm";
  if (state.bereiche.includes("baum")) return "stueck";
  if (state.bereiche.includes("winter")) return "meter";
  return "qm";
}

function situationMeta(s: Situation): { title: string; hint: string } {
  const m: Record<Situation, { title: string; hint: string }> = {
    renovieren: {
      title: "Renovieren",
      hint: "Bad, Küche, Wände, Fenster",
    },
    sanieren: {
      title: "Sanieren",
      hint: "Heizung, Dach, Elektrik, Förderung",
    },
    notfall: {
      title: "Notfall",
      hint: "Heizung, Wasser, Strom — schnelle Hilfe",
    },
    neubauen: {
      title: "Neubau / Ausbau",
      hint: "Keller, DG, Terrasse, Umbau",
    },
    betreuung: {
      title: "Betreuung",
      hint: "Garten, Reinigung, Winterdienst",
    },
  };
  return m[s];
}

function FunnelRechnerInner() {
  const searchParams = useSearchParams();
  const urlInit = useRef(false);
  const [screen, setScreen] = useState<Screen>("situation");

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
    setBudgetCheck,
    setSlot,
    updateLeadField,
    addPhotos,
    setDringlichkeit,
    setSubmitted,
  } = useFunnelState();

  const resolvedSteps = useMemo(
    () => getResolvedStepsForSituation(state.situation, state.bereiche),
    [state.situation, state.bereiche]
  );

  const hasGroesseStep = useMemo(
    () =>
      resolvedSteps.some((s) => s.id.toLowerCase().includes("groesse")),
    [resolvedSteps]
  );

  const stepBereiche = resolvedSteps[0] ?? null;
  const stepUmfang = resolvedSteps[1] ?? null;
  const stepGroesse = resolvedSteps[2] ?? null;

  const umfangOk =
    state.situation === "notfall"
      ? Boolean(state.dringlichkeit)
      : Boolean(state.umfang);

  useEffect(() => {
    if (urlInit.current) return;
    const raw = searchParams.get("situation");
    if (raw && isSituation(raw)) {
      setSituation(raw);
      setScreen("bereiche");
    }
    urlInit.current = true;
  }, [searchParams, setSituation]);

  const goGroesseOrOrt = useCallback(() => {
    setScreen(hasGroesseStep ? "groesse" : "ort");
  }, [hasGroesseStep]);

  const handleNext = useCallback(() => {
    switch (screen) {
      case "situation":
        if (state.situation) setScreen("bereiche");
        break;
      case "bereiche":
        if (state.bereiche.length > 0) setScreen("umfang");
        break;
      case "umfang":
        if (umfangOk) goGroesseOrOrt();
        break;
      case "groesse":
        if (state.groesse != null) setScreen("ort");
        break;
      case "ort": {
        if (state.plz.length < 4 || !state.zeitraum) break;
        const { min, max, breakdown } = calculatePrice(state);
        setPrice(min, max, breakdown);
        setScreen("loading");
        break;
      }
      case "result":
        setScreen("lead");
        break;
      case "lead":
        (document.getElementById(LEAD_FORM_ID) as HTMLFormElement | null)?.requestSubmit();
        break;
      default:
        break;
    }
  }, [
    screen,
    state,
    umfangOk,
    goGroesseOrOrt,
    setPrice,
  ]);

  const handleBack = useCallback(() => {
    switch (screen) {
      case "bereiche":
        setScreen("situation");
        break;
      case "umfang":
        setScreen("bereiche");
        break;
      case "groesse":
        setScreen("umfang");
        break;
      case "ort":
        setScreen(hasGroesseStep ? "groesse" : "umfang");
        break;
      case "loading":
        setScreen("ort");
        break;
      case "result":
        setScreen("ort");
        break;
      case "lead":
        setScreen("result");
        break;
      default:
        break;
    }
  }, [screen, hasGroesseStep]);

  const nextDisabled = useMemo(() => {
    switch (screen) {
      case "situation":
        return !state.situation;
      case "bereiche":
        return state.bereiche.length === 0;
      case "umfang":
        return !umfangOk;
      case "groesse":
        return state.groesse == null;
      case "ort":
        return state.plz.length < 4 || !state.zeitraum;
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
      default:
        return true;
    }
  }, [screen, state, umfangOk]);

  const nextLabel = useMemo(() => {
    if (screen === "ort") return "Preis berechnen";
    if (screen === "lead") return "Absenden →";
    return "Weiter →";
  }, [screen]);

  const showFooterNav = screen !== "danke";

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nextDisabled && screen === "lead") return;
    const body = {
      name: state.name.trim(),
      email: state.email.trim(),
      telefon: state.telefon.trim(),
      situation: state.situation,
      bereiche: state.bereiche,
      priceMin: state.priceMin,
      priceMax: state.priceMax,
      plz: state.plz,
      zeitraum: state.zeitraum,
      budgetCheck: state.budgetCheck,
      budgetGespraech: state.budgetCheck === "zu_hoch",
      selectedSlot: state.selectedSlot,
      photoCount: state.photos.length,
      dringlichkeit: state.dringlichkeit,
      umfang: state.umfang,
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

  const renderTiles = (step: FunnelStep | null) => {
    if (!step?.options?.length) return null;
    const multi = step.inputType === "tiles-multi";
    const selectedMulti = state.bereiche;
    const selectedSingle = state.bereiche[0] ?? "";

    return (
      <div className="space-y-3">
        {step.options.map((opt) => {
          const libOpt = asLibOpt(opt);
          const selected = multi
            ? selectedMulti.includes(opt.value)
            : selectedSingle === opt.value;
          return (
            <SelectionTile
              key={opt.value}
              option={libOpt}
              icon={tileIconForStepValue(opt.value)}
              selected={selected}
              multi={multi}
              onChange={(value, sel) => {
                if (multi) {
                  toggleBereich(value);
                } else {
                  setBereiche(sel ? [value] : []);
                }
              }}
            />
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
                icon={tileIconForStepValue(opt.value)}
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
              icon={tileIconForStepValue(opt.value)}
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

  const groesseOptions = useMemo(() => {
    if (!stepGroesse?.options) return [];
    return stepGroesse.options.map((o) => ({
      value: o.value,
      label: o.label,
      hint: o.hint,
    }));
  }, [stepGroesse]);

  const selectedGroesseValue =
    stepGroesse?.options?.find((o) => o.groesse === state.groesse)?.value ?? "";

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
    switch (screen) {
      case "situation":
        return (
          <StepWrapper
            stepLabel="Vorhaben"
            question="Was möchtest du erledigen?"
            subtext="Wähle dein Vorhaben — wir passen die Fragen an."
            animateKey={screen}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SIT_ORDER.map((id) => {
                const meta = situationMeta(id);
                const active = state.situation === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSituation(id)}
                    className={cn(
                      "rounded-[18px] border border-border-default p-4 text-left transition-colors hover:border-text-tertiary",
                      active &&
                        "border-[1.5px] border-funnel-accent bg-funnel-accent/5"
                    )}
                  >
                    <p className="text-[13px] font-semibold text-text-primary">
                      {meta.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-text-secondary">
                      {meta.hint}
                    </p>
                  </button>
                );
              })}
            </div>
          </StepWrapper>
        );

      case "bereiche":
        return (
          <StepWrapper
            stepLabel="Details"
            question={stepBereiche?.question ?? ""}
            subtext={stepBereiche?.subtext}
            animateKey={`${screen}-${state.situation}`}
          >
            {renderTiles(stepBereiche)}
          </StepWrapper>
        );

      case "umfang":
        return (
          <StepWrapper
            stepLabel="Umfang"
            question={stepUmfang?.question ?? ""}
            subtext={stepUmfang?.subtext}
            animateKey={`${screen}-${state.situation}`}
          >
            {renderUmfangTiles()}
          </StepWrapper>
        );

      case "groesse":
        return (
          <StepWrapper
            stepLabel="Größe"
            question={stepGroesse?.question ?? ""}
            subtext={stepGroesse?.subtext}
            animateKey={`${screen}-${state.situation}`}
          >
            <GroesseSelector
              options={groesseOptions}
              selected={selectedGroesseValue}
              onChange={(value) => {
                const opt = stepGroesse?.options?.find((o) => o.value === value);
                const n = opt?.groesse ?? null;
                setGroesse(n, groesseEinheit(state));
              }}
            />
          </StepWrapper>
        );

      case "ort":
        return (
          <StepWrapper
            stepLabel="Ort"
            question="Wo soll es stattfinden?"
            subtext="PLZ und gewünschter Zeitraum."
            animateKey={screen}
          >
            <PlzStep
              plz={state.plz}
              zeitraum={state.zeitraum ?? ""}
              onPlzChange={setPlz}
              onZeitraumChange={(z) => setZeitraum(z as Zeitraum)}
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
              onBudgetChange={setBudgetCheck}
            />
          </StepWrapper>
        );

      case "lead":
        return (
          <StepWrapper
            stepLabel="Kontakt"
            question="Fast geschafft"
            subtext="Optional Fotos, Terminwunsch — wir melden uns."
            animateKey="lead"
          >
            <PhotoUpload
              files={state.photos}
              onChange={addPhotos}
              className="mb-4"
            />
            <CalendarPicker
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
              className="mb-6"
            />
            <form id={LEAD_FORM_ID} onSubmit={handleLeadSubmit} className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  className="w-full rounded-xl border border-border-default px-3 py-2.5 text-sm outline-none focus:border-funnel-accent"
                  placeholder="Name"
                  value={state.name}
                  onChange={(e) => updateLeadField("name", e.target.value)}
                  autoComplete="name"
                />
                <input
                  type="email"
                  className="w-full rounded-xl border border-border-default px-3 py-2.5 text-sm outline-none focus:border-funnel-accent"
                  placeholder="E-Mail"
                  value={state.email}
                  onChange={(e) => updateLeadField("email", e.target.value)}
                  autoComplete="email"
                />
              </div>
              <input
                type="tel"
                className="w-full rounded-xl border border-border-default px-3 py-2.5 text-sm outline-none focus:border-funnel-accent"
                placeholder="Telefon"
                value={state.telefon}
                onChange={(e) => updateLeadField("telefon", e.target.value)}
                autoComplete="tel"
              />
              <p className="text-[11px] leading-relaxed text-text-tertiary">
                Mit Absenden akzeptierst du, dass wir dich zum Termin /
                Angebot kontaktieren. Du kannst der Nutzung jederzeit
                widersprechen.
              </p>
            </form>
          </StepWrapper>
        );

      case "danke":
        return (
          <ThankYou
            variant={bookingSummary ? "termin" : "anfrage"}
            dateLabel={bookingSummary?.dateLabel}
            timeLabel={bookingSummary?.timeLabel}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <FunnelHeader />
      <FunnelProgressBar currentStep={progressStep(screen)} />
      <main className="pb-28">{main()}</main>
      {showFooterNav ? (
        <FunnelFooter
          onNext={handleNext}
          onBack={screen === "situation" ? undefined : handleBack}
          nextDisabled={nextDisabled}
          showBack={screen !== "situation"}
          nextLabel={nextLabel}
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
      <FunnelRechnerInner />
    </Suspense>
  );
}
