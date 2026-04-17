"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import { SelectionTile } from "@/components/funnel/SelectionTile";
import {
  getClearFachdetailPatchFromSubStep,
  getFachdetailSubStepIds,
  isFachdetailInternalNextDisabled,
  isFachdetailSubStepComplete,
  sanitaerShortDone,
} from "@/lib/funnel/fachdetails-internal-order";
import type { FachdetailsState, FunnelState } from "@/lib/funnel/types";
import {
  FACHDETAILS_NOTFALL,
  type FachdetailGewerkKey,
} from "@/lib/funnel/fachdetails-notfall";
import {
  BODEN_FOLLOWUPS,
  BODEN_Q1,
  DACH_FOLLOWUPS,
  DACH_Q1,
  ELEKTRO_FOLLOWUPS,
  getElektroQ1ForSituation,
  FENSTER_Q1,
  GARTEN_FOLLOWUPS,
  GARTEN_Q1,
  HEIZUNG_FOLLOWUPS,
  HEIZUNG_KAPUTT_Q1,
  HEIZUNG_Q1,
  FENSTER_DEFEKT_Q1,
  MALER_FOLLOWUPS,
  MALER_Q1,
  type FachdetailOptionDef,
  type FachdetailQuestionDef,
  SANITAER_BAD_OBJEKTE_MULTI,
  SANITAER_BAD_Q,
  SANITAER_FOLLOWUPS,
  SANITAER_Q1,
} from "@/lib/funnel/fachdetails-questions";
import type { StepOption as LibStepOption } from "@/lib/types";
import { cn } from "@/lib/utils";

function freitextValue(
  fd: FachdetailsState,
  g: FachdetailGewerkKey
): string {
  switch (g) {
    case "elektro":
      return fd.elektro?.freitext ?? "";
    case "sanitaer":
      return fd.sanitaer?.freitext ?? "";
    case "heizung":
      return fd.heizung?.freitext ?? "";
    case "maler":
      return fd.maler?.freitext ?? "";
    case "boden":
      return fd.boden?.freitext ?? "";
    case "dach":
      return fd.dach?.freitext ?? "";
    case "garten":
      return fd.garten?.freitext ?? "";
    case "fenster":
      return fd.fenster?.freitext ?? "";
    default:
      return "";
  }
}

function freitextPatch(
  fd: FachdetailsState,
  g: FachdetailGewerkKey,
  raw: string
): Partial<FachdetailsState> {
  const t = raw.trim();
  const v = t === "" ? null : t.slice(0, 150);
  switch (g) {
    case "elektro":
      return { elektro: { ...fd.elektro, freitext: v } };
    case "sanitaer":
      return { sanitaer: { ...fd.sanitaer, freitext: v } };
    case "heizung":
      return { heizung: { ...fd.heizung, freitext: v } };
    case "maler":
      return { maler: { ...fd.maler, freitext: v } };
    case "boden":
      return { boden: { ...fd.boden, freitext: v } };
    case "dach":
      return { dach: { ...fd.dach, freitext: v } };
    case "garten":
      return { garten: { ...fd.garten, freitext: v } };
    case "fenster":
      return { fenster: { ...fd.fenster, freitext: v } };
    default:
      return {};
  }
}

function asLibOptFromFach(o: FachdetailOptionDef): LibStepOption {
  return {
    value: o.value,
    label: o.label,
    hint: o.hint,
    emoji: o.emoji,
    warnText: o.warnText,
    infoExpand: o.education,
  };
}

const GEWERK_EMOJI: Record<FachdetailGewerkKey, string> = {
  sanitaer: "🚿",
  heizung: "🔥",
  elektro: "⚡",
  fenster: "🪟",
  boden: "🪵",
  maler: "🖌️",
  dach: "🏠",
  garten: "🌿",
};

const GEWERK_LABEL: Record<FachdetailGewerkKey, string> = {
  sanitaer: "Sanitär & Bad",
  heizung: "Heizung",
  elektro: "Elektro",
  fenster: "Fenster",
  boden: "Bodenbelag",
  maler: "Malerarbeiten",
  dach: "Dach",
  garten: "Garten",
};

function getFachdetailIntroQuestionTitle(
  gewerk: FachdetailGewerkKey,
  isNotfall: boolean,
  state: Pick<FunnelState, "situation" | "bereiche" | "fachdetails">
): string {
  const { situation, bereiche, fachdetails: fd } = state;
  if (isNotfall) {
    if (gewerk === "elektro") return FACHDETAILS_NOTFALL.elektro.title;
    if (gewerk === "sanitaer") return FACHDETAILS_NOTFALL.sanitaer.title;
    if (gewerk === "heizung") return FACHDETAILS_NOTFALL.heizung.title;
  }
  if (
    gewerk === "sanitaer" &&
    situation === "erneuern" &&
    bereiche.includes("bad") &&
    !fd?.sanitaer?.badWas
  ) {
    return SANITAER_BAD_Q.title;
  }
  if (
    gewerk === "heizung" &&
    situation === "kaputt" &&
    bereiche.includes("heizung")
  ) {
    return HEIZUNG_KAPUTT_Q1.title;
  }
  if (
    gewerk === "fenster" &&
    situation === "kaputt" &&
    bereiche.includes("fenster_tuer") &&
    !bereiche.includes("fenster")
  ) {
    return FENSTER_DEFEKT_Q1.title;
  }
  switch (gewerk) {
    case "elektro":
      return getElektroQ1ForSituation(state.situation).title;
    case "sanitaer":
      return SANITAER_Q1.title;
    case "heizung":
      return HEIZUNG_Q1.title;
    case "maler":
      return MALER_Q1.title;
    case "boden":
      return BODEN_Q1.title;
    case "dach":
      return DACH_Q1.title;
    case "fenster":
      return FENSTER_Q1.title;
    case "garten":
      return GARTEN_Q1.title;
    default:
      return "Details";
  }
}

