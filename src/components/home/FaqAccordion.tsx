"use client";

import { useState } from "react";

export type FaqAccordionItem = { q: string; a: string };

export function FaqAccordion({ items }: { items: FaqAccordionItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-2xl">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div
            key={i}
            className="border-b border-border-default last:border-b-0"
          >
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 py-4 text-left"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : i)}
            >
              <span className="font-semibold text-text-primary">{item.q}</span>
              <span
                className="shrink-0 text-lg font-light leading-none text-funnel-accent"
                aria-hidden
              >
                {isOpen ? "−" : "+"}
              </span>
            </button>
            {isOpen ? (
              <p className="pb-4 text-sm leading-relaxed text-text-secondary">
                {item.a}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
