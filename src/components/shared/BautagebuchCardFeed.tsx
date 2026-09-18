"use client";

import { useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";

import {
  bautagebuchAnhangLabel,
  isBautagebuchPdfUrl,
} from "@/lib/partner/bautagebuch-anhang";
import { cn } from "@/lib/utils";

export type BautagebuchCardEintrag = {
  id: string;
  datum?: string | null;
  titel: string;
  beschreibung?: string | null;
  fotos?: string[];
};

/** Datum als tt.mm.yyyy (ohne Monatsnamen). */
function fmtDatum(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  if (!Number.isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }
  const day = String(v).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const [y, m, dd] = day.split("-");
    return `${dd}.${m}.${y}`;
  }
  return "—";
}

/**
 * HV/Kunde Updates-Feed: eine Card pro Eintrag.
 * Titel → Datum (tt.mm.yyyy) → Text (2 Zeilen …) → Aufklappen nach unten → Fotos.
 */
export function BautagebuchCardFeed({
  eintraege,
  heading = "Bautagebuch",
  emptyText = "Noch keine Einträge im Bautagebuch.",
  className,
  headerAction,
}: {
  eintraege: BautagebuchCardEintrag[];
  heading?: string;
  emptyText?: string;
  className?: string;
  headerAction?: React.ReactNode;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{
    urls: string[];
    index: number;
  } | null>(null);

  const sorted = [...eintraege].sort((a, b) => {
    const ta = a.datum ?? "";
    const tb = b.datum ?? "";
    return tb.localeCompare(ta);
  });

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setLightbox(null);
        return;
      }
      if (e.key === "ArrowRight") {
        setLightbox((cur) =>
          cur && cur.urls.length > 1
            ? { ...cur, index: (cur.index + 1) % cur.urls.length }
            : cur
        );
      }
      if (e.key === "ArrowLeft") {
        setLightbox((cur) =>
          cur && cur.urls.length > 1
            ? {
                ...cur,
                index: (cur.index - 1 + cur.urls.length) % cur.urls.length,
              }
            : cur
        );
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  function openLightbox(urls: string[], index: number) {
    const images = urls.filter((u) => u && !isBautagebuchPdfUrl(u));
    if (!images.length) return;
    const idx = Math.max(0, Math.min(index, images.length - 1));
    setLightbox({ urls: images, index: idx });
  }

  return (
    <section className={cn("space-y-3 border-t border-border-light pt-5", className)}>
      {(heading || headerAction) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {heading ? (
            <h4 className="portal-text-label text-text-tertiary">{heading}</h4>
          ) : (
            <span />
          )}
          {headerAction}
        </div>
      )}
      {sorted.length === 0 ? (
        <p className="portal-text-body rounded-xl border border-dashed border-border-light bg-muted/20 px-3 py-5 text-center text-text-secondary">
          {emptyText}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {sorted.map((e) => {
            const open = openId === e.id;
            const desc = e.beschreibung?.trim() || "";
            const imageFotos = (e.fotos ?? []).filter(
              (u) => u && !isBautagebuchPdfUrl(u)
            );
            const pdfFotos = (e.fotos ?? []).filter(
              (u) => u && isBautagebuchPdfUrl(u)
            );
            return (
              <li key={e.id}>
                <div className="overflow-hidden rounded-xl border border-border-light bg-white shadow-[0_1px_2px_rgba(22,32,27,0.04)]">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : e.id)}
                    className="flex w-full flex-col gap-1 px-3.5 py-3 text-left transition-colors hover:bg-muted/15"
                    aria-expanded={open}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="portal-text-card-title">{e.titel}</p>
                        <p className="portal-text-meta mt-0.5 tabular-nums text-text-tertiary">
                          {fmtDatum(e.datum)}
                        </p>
                      </div>
                      <ChevronDown
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0 text-text-tertiary transition-transform",
                          open && "rotate-180"
                        )}
                        aria-hidden
                      />
                    </div>
                    {desc ? (
                      open ? null : (
                        <p className="portal-text-body mt-1 line-clamp-2 text-text-secondary">
                          {desc}
                        </p>
                      )
                    ) : null}
                  </button>

                  {open ? (
                    <div className="space-y-3 border-t border-border-light px-3.5 pb-3.5 pt-3">
                      {desc ? (
                        <p className="portal-text-body whitespace-pre-wrap text-text-secondary">
                          {desc}
                        </p>
                      ) : (
                        <p className="portal-text-meta text-text-tertiary">
                          Kein Text
                        </p>
                      )}
                      {imageFotos.length > 0 || pdfFotos.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {imageFotos.map((url, i) => (
                            <button
                              key={`${e.id}-foto-${i}`}
                              type="button"
                              className="block h-[4.5rem] w-[4.5rem] overflow-hidden rounded-xl border border-border-light bg-muted/20 sm:h-24 sm:w-24"
                              onClick={() => openLightbox(imageFotos, i)}
                              aria-label={`${bautagebuchAnhangLabel(url, i)} vergrößern`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt={bautagebuchAnhangLabel(url, i)}
                                className="h-full w-full object-cover"
                              />
                            </button>
                          ))}
                          {pdfFotos.map((url, i) => (
                            <a
                              key={`${e.id}-pdf-${i}`}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="portal-text-body inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-border-light bg-surface-card px-3 py-2 font-medium text-brand-primary hover:bg-muted/30"
                            >
                              {bautagebuchAnhangLabel(url, i)}
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {lightbox ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Foto-Ansicht"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white"
            aria-label="Schließen"
            onClick={() => setLightbox(null)}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.urls[lightbox.index]}
            alt=""
            className="max-h-[90vh] max-w-[min(96vw,1100px)] rounded-lg object-contain"
            onClick={(ev) => ev.stopPropagation()}
          />
          {lightbox.urls.length > 1 ? (
            <p className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[13px] font-semibold text-white">
              {lightbox.index + 1} / {lightbox.urls.length}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
