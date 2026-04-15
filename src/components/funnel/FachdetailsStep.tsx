"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { SelectionTile } from "@/components/funnel/SelectionTile";
import type { FachdetailsState, FunnelState } from "@/lib/funnel/types";
import {
  countFachdetailGewerke,
  FACHDETAILS_NOTFALL,
  getAktiveFachdetailGewerke,
  type FachdetailGewerkKey,
} from "@/lib/funnel/fachdetails-notfall";
import {
  BODEN_FOLLOWUPS,
  BODEN_Q1,
  DACH_FOLLOWUPS,
  DACH_Q1,
  ELEKTRO_FOLLOWUPS,
  ELEKTRO_Q1,
  GARTEN_FOLLOWUPS,
  GARTEN_Q1,
  HEIZUNG_FOLLOWUPS,
  HEIZUNG_Q1,
  MALER_FOLLOWUPS,
  MALER_Q1,
  type FachdetailOptionDef,
  type FachdetailQuestionDef,
  SANITAER_BAD_OBJEKTE_MULTI,
  SANITAER_BAD_Q,
  SANITAER_FOLLOWUPS,
  SANITAER_Q1,
} from "@/lib/funnel/fachdetails-questions";
import { calculatePrice } from "@/lib/funnel/price-calc";
import { tileIconForStepValue } from "@/lib/funnel-tile-icons";
import { formatCurrencyEUR } from "@/lib/price-calc";
import type { StepOption as LibStepOption } from "@/lib/types";
import { cn } from "@/lib/utils";

