"use client";

import { PortalIcon } from "@/components/portal/PortalIcon";
import { useState } from "react";
import { PortalButton } from "@/components/portal/PortalButton";

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

function FotoThumbs({
  urls,
  size = "sm",
}: {
  urls: string[];
  size?: "sm" | "md";
}) {
  if (urls.length === 0) return null;
  const box =
    size === "sm"
      ? "h-10 w-10 rounded-card"
      : "h-[4.5rem] w-[4.5rem] rounded-sheet border border-border-default";
  return (
    <div
      className={cn(
        "flex gap-1.5 overflow-x-auto [-webkit-overflow-scrolling:touch]",
        size === "md" && "gap-2 pb-0.5"
      )}
      role="list"
      aria-label={`${urls.length} Foto${urls.length === 1 ? "" : "s"}`}
    >
      {urls.map((url, i) => (
        <a
          key={`${url}-${i}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          role="listitem"
          className={cn(
            "relative shrink-0 overflow-hidden bg-white",
            box
          )}
          onClick={(e) => e.stopPropagation()}
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
  );
}

/**
 * Unter einer Leistung: Accordion mit den eigenen Updates (Text + Fotos + Datum).
 * Text nur anzeigen wenn vorhanden; Fotos als Thumbnails (kein „Ohne Text“).
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
      <PortalButton
        variant="ghost"
        type="button"
        className="flex min-h-[40px] w-full items-center justify-between gap-2 rounded-sheet border border-border-light bg-[var(--p2-bg)] px-3 py-2 text-left"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-fs-meta font-bold text-text-primary">
          {eintraege.length === 1
            ? "1 Update"
            : `${eintraege.length} Updates`}
        </span>
        <PortalIcon n="chevron-down" ctx="default" className={cn(
            "h-4 w-4 shrink-0 text-text-tertiary transition-transform",
            open && "rotate-180"
          )} aria-hidden />
      </PortalButton>

      {open ? (
        <ul className="mt-1.5 divide-y divide-border-light overflow-hidden rounded-sheet border border-border-light bg-white">
          {eintraege.map((e) => {
            const rowOpen = openId === e.id;
            const label = eintragTypLabel(e.typ) || e.titel;
            const text = e.beschreibung?.trim() || "";
            const hasFotos = e.fotos.length > 0;
            return (
              <li key={e.id}>
                <PortalButton
                  variant="ghost"
                  type="button"
                  className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left"
                  aria-expanded={rowOpen}
                  onClick={() => setOpenId(rowOpen ? null : e.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-fs-meta font-bold text-text-primary">
                        {label}
                      </span>
                      <span className="text-fs-caption tabular-nums text-text-tertiary">
                        {fmtDatumZeit(e.datum)}
                      </span>
                    </div>
                    {!rowOpen && text ? (
                      <p className="mt-0.5 line-clamp-2 text-fs-meta text-text-secondary">
                        {text}
                      </p>
                    ) : null}
                    {!rowOpen && hasFotos ? (
                      <div className="mt-1.5">
                        <FotoThumbs urls={e.fotos.slice(0, 6)} size="sm" />
                      </div>
                    ) : null}
                  </div>
                  <PortalIcon n="chevron-down" ctx="row" className={cn(
                      "mt-1 h-4 w-4 shrink-0 text-text-tertiary transition-transform",
                      rowOpen && "rotate-180"
                    )} aria-hidden />
                </PortalButton>
                {rowOpen ? (
                  <div className="space-y-2.5 border-t border-border-light bg-[var(--p2-bg)] px-3 py-3">
                    {text ? (
                      <p className="whitespace-pre-wrap text-fs-meta leading-relaxed text-text-primary">
                        {text}
                      </p>
                    ) : null}
                    {hasFotos ? (
                      <FotoThumbs urls={e.fotos} size="md" />
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
