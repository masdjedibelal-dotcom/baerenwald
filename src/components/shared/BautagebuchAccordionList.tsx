"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export type BautagebuchEintrag = {
  id: string;
  datum?: string | null;
  titel: string;
  beschreibung?: string | null;
  fotos?: string[];
  badges?: React.ReactNode;
  actions?: React.ReactNode;
};

function fmtDatum(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-DE");
}

export function BautagebuchAccordionList({
  eintraege,
  heading = "Bautagebuch",
  emptyText = "Noch keine Einträge im Bautagebuch.",
  className,
}: {
  eintraege: BautagebuchEintrag[];
  heading?: string;
  emptyText?: string;
  className?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className={cn("space-y-2 border-t border-border-light pt-4", className)}>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
        {heading}
      </h4>
      {eintraege.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-light bg-muted/20 px-3 py-4 text-center text-sm text-text-secondary">
          {emptyText}
        </p>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-border-light divide-y divide-border-light">
          {eintraege.map((e) => {
            const open = openId === e.id;
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : e.id)}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/30"
                  aria-expanded={open}
                >
                  <span className="min-w-[5.5rem] shrink-0 text-xs tabular-nums text-text-tertiary">
                    {fmtDatum(e.datum)}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold text-text-primary">
                    {e.titel}
                  </span>
                  {e.badges ? (
                    <span className="hidden shrink-0 flex-wrap gap-1 sm:flex">
                      {e.badges}
                    </span>
                  ) : null}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-text-tertiary transition-transform",
                      open && "rotate-180"
                    )}
                    aria-hidden
                  />
                </button>
                {open ? (
                  <div className="space-y-3 border-t border-border-light bg-muted/15 px-3 py-3 text-sm">
                    {e.badges ? (
                      <div className="flex flex-wrap gap-1 sm:hidden">{e.badges}</div>
                    ) : null}
                    {e.beschreibung ? (
                      <p className="whitespace-pre-wrap text-text-secondary">
                        {e.beschreibung}
                      </p>
                    ) : null}
                    {e.fotos && e.fotos.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {e.fotos.map((url, i) => (
                          <a
                            key={`${e.id}-foto-${i}`}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block h-20 w-20 overflow-hidden rounded-lg border border-border-light"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    ) : null}
                    {e.actions ? <div className="flex flex-wrap gap-2">{e.actions}</div> : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