function FollowUpPanel({
  show,
  children,
  scrollDep,
}: {
  show: boolean;
  children: React.ReactNode;
  /** Änderung (z. B. Folgefragen-ID) triggert erneutes Scrollen, solange `show` true ist */
  scrollDep?: string | number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show) return;
    const el = wrapRef.current;
    if (!el) return;
    let cancelled = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    });
    return () => {
      cancelled = true;
    };
  }, [show, scrollDep]);

  return (
    <div
      className={cn(
        "overflow-hidden transition-all duration-300 ease-out",
        show ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
      )}
      style={{
        transform: show ? "translateY(0)" : "translateY(-6px)",
      }}
    >
      {show ? (
        <div
          key={String(scrollDep ?? "folge")}
          ref={wrapRef}
          className="folgefrage-wrap pt-3"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

function optionEduKey(qId: string, optValue: string) {
  return `${qId}__opt__${optValue}`;
}

function SingleQuestionBlock({
  q,
  selected,
  onSelect,
  educationOpen,
  onToggleEdu,
  optionEduOpen,
  onToggleOptionEdu,
}: {
  q: FachdetailQuestionDef;
  selected: string | undefined;
  onSelect: (value: string) => void;
  educationOpen: boolean;
  onToggleEdu: () => void;
  optionEduOpen: Record<string, boolean>;
  onToggleOptionEdu: (key: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[15px] font-semibold text-text-primary">{q.title}</h3>
        {q.education ? (
          <button
            type="button"
            onClick={onToggleEdu}
            className="shrink-0 text-[13px] text-text-tertiary hover:text-text-secondary"
            aria-label="Hinweis"
          >
            ℹ
          </button>
        ) : null}
      </div>
      {q.education && educationOpen ? (
        <div
          className="mt-2 rounded-lg px-3 py-2 text-[12px] leading-relaxed"
          style={{
            color: "var(--fl-text-3, #9e9e9e)",
            background: "var(--fl-bg, var(--surface-muted))",
          }}
        >
          {q.education}
        </div>
      ) : null}
      <div className="space-y-2">
        {q.options.map((opt: FachdetailOptionDef) => {
          const lib = asLibOptFromFach(opt);
          const sel = selected === opt.value;
          const oKey = optionEduKey(q.id, opt.value);
          const optEduOpen = Boolean(optionEduOpen[oKey]);
          return (
            <div key={opt.value} className="space-y-1">
              <div className="flex items-start gap-1">
                <div className="min-w-0 flex-1">
                  <SelectionTile
                    option={lib}
                    icon={null}
                    selected={sel}
                    multi={false}
                    onChange={(value, isSel) => {
                      if (!isSel) return;
                      onSelect(value);
                    }}
                  />
                </div>
                {opt.education ? (
                  <button
                    type="button"
                    onClick={() => onToggleOptionEdu(oKey)}
                    className="mt-2 shrink-0 text-[13px] text-text-tertiary hover:text-text-secondary"
                    aria-label="Hinweis zur Option"
                  >
                    ℹ
                  </button>
                ) : null}
              </div>
              {opt.education && optEduOpen ? (
                <div
                  className="ml-1 rounded-lg px-3 py-2 text-[12px] leading-relaxed"
                  style={{
                    color: "var(--fl-text-3, #9e9e9e)",
                    background: "var(--fl-bg, var(--surface-muted))",
                  }}
                >
                  {opt.education}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type FachdetailsStepHandle = {
  tryConsumeBack: () => boolean;
  tryConsumeNext: () => boolean;
  getNextDisabled: () => boolean;
};

export interface FachdetailsStepProps {
  gewerk: FachdetailGewerkKey;
  totalGewerke: number;
  gewerkIndex: number;
  isLastFachdetailScreen: boolean;
  showOmitHint?: boolean;
  state: FunnelState;
  onChange: (patch: Partial<FachdetailsState>) => void;
  onResetFachdetailsForGewerk: (gewerk: FachdetailGewerkKey) => void;
  onFachInternalNavTick?: () => void;
  className?: string;
}

export const FachdetailsStep = forwardRef<
  FachdetailsStepHandle,
  FachdetailsStepProps
>(function FachdetailsStep(
  {
    gewerk,
    totalGewerke,
    gewerkIndex,
    isLastFachdetailScreen,
    showOmitHint,
    state,
    onChange,
    onResetFachdetailsForGewerk,
    onFachInternalNavTick,
    className,
  },
  ref
) {
  const b = state.bereiche;
  const fd = state.fachdetails;
  const isNotfall = state.situation === "notfall";

  const needElektro = useMemo(() => {
    const s = new Set(b);
    return s.has("strom") || s.has("elektrik") || s.has("elektro");
  }, [b]);
  const needSan = useMemo(() => {
    const s = new Set(b);
    return (
      s.has("bad") ||
      s.has("wasser") ||
      s.has("sanitaer") ||
      s.has("feuchtigkeit_schimmel")
    );
  }, [b]);
  const needHeizung = b.includes("heizung");
  const needBadExtra = b.includes("bad");

  const [eduKeys, setEduKeys] = useState<Record<string, boolean>>({});

  const toggleEdu = useCallback((key: string) => {
    setEduKeys((m) => ({ ...m, [key]: !m[key] }));
  }, []);

  const elektroQ1 = useMemo(
    () => getElektroQ1ForSituation(state.situation),
    [state.situation]
  );

  const elektroFollowQ = useMemo(() => {
    if (isNotfall) return null;
    const p = fd.elektro?.problem;
    if (!p) return null;
    const opt = elektroQ1.options.find((o) => o.value === p);
    const id = opt?.followUpId;
    if (!id) return null;
    return ELEKTRO_FOLLOWUPS[id] ?? null;
  }, [fd.elektro?.problem, isNotfall, elektroQ1]);

  const sanFollowQ = useMemo(() => {
    if (isNotfall) return null;
    if (fd.sanitaer?.lage !== "wand") return null;
    return SANITAER_FOLLOWUPS.sanitaer_folge_rohre;
  }, [fd.sanitaer?.lage, isNotfall]);

  const badFollowMulti = useMemo(() => {
    if (isNotfall) return null;
    if (fd.sanitaer?.badWas !== "objekte") return null;
    return SANITAER_BAD_OBJEKTE_MULTI;
  }, [fd.sanitaer?.badWas, isNotfall]);

  const heizFollowQ = useMemo(() => {
    if (isNotfall) return null;
    const t = fd.heizung?.typ;
    if (t === "oel") return HEIZUNG_FOLLOWUPS.heizung_folge_oel_alter;
    if (t === "waermepumpe") return HEIZUNG_FOLLOWUPS.heizung_folge_wp_vorhaben;
    return null;
  }, [fd.heizung?.typ, isNotfall]);

  const needMaler = useMemo(() => {
    const s = new Set(b);
    return (
      s.has("maler") ||
      s.has("streichen") ||
      s.has("waende") ||
      s.has("waende_boeden") ||
      s.has("feuchtigkeit_schimmel")
    );
  }, [b]);

  const needBoden = useMemo(() => {
    const s = new Set(b);
    return s.has("boden") || s.has("waende_boeden");
  }, [b]);

  const needDach = b.includes("dach");

  const needGarten = useMemo(() => {
    const s = new Set(b);
    return (
      s.has("garten") ||
      s.has("gestaltung") ||
      s.has("baum") ||
      s.has("baumarbeiten")
    );
  }, [b]);

  const needFenster = useMemo(() => {
    const s = new Set(b);
    return (
      s.has("fenster") ||
      s.has("fenster_tueren") ||
      s.has("fenster_tuer")
    );
  }, [b]);

  const fensterDefektKaputt =
    state.situation === "kaputt" &&
    b.includes("fenster_tuer") &&
    !b.includes("fenster");

  const erneuernBad = state.situation === "erneuern" && b.includes("bad");

  const malerFollowQ = useMemo(() => {
    const w = fd.maler?.was;
    if (!w) return null;
    const opt = MALER_Q1.options.find((o) => o.value === w);
    const id = opt?.followUpId;
    if (!id) return null;
    return MALER_FOLLOWUPS[id] ?? null;
  }, [fd.maler?.was]);

  const bodenFollowQ = useMemo(() => {
    const a = fd.boden?.aktuell;
    if (!a) return null;
    const opt = BODEN_Q1.options.find((o) => o.value === a);
    const id = opt?.followUpId;
    if (!id) return null;
    return BODEN_FOLLOWUPS[id] ?? null;
  }, [fd.boden?.aktuell]);

  const dachFollowQ = useMemo(() => {
    const v = fd.dach?.vorhaben;
    if (!v) return null;
    const opt = DACH_Q1.options.find((o) => o.value === v);
    const id = opt?.followUpId;
    if (!id) return null;
    return DACH_FOLLOWUPS[id] ?? null;
  }, [fd.dach?.vorhaben]);

  const gartenFollowQ = useMemo(() => {
    const w = fd.garten?.was;
    if (!w) return null;
    const opt = GARTEN_Q1.options.find((o) => o.value === w);
    const id = opt?.followUpId;
    if (!id) return null;
    return GARTEN_FOLLOWUPS[id] ?? null;
  }, [fd.garten?.was]);

  const internalStepIds = useMemo(
    () => getFachdetailSubStepIds(state, gewerk),
    [state, gewerk]
  );

  const [currentInternalIndex, setCurrentInternalIndex] = useState(0);

  useEffect(() => {
    setCurrentInternalIndex(0);
  }, [gewerk]);

  useEffect(() => {
    if (internalStepIds.length === 0) return;
    setCurrentInternalIndex((i) =>
      Math.min(i, Math.max(0, internalStepIds.length - 1))
    );
  }, [internalStepIds]);

  const activeSubStepId =
    internalStepIds[currentInternalIndex] ?? internalStepIds[0];

  const shouldShowSub = useCallback(
    (id: string) => activeSubStepId === id,
    [activeSubStepId]
  );

  useEffect(() => {
    if (internalStepIds.length === 0) return;
    const hasGap = internalStepIds
      .slice(0, currentInternalIndex)
      .some((step) => !isFachdetailSubStepComplete(state, gewerk, step));
    if (hasGap) {
      onResetFachdetailsForGewerk(gewerk);
      setCurrentInternalIndex(0);
    }
  }, [
    currentInternalIndex,
    internalStepIds,
    gewerk,
    state,
    onResetFachdetailsForGewerk,
  ]);

  useImperativeHandle(
    ref,
    () => ({
      tryConsumeBack() {
        if (currentInternalIndex > 0) {
          const stepId = internalStepIds[currentInternalIndex]!;
          onChange(
            getClearFachdetailPatchFromSubStep(gewerk, stepId, state)
          );
          setCurrentInternalIndex((i) => i - 1);
          onFachInternalNavTick?.();
          return true;
        }
        onResetFachdetailsForGewerk(gewerk);
        return false;
      },
      tryConsumeNext() {
        if (
          currentInternalIndex < internalStepIds.length - 1 &&
          activeSubStepId &&
          isFachdetailSubStepComplete(state, gewerk, activeSubStepId)
        ) {
          setCurrentInternalIndex((i) => i + 1);
          onFachInternalNavTick?.();
          return true;
        }
        return false;
      },
      getNextDisabled() {
        return isFachdetailInternalNextDisabled(
          state,
          gewerk,
          internalStepIds,
          currentInternalIndex
        );
      },
    }),
    [
      currentInternalIndex,
      internalStepIds,
      activeSubStepId,
      gewerk,
      state,
      onChange,
      onResetFachdetailsForGewerk,
      onFachInternalNavTick,
    ]
  );

  return (
    <div className={cn("space-y-6", className)}>
      <div className="fachdetail-header">
        <div className="fachdetail-pill">
          <span className="fachdetail-emoji" aria-hidden>
            {GEWERK_EMOJI[gewerk]}
          </span>
          <span className="fachdetail-name">{GEWERK_LABEL[gewerk]}</span>
          {totalGewerke > 1 ? (
            <span className="fachdetail-count">
              {gewerkIndex + 1} von {totalGewerke}
            </span>
          ) : null}
        </div>
        <h2 className="fachdetail-question">
          {getFachdetailIntroQuestionTitle(gewerk, isNotfall, state)}
        </h2>
        <p className="fachdetail-why">
          {isNotfall
            ? "Damit wir vorbereitet sind wenn wir kommen."
            : "Damit wir den Aufwand einschätzen können."}
        </p>
      </div>

      {b.includes("bad") &&
      (b.includes("elektro") ||
        b.includes("strom") ||
        b.includes("elektrik")) &&
      (gewerk === "sanitaer" || gewerk === "elektro") ? (
        <p className="rounded-xl bg-transparent px-0 py-0 text-[12px] leading-snug text-text-secondary">
          <span className="font-semibold text-text-primary">Bad + Elektro:</span>{" "}
          Wir koordinieren Wasser, Strom und Termine zwischen Sanitär- und
          Elektroarbeit — ein Ansprechpartner für den Ablauf.
        </p>
      ) : null}

      {gewerk === "elektro" && needElektro ? (
        <section className="space-y-3">
          {isNotfall && shouldShowSub(FACHDETAILS_NOTFALL.elektro.id) ? (
            <SingleQuestionBlock
              q={FACHDETAILS_NOTFALL.elektro}
              selected={fd.elektro?.problem}
              educationOpen={Boolean(eduKeys.elektro_q1)}
              onToggleEdu={() => toggleEdu("elektro_q1")}
              optionEduOpen={eduKeys}
              onToggleOptionEdu={toggleEdu}
              onSelect={(value) => {
                onChange({
                  elektro: {
                    problem: value,
                    folge: undefined,
                  },
                });
              }}
            />
          ) : !isNotfall && shouldShowSub(elektroQ1.id) ? (
            <SingleQuestionBlock
              q={elektroQ1}
              selected={fd.elektro?.problem}
              educationOpen={Boolean(eduKeys.elektro_q1)}
              onToggleEdu={() => toggleEdu("elektro_q1")}
              optionEduOpen={eduKeys}
              onToggleOptionEdu={toggleEdu}
              onSelect={(value) => {
                onChange({
                  elektro: {
                    problem: value,
                    folge: undefined,
                  },
                });
              }}
            />
          ) : !isNotfall &&
            elektroFollowQ &&
            shouldShowSub(elektroFollowQ.id) ? (
            <FollowUpPanel show scrollDep={elektroFollowQ.id}>
              <SingleQuestionBlock
                q={elektroFollowQ}
                selected={fd.elektro?.folge}
                educationOpen={Boolean(eduKeys[elektroFollowQ.id])}
                onToggleEdu={() => toggleEdu(elektroFollowQ.id)}
                optionEduOpen={eduKeys}
                onToggleOptionEdu={toggleEdu}
                onSelect={(value) => {
                  onChange({
                    elektro: {
                      ...fd.elektro,
                      problem: fd.elektro?.problem,
                      folge: value,
                    },
                  });
                }}
              />
            </FollowUpPanel>
          ) : null}
        </section>
      ) : null}

      {gewerk === "sanitaer" && needSan ? (
        <section className="space-y-3">
          {isNotfall && shouldShowSub(FACHDETAILS_NOTFALL.sanitaer.id) ? (
            <SingleQuestionBlock
              q={FACHDETAILS_NOTFALL.sanitaer}
              selected={fd.sanitaer?.notfallSchwere}
              educationOpen={Boolean(eduKeys.san_notfall)}
              onToggleEdu={() => toggleEdu("san_notfall")}
              optionEduOpen={eduKeys}
              onToggleOptionEdu={toggleEdu}
              onSelect={(value) => {
                onChange({
                  sanitaer: {
                    notfallSchwere: value,
                    lage: undefined,
                    rohre: undefined,
                    badWas: undefined,
                    badObjekte: undefined,
                  },
                });
              }}
            />
          ) : !isNotfall ? (
            <>
              {erneuernBad &&
              !fd.sanitaer?.badWas &&
              shouldShowSub(SANITAER_BAD_Q.id) ? (
                <SingleQuestionBlock
                  q={SANITAER_BAD_Q}
                  selected={fd.sanitaer?.badWas}
                  educationOpen={Boolean(eduKeys.san_bad)}
                  onToggleEdu={() => toggleEdu("san_bad")}
                  optionEduOpen={eduKeys}
                  onToggleOptionEdu={toggleEdu}
                  onSelect={(value) => {
                    onChange({
                      sanitaer: {
                        ...fd.sanitaer,
                        lage:
                          value === "wanne_dusche"
                            ? ("sichtbar" as const)
                            : undefined,
                        rohre: undefined,
                        badWas: value,
                        badObjekte:
                          value === "objekte"
                            ? fd.sanitaer?.badObjekte
                            : undefined,
                      },
                    });
                  }}
                />
              ) : erneuernBad &&
                fd.sanitaer?.badWas === "objekte" &&
                badFollowMulti &&
                (fd.sanitaer.badObjekte?.length ?? 0) === 0 &&
                shouldShowSub(SANITAER_BAD_OBJEKTE_MULTI.id) ? (
                <FollowUpPanel show scrollDep={badFollowMulti.id}>
                  <div className="space-y-3">
                    <h3 className="text-[15px] font-semibold text-text-primary">
                      {badFollowMulti.title}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {badFollowMulti.options.map((opt) => {
                        const set = new Set(fd.sanitaer?.badObjekte ?? []);
                        const active = set.has(opt.value);
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              const next = new Set(
                                fd.sanitaer?.badObjekte ?? []
                              );
                              if (next.has(opt.value)) next.delete(opt.value);
                              else next.add(opt.value);
                              onChange({
                                sanitaer: {
                                  ...fd.sanitaer,
                                  lage: fd.sanitaer?.lage,
                                  rohre: fd.sanitaer?.rohre,
                                  badWas: fd.sanitaer?.badWas,
                                  badObjekte: Array.from(next),
                                },
                              });
                            }}
                            className={cn(
                              "rounded-full border border-border-default bg-surface-card px-3 py-1.5 text-[12px] font-medium text-text-secondary transition-colors",
                              active
                                ? "funnel-tile-selected text-text-primary"
                                : "funnel-tile-hover"
                            )}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </FollowUpPanel>
              ) : erneuernBad ? null : needBadExtra &&
                !fd.sanitaer?.badWas &&
                shouldShowSub(SANITAER_BAD_Q.id) ? (
                <SingleQuestionBlock
                  q={SANITAER_BAD_Q}
                  selected={fd.sanitaer?.badWas}
                  educationOpen={Boolean(eduKeys.san_bad)}
                  onToggleEdu={() => toggleEdu("san_bad")}
                  optionEduOpen={eduKeys}
                  onToggleOptionEdu={toggleEdu}
                  onSelect={(value) => {
                    onChange({
                      sanitaer: {
                        ...fd.sanitaer,
                        lage: fd.sanitaer?.lage,
                        rohre: fd.sanitaer?.rohre,
                        badWas: value,
                        badObjekte:
                          value === "objekte"
                            ? fd.sanitaer?.badObjekte
                            : undefined,
                      },
                    });
                  }}
                />
              ) : needBadExtra &&
                fd.sanitaer?.badWas === "objekte" &&
                badFollowMulti &&
                (fd.sanitaer.badObjekte?.length ?? 0) === 0 &&
                shouldShowSub(SANITAER_BAD_OBJEKTE_MULTI.id) ? (
                <FollowUpPanel show scrollDep={badFollowMulti.id}>
                  <div className="space-y-3">
                    <h3 className="text-[15px] font-semibold text-text-primary">
                      {badFollowMulti.title}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {badFollowMulti.options.map((opt) => {
                        const set = new Set(fd.sanitaer?.badObjekte ?? []);
                        const active = set.has(opt.value);
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              const next = new Set(
                                fd.sanitaer?.badObjekte ?? []
                              );
                              if (next.has(opt.value)) next.delete(opt.value);
                              else next.add(opt.value);
                              onChange({
                                sanitaer: {
                                  ...fd.sanitaer,
                                  lage: fd.sanitaer?.lage,
                                  rohre: fd.sanitaer?.rohre,
                                  badWas: fd.sanitaer?.badWas,
                                  badObjekte: Array.from(next),
                                },
                              });
                            }}
                            className={cn(
                              "rounded-full border border-border-default bg-surface-card px-3 py-1.5 text-[12px] font-medium text-text-secondary transition-colors",
                              active
                                ? "funnel-tile-selected text-text-primary"
                                : "funnel-tile-hover"
                            )}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </FollowUpPanel>
              ) : !sanitaerShortDone(
                  b,
                  state.situation,
                  fd.sanitaer ?? {}
                ) &&
                !fd.sanitaer?.lage &&
                shouldShowSub(SANITAER_Q1.id) ? (
                <SingleQuestionBlock
                  q={SANITAER_Q1}
                  selected={fd.sanitaer?.lage}
                  educationOpen={Boolean(eduKeys.san_q1)}
                  onToggleEdu={() => toggleEdu("san_q1")}
                  optionEduOpen={eduKeys}
                  onToggleOptionEdu={toggleEdu}
                  onSelect={(value) => {
                    onChange({
                      sanitaer: {
                        ...fd.sanitaer,
                        lage: value,
                        rohre:
                          value === "wand" ? fd.sanitaer?.rohre : undefined,
                      },
                    });
                  }}
                />
              ) : fd.sanitaer?.lage === "wand" &&
                fd.sanitaer?.rohre === undefined &&
                sanFollowQ &&
                shouldShowSub(SANITAER_FOLLOWUPS.sanitaer_folge_rohre.id) ? (
                <FollowUpPanel show scrollDep={sanFollowQ.id}>
                  <SingleQuestionBlock
                    q={sanFollowQ}
                    selected={fd.sanitaer?.rohre}
                    educationOpen={Boolean(eduKeys[sanFollowQ.id])}
                    onToggleEdu={() => toggleEdu(sanFollowQ.id)}
                    optionEduOpen={eduKeys}
                    onToggleOptionEdu={toggleEdu}
                    onSelect={(value) => {
                      onChange({
                        sanitaer: {
                          ...fd.sanitaer,
                          lage: fd.sanitaer?.lage,
                          rohre: value,
                        },
                      });
                    }}
                  />
                </FollowUpPanel>
              ) : null}
            </>
          ) : null}
        </section>
      ) : null}

      {gewerk === "heizung" && needHeizung ? (
        <section className="space-y-3">
          {isNotfall && shouldShowSub(FACHDETAILS_NOTFALL.heizung.id) ? (
            <SingleQuestionBlock
              q={FACHDETAILS_NOTFALL.heizung}
              selected={fd.heizung?.typ}
              educationOpen={Boolean(eduKeys.heiz_q1)}
              onToggleEdu={() => toggleEdu("heiz_q1")}
              optionEduOpen={eduKeys}
              onToggleOptionEdu={toggleEdu}
              onSelect={(value) => {
                onChange({
                  heizung: {
                    typ: value,
                    alter: undefined,
                    vorhaben: undefined,
                  },
                });
              }}
            />
          ) : state.situation === "kaputt" &&
            shouldShowSub(HEIZUNG_KAPUTT_Q1.id) ? (
            <SingleQuestionBlock
              q={HEIZUNG_KAPUTT_Q1}
              selected={fd.heizung?.typ}
              educationOpen={Boolean(eduKeys.heiz_kaputt)}
              onToggleEdu={() => toggleEdu("heiz_kaputt")}
              optionEduOpen={eduKeys}
              onToggleOptionEdu={toggleEdu}
              onSelect={(value) => {
                onChange({
                  heizung: {
                    typ: value,
                    alter: undefined,
                    vorhaben: undefined,
                  },
                });
              }}
            />
          ) : state.situation !== "kaputt" &&
            shouldShowSub(HEIZUNG_Q1.id) ? (
            <SingleQuestionBlock
              q={HEIZUNG_Q1}
              selected={fd.heizung?.typ}
              educationOpen={Boolean(eduKeys.heiz_q1)}
              onToggleEdu={() => toggleEdu("heiz_q1")}
              optionEduOpen={eduKeys}
              onToggleOptionEdu={toggleEdu}
              onSelect={(value) => {
                onChange({
                  heizung: {
                    typ: value,
                    alter: undefined,
                    vorhaben: undefined,
                  },
                });
              }}
            />
          ) : heizFollowQ && shouldShowSub(heizFollowQ.id) ? (
            <FollowUpPanel show scrollDep={heizFollowQ.id}>
              <SingleQuestionBlock
                q={heizFollowQ}
                selected={
                  heizFollowQ.id === "heizung_folge_oel_alter"
                    ? fd.heizung?.alter
                    : fd.heizung?.vorhaben
                }
                educationOpen={Boolean(eduKeys[heizFollowQ.id])}
                onToggleEdu={() => toggleEdu(heizFollowQ.id)}
                optionEduOpen={eduKeys}
                onToggleOptionEdu={toggleEdu}
                onSelect={(value) => {
                  if (heizFollowQ.id === "heizung_folge_oel_alter") {
                    onChange({
                      heizung: {
                        typ: fd.heizung?.typ,
                        alter: value,
                        vorhaben: undefined,
                      },
                    });
                  } else {
                    onChange({
                      heizung: {
                        typ: fd.heizung?.typ,
                        alter: fd.heizung?.alter,
                        vorhaben: value,
                      },
                    });
                  }
                }}
              />
            </FollowUpPanel>
          ) : null}
        </section>
      ) : null}

      {gewerk === "maler" && needMaler ? (
        <section className="space-y-3">
          {shouldShowSub(MALER_Q1.id) ? (
            <SingleQuestionBlock
              q={MALER_Q1}
              selected={fd.maler?.was}
              educationOpen={Boolean(eduKeys.maler_q1)}
              onToggleEdu={() => toggleEdu("maler_q1")}
              optionEduOpen={eduKeys}
              onToggleOptionEdu={toggleEdu}
              onSelect={(value) => {
                const needsZustand =
                  value === "waende_decke" || value === "komplett";
                const needsFassade = value === "fassade";
                onChange({
                  maler: {
                    was: value,
                    zustand: needsZustand ? fd.maler?.zustand : undefined,
                    fassade: needsFassade ? fd.maler?.fassade : undefined,
                  },
                });
              }}
            />
          ) : malerFollowQ && shouldShowSub(malerFollowQ.id) ? (
            <FollowUpPanel show scrollDep={malerFollowQ.id}>
              <SingleQuestionBlock
                q={malerFollowQ}
                selected={
                  malerFollowQ.id === "maler_folge_fassade"
                    ? fd.maler?.fassade
                    : fd.maler?.zustand
                }
                educationOpen={Boolean(eduKeys[malerFollowQ.id])}
                onToggleEdu={() => toggleEdu(malerFollowQ.id)}
                optionEduOpen={eduKeys}
                onToggleOptionEdu={toggleEdu}
                onSelect={(value) => {
                  if (malerFollowQ.id === "maler_folge_fassade") {
                    onChange({
                      maler: {
                        was: fd.maler?.was,
                        zustand: undefined,
                        fassade: value,
                      },
                    });
                  } else {
                    onChange({
                      maler: {
                        was: fd.maler?.was,
                        zustand: value,
                        fassade: undefined,
                      },
                    });
                  }
                }}
              />
            </FollowUpPanel>
          ) : null}
        </section>
      ) : null}

      {gewerk === "boden" && needBoden ? (
        <section className="space-y-3">
          {shouldShowSub(BODEN_Q1.id) ? (
            <SingleQuestionBlock
              q={BODEN_Q1}
              selected={fd.boden?.aktuell}
              educationOpen={Boolean(eduKeys.boden_q1)}
              onToggleEdu={() => toggleEdu("boden_q1")}
              optionEduOpen={eduKeys}
              onToggleOptionEdu={toggleEdu}
              onSelect={(value) => {
                const prev = fd.boden?.aktuell;
                const sameFollow =
                  (value === "fliesen" && prev === "fliesen") ||
                  ((value === "laminat" || value === "parkett") &&
                    (prev === "laminat" || prev === "parkett"));
                onChange({
                  boden: {
                    aktuell: value,
                    verlegung: sameFollow ? fd.boden?.verlegung : undefined,
                  },
                });
              }}
            />
          ) : bodenFollowQ && shouldShowSub(bodenFollowQ.id) ? (
            <FollowUpPanel show scrollDep={bodenFollowQ.id}>
              <SingleQuestionBlock
                q={bodenFollowQ}
                selected={fd.boden?.verlegung}
                educationOpen={Boolean(eduKeys[bodenFollowQ.id])}
                onToggleEdu={() => toggleEdu(bodenFollowQ.id)}
                optionEduOpen={eduKeys}
                onToggleOptionEdu={toggleEdu}
                onSelect={(value) => {
                  onChange({
                    boden: {
                      aktuell: fd.boden?.aktuell,
                      verlegung: value,
                    },
                  });
                }}
              />
            </FollowUpPanel>
          ) : null}
        </section>
      ) : null}

      {gewerk === "dach" && needDach ? (
        <section className="space-y-3">
          {shouldShowSub(DACH_Q1.id) ? (
            <SingleQuestionBlock
              q={DACH_Q1}
              selected={fd.dach?.vorhaben}
              educationOpen={Boolean(eduKeys.dach_q1)}
              onToggleEdu={() => toggleEdu("dach_q1")}
              optionEduOpen={eduKeys}
              onToggleOptionEdu={toggleEdu}
              onSelect={(value) => {
                const needsAlter =
                  value === "daemmung" || value === "komplett";
                const prevNeeds =
                  fd.dach?.vorhaben === "daemmung" ||
                  fd.dach?.vorhaben === "komplett";
                onChange({
                  dach: {
                    vorhaben: value,
                    alter:
                      needsAlter && prevNeeds ? fd.dach?.alter : undefined,
                  },
                });
              }}
            />
          ) : dachFollowQ && shouldShowSub(dachFollowQ.id) ? (
            <FollowUpPanel show scrollDep={dachFollowQ.id}>
              <SingleQuestionBlock
                q={dachFollowQ}
                selected={fd.dach?.alter}
                educationOpen={Boolean(eduKeys[dachFollowQ.id])}
                onToggleEdu={() => toggleEdu(dachFollowQ.id)}
                optionEduOpen={eduKeys}
                onToggleOptionEdu={toggleEdu}
                onSelect={(value) => {
                  onChange({
                    dach: {
                      vorhaben: fd.dach?.vorhaben,
                      alter: value,
                    },
                  });
                }}
              />
            </FollowUpPanel>
          ) : null}
        </section>
      ) : null}

      {gewerk === "fenster" && needFenster ? (
        <section className="space-y-3">
          {shouldShowSub(
            fensterDefektKaputt ? "fenster_defekt_was" : "fenster_ausstattung"
          ) ? (
            <SingleQuestionBlock
            q={fensterDefektKaputt ? FENSTER_DEFEKT_Q1 : FENSTER_Q1}
            selected={
              fensterDefektKaputt
                ? fd.fenster?.defekt
                : fd.fenster?.ausstattung
            }
            educationOpen={Boolean(eduKeys.fenster_q1)}
            onToggleEdu={() => toggleEdu("fenster_q1")}
            optionEduOpen={eduKeys}
            onToggleOptionEdu={toggleEdu}
            onSelect={(value) => {
              if (fensterDefektKaputt) {
                onChange({
                  fenster: {
                    defekt: value,
                    ausstattung: undefined,
                  },
                });
              } else {
                onChange({
                  fenster: {
                    defekt: undefined,
                    ausstattung: value as "standard" | "premium",
                  },
                });
              }
            }}
          />
          ) : null}
        </section>
      ) : null}

      {gewerk === "garten" && needGarten ? (
        <section className="space-y-3">
          {shouldShowSub(GARTEN_Q1.id) ? (
            <SingleQuestionBlock
              q={GARTEN_Q1}
              selected={fd.garten?.was}
              educationOpen={Boolean(eduKeys.garten_q1)}
              onToggleEdu={() => toggleEdu("garten_q1")}
              optionEduOpen={eduKeys}
              onToggleOptionEdu={toggleEdu}
              onSelect={(value) => {
                onChange({
                  garten: {
                    was: value,
                    haeufigkeit:
                      value === "pflege" ? fd.garten?.haeufigkeit : undefined,
                    baumgroesse:
                      value === "baum" ? fd.garten?.baumgroesse : undefined,
                    gestaltung:
                      value === "gestaltung"
                        ? fd.garten?.gestaltung
                        : undefined,
                  },
                });
              }}
            />
          ) : gartenFollowQ && shouldShowSub(gartenFollowQ.id) ? (
            <FollowUpPanel show scrollDep={gartenFollowQ.id}>
              {gartenFollowQ.inputType === "multi" ? (
                <div className="space-y-3">
                  <h3 className="text-[15px] font-semibold text-text-primary">
                    {gartenFollowQ.title}
                  </h3>
                  <div className="space-y-3">
                    {gartenFollowQ.options.map((opt) => {
                      const set = new Set(fd.garten?.gestaltung ?? []);
                      const active = set.has(opt.value);
                      const oKey = optionEduKey(gartenFollowQ.id, opt.value);
                      const optEduOpen = Boolean(eduKeys[oKey]);
                      return (
                        <div key={opt.value} className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const next = new Set(
                                  fd.garten?.gestaltung ?? []
                                );
                                if (next.has(opt.value)) next.delete(opt.value);
                                else next.add(opt.value);
                                onChange({
                                  garten: {
                                    ...fd.garten,
                                    was: fd.garten?.was,
                                    haeufigkeit: fd.garten?.haeufigkeit,
                                    baumgroesse: fd.garten?.baumgroesse,
                                    gestaltung: Array.from(next),
                                  },
                                });
                              }}
                              className={cn(
                                "rounded-full border border-border-default bg-surface-card px-3 py-1.5 text-[12px] font-medium text-text-secondary transition-colors",
                                active
                                  ? "funnel-tile-selected text-text-primary"
                                  : "funnel-tile-hover"
                              )}
                            >
                              {opt.label}
                            </button>
                            {opt.education ? (
                              <button
                                type="button"
                                onClick={() => toggleEdu(oKey)}
                                className="text-[13px] text-text-tertiary hover:text-text-secondary"
                                aria-label="Hinweis zur Option"
                              >
                                ℹ
                              </button>
                            ) : null}
                          </div>
                          {opt.education && optEduOpen ? (
                            <div
                              className="rounded-lg px-3 py-2 text-[12px] leading-relaxed"
                              style={{
                                color: "var(--fl-text-3, #9e9e9e)",
                                background:
                                  "var(--fl-bg, var(--surface-muted))",
                              }}
                            >
                              {opt.education}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <SingleQuestionBlock
                  q={gartenFollowQ}
                  selected={
                    gartenFollowQ.id === "garten_folge_haeufigkeit"
                      ? fd.garten?.haeufigkeit
                      : fd.garten?.baumgroesse
                  }
                  educationOpen={Boolean(eduKeys[gartenFollowQ.id])}
                  onToggleEdu={() => toggleEdu(gartenFollowQ.id)}
                  optionEduOpen={eduKeys}
                  onToggleOptionEdu={toggleEdu}
                  onSelect={(value) => {
                    if (gartenFollowQ.id === "garten_folge_haeufigkeit") {
                      onChange({
                        garten: {
                          was: fd.garten?.was,
                          haeufigkeit: value,
                          baumgroesse: fd.garten?.baumgroesse,
                          gestaltung: fd.garten?.gestaltung,
                        },
                      });
                    } else {
                      onChange({
                        garten: {
                          was: fd.garten?.was,
                          haeufigkeit: fd.garten?.haeufigkeit,
                          baumgroesse: value,
                          gestaltung: fd.garten?.gestaltung,
                        },
                      });
                    }
                  }}
                />
              )}
            </FollowUpPanel>
          ) : null}
        </section>
      ) : null}
      {isLastFachdetailScreen && (showOmitHint ?? false) ? (
        <div className="fachdetail-omit-hinweis">
          <p>
            Weitere Details zu anderen Gewerken klären wir beim Vor-Ort-Termin.
          </p>
        </div>
      ) : null}
      <section className="fachdetail-freitext mt-6 space-y-2 border-t border-border-default pt-5">
        <label
          className="block text-sm font-semibold text-text-primary"
          htmlFor={`fachdetail-freitext-${gewerk}`}
        >
          Noch etwas hinzufügen?
        </label>
        <p className="text-xs text-text-tertiary">Optional — max. 150 Zeichen</p>
        <textarea
          id={`fachdetail-freitext-${gewerk}`}
          className="focus:border-fl-accent min-h-[4.5rem] w-full resize-y rounded-xl border border-border-default bg-surface-card px-3 py-2 text-sm text-text-primary outline-none transition-colors placeholder:text-text-tertiary"
          rows={3}
          maxLength={150}
          placeholder="Beschreibe kurz was du planst oder was das Problem ist…"
          value={freitextValue(fd, gewerk)}
          onChange={(e) => onChange(freitextPatch(fd, gewerk, e.target.value))}
        />
      </section>
    </div>
  );
});

FachdetailsStep.displayName = "FachdetailsStep";