function asLibOptFromFach(o: FachdetailOptionDef): LibStepOption {
  return {
    value: o.value,
    label: o.label,
    hint: o.hint,
    emoji: o.emoji,
    warnText: o.warnText,
    infoExpand:
      o.education ??
      (o.value === "weiss_nicht"
        ? "Kein Problem — wir rechnen mit einem Durchschnittswert"
        : undefined),
  };
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
    <div className="rounded-xl border border-border-default bg-surface-card p-4">
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
          className="mt-2 text-[12px] leading-relaxed"
          style={{
            color: "var(--fl-text-3, #9e9e9e)",
            background: "var(--fl-bg, var(--surface-muted))",
            borderLeft: "2px solid var(--fl-accent, var(--accent))",
            padding: "8px 12px",
            borderRadius: "0 6px 6px 0",
          }}
        >
          {q.education}
        </div>
      ) : null}
      <div className="mt-3 space-y-2">
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
                    icon={tileIconForStepValue(opt.value)}
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
                  className="ml-1 text-[12px] leading-relaxed"
                  style={{
                    color: "var(--fl-text-3, #9e9e9e)",
                    background: "var(--fl-bg, var(--surface-muted))",
                    borderLeft: "2px solid var(--fl-accent, var(--accent))",
                    padding: "8px 12px",
                    borderRadius: "0 6px 6px 0",
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

export interface FachdetailsStepProps {
  state: FunnelState;
  onChange: (patch: Partial<FachdetailsState>) => void;
  className?: string;
}

export function FachdetailsStep({
  state,
  onChange,
  className,
}: FachdetailsStepProps) {
  const b = state.bereiche;
  const fd = state.fachdetails;
  const isNotfall = state.situation === "notfall";
  const aktiveGewerke = useMemo(
    () => getAktiveFachdetailGewerke(b, 2),
    [b]
  );
  const showOmitHint = countFachdetailGewerke(b) > 2;

  const showGewerk = useCallback(
    (g: FachdetailGewerkKey) => aktiveGewerke.includes(g),
    [aktiveGewerke]
  );

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

  const elektroFollowQ = useMemo(() => {
    if (isNotfall) return null;
    const p = fd.elektro?.problem;
    if (!p) return null;
    const opt = ELEKTRO_Q1.options.find((o) => o.value === p);
    const id = opt?.followUpId;
    if (!id) return null;
    return ELEKTRO_FOLLOWUPS[id] ?? null;
  }, [fd.elektro?.problem, isNotfall]);

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

  const livePreisZeile = useMemo(() => {
    if (state.situation === "notfall" && state.dringlichkeit === "akut") {
      return { min: 150, max: 600 };
    }
    const r = calculatePrice(state, { preview: true });
    if (r.min <= 0 || r.max <= 0) return null;
    return { min: r.min, max: r.max };
  }, [state]);

  return (
    <div className={cn("space-y-6", className)}>
      {livePreisZeile ? (
        <p className="funnel-live-price-hint text-center text-[13px] font-semibold text-text-primary">
          Aktueller Schätzwert: ca. {formatCurrencyEUR(livePreisZeile.min)} –{" "}
          {formatCurrencyEUR(livePreisZeile.max)}
        </p>
      ) : null}
      {b.includes("bad") &&
      (b.includes("elektro") ||
        b.includes("strom") ||
        b.includes("elektrik")) ? (
        <p className="rounded-xl border border-border-default bg-surface-muted/90 px-3.5 py-2.5 text-[12px] leading-snug text-text-secondary">
          <span className="font-semibold text-text-primary">Bad + Elektro:</span>{" "}
          Wir koordinieren Wasser, Strom und Termine zwischen Sanitär- und
          Elektroarbeit — ein Ansprechpartner für den Ablauf.
        </p>
      ) : null}
      {showOmitHint ? (
        <p className="fachdetails-hinweis">
          Weitere Details klären wir beim Vor-Ort-Termin.
        </p>
      ) : null}

      {showGewerk("elektro") && needElektro ? (
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
            Elektro
          </p>
          <SingleQuestionBlock
            q={isNotfall ? FACHDETAILS_NOTFALL.elektro : ELEKTRO_Q1}
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
          {!isNotfall ? (
            <FollowUpPanel
              show={Boolean(elektroFollowQ)}
              scrollDep={elektroFollowQ?.id}
            >
              {elektroFollowQ ? (
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
              ) : null}
            </FollowUpPanel>
          ) : null}
        </section>
      ) : null}

      {showGewerk("sanitaer") && needSan ? (
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
            Sanitär
          </p>
          {isNotfall ? (
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
          ) : (
            <>
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
                      rohre: value === "wand" ? fd.sanitaer?.rohre : undefined,
                    },
                  });
                }}
              />
              <FollowUpPanel
                show={Boolean(sanFollowQ)}
                scrollDep={sanFollowQ?.id}
              >
                {sanFollowQ ? (
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
                ) : null}
              </FollowUpPanel>
            </>
          )}

          {!isNotfall && needBadExtra ? (
            <div className="space-y-3 pt-1">
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
              <FollowUpPanel
                show={Boolean(badFollowMulti)}
                scrollDep={badFollowMulti?.id}
              >
                {badFollowMulti ? (
                  <div className="rounded-xl border border-border-default bg-surface-card p-4">
                    <h3 className="text-[15px] font-semibold text-text-primary">
                      {badFollowMulti.title}
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {badFollowMulti.options.map((opt) => {
                        const set = new Set(fd.sanitaer?.badObjekte ?? []);
                        const active = set.has(opt.value);
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              const next = new Set(fd.sanitaer?.badObjekte ?? []);
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
                ) : null}
              </FollowUpPanel>
            </div>
          ) : null}
        </section>
      ) : null}

      {showGewerk("heizung") && needHeizung ? (
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
            Heizung
          </p>
          <SingleQuestionBlock
            q={isNotfall ? FACHDETAILS_NOTFALL.heizung : HEIZUNG_Q1}
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
          {!isNotfall ? (
            <FollowUpPanel
              show={Boolean(heizFollowQ)}
              scrollDep={heizFollowQ?.id}
            >
              {heizFollowQ ? (
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
              ) : null}
            </FollowUpPanel>
          ) : null}
        </section>
      ) : null}

      {showGewerk("maler") && needMaler ? (
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
            Maler
          </p>
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
          <FollowUpPanel show={Boolean(malerFollowQ)} scrollDep={malerFollowQ?.id}>
            {malerFollowQ ? (
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
            ) : null}
          </FollowUpPanel>
        </section>
      ) : null}

      {showGewerk("boden") && needBoden ? (
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
            Bodenbelag
          </p>
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
                (value === "laminat" && prev === "laminat");
              onChange({
                boden: {
                  aktuell: value,
                  verlegung: sameFollow ? fd.boden?.verlegung : undefined,
                },
              });
            }}
          />
          <FollowUpPanel show={Boolean(bodenFollowQ)} scrollDep={bodenFollowQ?.id}>
            {bodenFollowQ ? (
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
            ) : null}
          </FollowUpPanel>
        </section>
      ) : null}

      {showGewerk("dach") && needDach ? (
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
            Dach
          </p>
          <SingleQuestionBlock
            q={DACH_Q1}
            selected={fd.dach?.vorhaben}
            educationOpen={Boolean(eduKeys.dach_q1)}
            onToggleEdu={() => toggleEdu("dach_q1")}
            optionEduOpen={eduKeys}
            onToggleOptionEdu={toggleEdu}
            onSelect={(value) => {
              const prevNeeds =
                fd.dach?.vorhaben === "daemmung" ||
                fd.dach?.vorhaben === "komplett";
              const needsAlter =
                value === "daemmung" || value === "komplett";
              onChange({
                dach: {
                  vorhaben: value,
                  alter:
                    needsAlter && prevNeeds ? fd.dach?.alter : undefined,
                },
              });
            }}
          />
          <FollowUpPanel show={Boolean(dachFollowQ)} scrollDep={dachFollowQ?.id}>
            {dachFollowQ ? (
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
            ) : null}
          </FollowUpPanel>
        </section>
      ) : null}

      {showGewerk("garten") && needGarten ? (
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
            Garten
          </p>
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
          <FollowUpPanel
            show={Boolean(gartenFollowQ)}
            scrollDep={gartenFollowQ?.id}
          >
            {gartenFollowQ?.inputType === "multi" ? (
              <div className="rounded-xl border border-border-default bg-surface-card p-4">
                <h3 className="text-[15px] font-semibold text-text-primary">
                  {gartenFollowQ.title}
                </h3>
                <div className="mt-3 space-y-3">
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
                              const next = new Set(fd.garten?.gestaltung ?? []);
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
                            className="text-[12px] leading-relaxed"
                            style={{
                              color: "var(--fl-text-3, #9e9e9e)",
                              background: "var(--fl-bg, var(--surface-muted))",
                              borderLeft:
                                "2px solid var(--fl-accent, var(--accent))",
                              padding: "8px 12px",
                              borderRadius: "0 6px 6px 0",
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
            ) : gartenFollowQ ? (
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
            ) : null}
          </FollowUpPanel>
        </section>
      ) : null}
    </div>
  );
}
