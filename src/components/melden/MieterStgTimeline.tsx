"use client";

import {
  buildMieterStgTimeline,
  type MieterStgStepView,
} from "@/lib/portal2/mieter-wl";
import type { MeldeLang } from "@/lib/melden/melde-i18n";
import { cn } from "@/lib/utils";

import { MieterWlCard } from "@/components/melden/MieterWlFrame";

/**
 * Mock `wlStatus` STG-Timeline — vertikal, Subtitle nur am aktiven Schritt.
 */
export function MieterStgTimeline({
  stufe,
  lang,
  className,
}: {
  stufe: string;
  lang: MeldeLang;
  className?: string;
}) {
  const steps = buildMieterStgTimeline(stufe, lang);
  return (
    <MieterWlCard className={cn("mieter-stg-wrap", className)}>
      <ol className="mieter-stg-list">
        {steps.map((step, i) => (
          <MieterStgRow
            key={step.id}
            step={step}
            index={i}
            isLast={i === steps.length - 1}
          />
        ))}
      </ol>
    </MieterWlCard>
  );
}

function MieterStgRow({
  step,
  index,
  isLast,
}: {
  step: MieterStgStepView;
  index: number;
  isLast: boolean;
}) {
  return (
    <li
      className={cn(
        "mieter-stg-row",
        step.done && "mieter-stg-row--done",
        step.active && "mieter-stg-row--active"
      )}
    >
      <div className="mieter-stg-rail">
        <span className="mieter-stg-dot" aria-hidden>
          {step.done ? "✓" : index + 1}
        </span>
        {!isLast ? <span className="mieter-stg-line" aria-hidden /> : null}
      </div>
      <div className="mieter-stg-copy">
        <p className="mieter-stg-title">{step.title}</p>
        {step.active ? (
          <p className="mieter-stg-sub">{step.subtitle}</p>
        ) : null}
      </div>
    </li>
  );
}
