import type { TimelineStepView } from "@/lib/crm-vorgang/role-status-ui";
import { cn } from "@/lib/utils";

type Props = {
  steps: TimelineStepView[];
  className?: string;
  "aria-label"?: string;
};

/** Horizontale Vorgangs-Timeline (Design P0-2). */
export function VorgangTimeline({ steps, className, "aria-label": ariaLabel }: Props) {
  if (!steps.length) return null;

  return (
    <div
      className={cn("vorgang-timeline", className)}
      role="list"
      aria-label={ariaLabel ?? "Fortschritt"}
    >
      {steps.map((step, i) => (
        <div
          key={step.id}
          role="listitem"
          className={cn(
            "vorgang-timeline-step",
            step.done && "vorgang-timeline-step--done",
            step.active && "vorgang-timeline-step--current"
          )}
        >
          {i > 0 ? <span className="vorgang-timeline-line" aria-hidden /> : null}
          <span className="vorgang-timeline-dot" aria-hidden>
            {step.done ? "✓" : i + 1}
          </span>
          <span className="vorgang-timeline-label">{step.label}</span>
        </div>
      ))}
    </div>
  );
}
