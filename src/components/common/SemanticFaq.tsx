"use client";

import { useState } from "react";

export type SemanticFaqItem = { q: string; a: string };

export function SemanticFaq({ items }: { items: SemanticFaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="faq">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={`${i}-${item.q}`} className={`faq-row${isOpen ? " open" : ""}`}>
            <button
              type="button"
              className="faq-q"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : i)}
            >
              {item.q}
              <span className="faq-ico" aria-hidden>
                +
              </span>
            </button>
            <div className="faq-a">{item.a}</div>
          </div>
        );
      })}
    </div>
  );
}
