"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import type { PartnerTagebuchListenEintrag } from "@/app/actions/partner-position-eintraege";
import { eintragTypLabel } from "@/lib/partner/position-lebenszyklus";
import { cn } from "@/lib/utils";

function fmtDatumZeit(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Unter einer Leistung: Accordion mit den eigenen Updates (Text + Fotos + Datum).
 */
export function PartnerLeistungUpdatesAccordion({
  eintraege,
  className,
}: {
  eintraege: PartnerTagebuchListenEintrag[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  if (eintraege.length === 0) return null;

  return (
    <div className={cn("mt-2.5", className)}>
      <button
        type="button"
        className="flex min-h-[40px] w-full items-center justify-between gap-2 rounded-xl border border-border-light bg-[var(--p2-bg,#f5f6f4)] px-3 py-2 text-left"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-[12.5px] font-bold text-text-primary">
          {eintraege.length === 1
            ? "1 Update"
            : `${eintraege.length} Updates`}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-text-tertiary transition-transform",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <ul className="mt-1.5 divide-y divide-border-light overflow-hidden rounded-xl border border-border-light bg-white">
          {eintraege.map((e) => {
            const rowOpen = openId === e.id;
            const label = eintragTypLabel(e.typ) || e.titel;
            const preview =
              e.beschreibung?.trim() ||
              (e.fotos.length > 0 ? `${e.fotos.length} Foto(s)` : "Ohne Text");
            return (
              <li key={e.id}>
                <button
                  type="button"
                  className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left"
                  aria-expanded={rowOpen}
                  onClick={() => setOpenId(rowOpen ? null : e.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-[13px] font-bold text-text-primary">
                        {label}
                      </span>
                      <span className="text-[11.5px] tabular-nums text-text-tertiary">
                        {fmtDatumZeit(e.datum)}
                      </span>
                    </div>
                    {!rowOpen ? (
                      <p className="mt-0.5 line-clamp-1 text-[12.5px] text-text-secondary">
                        {preview}
                      </p>
                    ) : null}
                  </div>
                  {e.fotos[0] && !rowOpen ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={e.fotos[0]}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-lg object-cover"
                    />
                  ) : null}
                  <ChevronDown
                    className={cn(
                      "mt-1 h-4 w-4 shrink-0 text-text-tertiary transition-transform",
                      rowOpen && "rotate-180"
                    )}
                    aria-hidden
                  />
                </button>
                {rowOpen ? (
                  <div className="space-y-2.5 border-t border-border-light bg-[var(--p2-bg,#f5f6f4)] px-3 py-3">
                    {e.beschreibung?.trim() ? (
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-text-primary">
                        {e.beschreibung.trim()}
                      </p>
                    ) : (
                      <p className="text-[12.5px] text-text-tertiary">
                        Kein Text
                      </p>
                    )}
                    {e.fotos.length > 0 ? (
                      <div className="flex gap-2 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch]">
                        {e.fotos.map((url, i) => (
                          <a
                            key={`${e.id}-foto-${i}`}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-xl border border-border-default bg-white"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={`Foto ${i + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
