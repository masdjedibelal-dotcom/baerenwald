"use client";

import { Check, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "E-Mail" },
  { id: 2, label: "Bedingungen" },
  { id: 3, label: "Konto" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function PartnerRegisterStepNav({ current }: { current: StepId }) {
  return (
    <nav aria-label="Registrierungsschritte" className="w-full">
      <ol className="flex items-center justify-center gap-0.5 sm:gap-1">
        {STEPS.map((s, index) => {
          const done = current > s.id;
          const active = current === s.id;

          return (
            <li key={s.id} className="flex items-center gap-0.5 sm:gap-1">
              <div
                className={cn(
                  "flex min-w-0 flex-col items-center gap-1 px-0.5 sm:px-1",
                  active && "text-accent"
                )}
                aria-current={active ? "step" : undefined}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                    done && "bg-accent text-white",
                    active && !done && "bg-accent text-white ring-2 ring-accent/25",
                    !done && !active && "bg-muted text-text-tertiary"
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : s.id}
                </span>
                <span
                  className={cn(
                    "max-w-[4.5rem] truncate text-center text-[10px] font-medium leading-tight sm:max-w-none sm:text-[11px]",
                    active ? "text-accent" : done ? "text-text-secondary" : "text-text-tertiary"
                  )}
                >
                  {s.label}
                </span>
              </div>
              {index < STEPS.length - 1 ? (
                <ChevronRight
                  className="mb-4 h-3.5 w-3.5 shrink-0 text-border-default sm:h-4 sm:w-4"
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
