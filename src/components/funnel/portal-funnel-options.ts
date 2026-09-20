import {
  SITUATIONEN_CONFIG,
} from "@/lib/funnel/config";
import { MELDE_KAPUTT_BEREICH_OPTIONS } from "@/lib/funnel/melde-kaputt-flow";
import type { Situation } from "@/lib/funnel/types";
import type { StepOption } from "@/lib/types";

export function asLibOpt(opt: {
  value: string;
  label: string;
  hint?: string;
  icon?: string;
}): StepOption {
  return {
    value: opt.value,
    label: opt.label,
    hint: opt.hint,
    icon: opt.icon,
  };
}

export function portalPriceIsReliable(
  price: {
    min: number;
    max: number;
    resultModus?: string;
    komplexReason?: string | null;
  } | null
): boolean {
  if (!price) return false;
  if (price.min <= 0 && price.max <= 0) return false;
  if (price.resultModus === "zu_komplex") return false;
  if (price.komplexReason === "no_mapping_found") return false;
  return true;
}

export function bereicheOptions(
  situation: Situation,
  meldeKaputt: boolean
): StepOption[] {
  if (meldeKaputt && situation === "kaputt") {
    return MELDE_KAPUTT_BEREICH_OPTIONS.map((o) => ({
      value: o.bereich === "elektro" ? "elektro" : o.bereich,
      label: o.label,
      hint: o.hint,
      icon: o.icon,
    }));
  }
  const steps = SITUATIONEN_CONFIG[situation]?.steps ?? [];
  const s = steps.find((x) => x.id.includes("bereiche"));
  return (s?.options ?? []) as StepOption[];
}

export function dringlichkeitOptions(opts?: { stripSlaCopy?: boolean }): StepOption[] {
  const steps = SITUATIONEN_CONFIG.kaputt.steps;
  const s = steps.find((x) => x.id === "kaputt_dringlichkeit");
  const raw = (s?.options ?? []) as Array<
    StepOption & { infoText?: string; warnText?: string }
  >;
  if (!opts?.stripSlaCopy) return raw;
  // Melde / HV-intern: keine Zeitversprechen zu Terminen
  return raw.map((o) => {
    const { infoText: _i, warnText: _w, infoExpand: _e, ...rest } = o as StepOption & {
      infoText?: string;
      warnText?: string;
      infoExpand?: string;
    };
    return rest;
  });
}

export function optionLabel(options: StepOption[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export function fachAnswerLabel(
  optionen: Array<{ value: string; label: string }>,
  raw: string | string[] | undefined
): string {
  if (raw == null || raw === "") return "—";
  const values = Array.isArray(raw)
    ? raw
    : String(raw)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  if (values.length === 0) return "—";
  return values
    .map((v) => optionen.find((o) => o.value === v)?.label ?? v)
    .join(", ");
}

