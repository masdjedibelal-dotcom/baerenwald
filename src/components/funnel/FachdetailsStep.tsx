"use client";

import { useMemo } from "react";

import { SelectionTile } from "@/components/funnel/SelectionTile";
import { buildPatchForFachdetailAnswer } from "@/lib/funnel/fachdetail-answer-sync";
import {
  FACHDETAIL_QUESTIONS,
  fachdetailAnswer,
  getActiveFachdetailQuestions,
  type FachdetailOption,
} from "@/lib/funnel/fachdetail-questions-flat";
import type { FachdetailsState, FunnelState } from "@/lib/funnel/types";
import type { StepOption as LibStepOption } from "@/lib/types";
import { cn } from "@/lib/utils";

function asLibOpt(o: FachdetailOption): LibStepOption {
  return {
    value: o.value,
    label: o.label,
    hint: o.hint,
    emoji: o.emoji,
    warnText: o.direktKomplex ? o.komplex_text : undefined,
  };
}

function readMultiAnswer(
  raw: string | string[] | undefined
): string[] {
  if (Array.isArray(raw)) return [...raw];
  if (typeof raw === "string" && raw.trim()) {
    return raw.split(",").filter(Boolean);
  }
  return [];
}

export type FachdetailsStepProps = {
  questionId: string;
  state: FunnelState;
  onPatch: (patch: Partial<FachdetailsState>) => void;
  /** Einzelauswahl: Patch speichern und sofort zum nächsten Screen (mit frischer Sequenz). */
  onAfterSingleAnswer: (patch: Partial<FachdetailsState>) => void;
  showOmitHint: boolean;
  detailIndex: number;
  detailTotal: number;
};

export function FachdetailsStep({
  questionId,
  state,
  onPatch,
  onAfterSingleAnswer,
  showOmitHint,
  detailIndex,
  detailTotal,
}: FachdetailsStepProps) {
  const question = useMemo(
    () => FACHDETAIL_QUESTIONS.find((q) => q.id === questionId),
    [questionId]
  );

  const active = useMemo(
    () => getActiveFachdetailQuestions(state),
    [state.bereiche, state.situation, state.fachdetails]
  );

  const isLastForGewerk = useMemo(() => {
    if (!question) return false;
    const same = active.filter((q) => q.gewerk === question.gewerk);
    return same[same.length - 1]?.id === questionId;
  }, [active, question, questionId]);

  const freitextKey = question
    ? (`${question.gewerk}_freitext` as const)
    : null;

  const freitextVal =
    freitextKey && typeof fachdetailAnswer(state, freitextKey) === "string"
      ? (fachdetailAnswer(state, freitextKey) as string)
      : "";

  if (!question) {
    return null;
  }

  const rawVal = fachdetailAnswer(state, questionId);
  const multi = question.inputType === "multi";
  const selectedMulti = readMultiAnswer(rawVal);
  const selectedSingle =
    typeof rawVal === "string" ? rawVal : selectedMulti[0] ?? "";

  const applyAnswer = (value: string | string[]) => {
    const patch = buildPatchForFachdetailAnswer(
      state.fachdetails,
      questionId,
      value
    );
    onPatch(patch);
  };

  return (
    <div className="space-y-5">
      {showOmitHint ? (
        <p className="rounded-lg border border-border-default bg-surface-muted px-3 py-2 text-sm text-text-secondary">
          Du hast viele Bereiche gewählt — wir gehen die wichtigsten Schritte
          nacheinander durch.
        </p>
      ) : null}

      <div>
        {detailTotal > 1 ? (
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-text-tertiary">
            Detail {detailIndex + 1} / {detailTotal}
          </p>
        ) : null}
        <h2 className="text-lg font-semibold text-text-primary">
          {question.frage}
        </h2>
        {question.subtext ? (
          <p className="mt-1 text-sm text-text-secondary">{question.subtext}</p>
        ) : null}
      </div>

      <div className="space-y-3">
        {question.optionen.map((opt) => {
          const libOpt = asLibOpt(opt);
          const selected = multi
            ? selectedMulti.includes(opt.value)
            : selectedSingle === opt.value;
          return (
            <SelectionTile
              key={opt.value}
              option={libOpt}
              selected={selected}
              multi={multi}
              onChange={(value, sel) => {
                if (multi) {
                  const next = new Set(selectedMulti);
                  if (sel) next.add(value);
                  else next.delete(value);
                  const arr = Array.from(next);
                  applyAnswer(arr);
                  return;
                }
                if (!sel) return;
                const patch = buildPatchForFachdetailAnswer(
                  state.fachdetails,
                  questionId,
                  value
                );
                onAfterSingleAnswer(patch);
              }}
            />
          );
        })}
      </div>

      {isLastForGewerk && freitextKey ? (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-text-secondary">
            Noch etwas hinzufügen?{" "}
            <span className="font-normal text-text-tertiary">(optional)</span>
          </span>
          <textarea
            className={cn(
              "min-h-[88px] w-full rounded-xl border border-border-default bg-surface-card px-3 py-2 text-sm text-text-primary",
              "placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-funnel-accent"
            )}
            maxLength={150}
            placeholder="Optional — max. 150 Zeichen"
            value={freitextVal}
            onChange={(e) => {
              const patch = buildPatchForFachdetailAnswer(
                state.fachdetails,
                freitextKey,
                e.target.value
              );
              onPatch(patch);
            }}
          />
        </label>
      ) : null}
    </div>
  );
}
