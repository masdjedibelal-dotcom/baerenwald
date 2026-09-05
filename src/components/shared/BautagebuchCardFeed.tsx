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

function fmtDatum(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Kunden-Feed: Karten wie CRM `.bt-inserat` (Titel, Text, Foto + Lightbox).
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="portal-text-label text-text-tertiary">{heading}</h4>
        {headerAction}
      </div>
      {sorted.length === 0 ? (
        <p className="portal-text-body rounded-xl border border-dashed border-border-light bg-muted/20 px-3 py-5 text-center text-text-secondary">
          {emptyText}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {sorted.map((e) => {
            const open = openId === e.id;
            const foto = e.fotos?.[0] ?? null;
            const more = (e.fotos?.length ?? 0) > 1 ? e.fotos!.length - 1 : 0;
            const desc = e.beschreibung?.trim() || "";
            const imageFotos = (e.fotos ?? []).filter(
              (u) => u && !isBautagebuchPdfUrl(u)
            );
            return (
              <li key={e.id}>
                <div
                  className={cn(
                    "flex w-full overflow-hidden rounded-xl border border-border-light bg-white text-left shadow-[0_1px_2px_rgba(22,32,27,0.04)]",
                    !foto && "min-h-[72px]"
                  )}
                >
                  {foto && !isBautagebuchPdfUrl(foto) ? (
                    <button
                      type="button"
                      className="relative h-[88px] w-[88px] shrink-0 bg-muted/30 sm:h-[100px] sm:w-[100px]"
                      onClick={() => openLightbox(imageFotos, 0)}
                      aria-label="Foto vergrößern"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={foto}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      {more > 0 ? (
                        <span className="absolute bottom-1 right-1 rounded bg-black/65 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                          +{more}
                        </span>
                      ) : null}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : e.id)}
                    className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3 py-3 text-left transition-colors hover:bg-muted/20"
                    aria-expanded={open}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="portal-text-card-title line-clamp-2">
                        {e.titel}
                      </span>
                      <ChevronDown
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0 text-text-tertiary transition-transform",
                          open && "rotate-180"
                        )}
                        aria-hidden
                      />
                    </div>
                    {desc && !open ? (
                      <p className="portal-text-body line-clamp-2 text-text-secondary">
                        {desc}
                      </p>
                    ) : null}
                    <span className="portal-text-meta tabular-nums text-text-tertiary">
                      {fmtDatum(e.datum)}
                    </span>
                  </button>
                </div>
                {open ? (
                  <div className="portal-text-body space-y-3 rounded-b-xl border border-t-0 border-border-light bg-muted/15 px-3 py-4">
                    {desc ? (
                      <p className="whitespace-pre-wrap text-text-secondary">{desc}</p>
                    ) : null}
                    {e.fotos && e.fotos.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {e.fotos.map((url, i) =>
                          isBautagebuchPdfUrl(url) ? (
                            <a
                              key={`${e.id}-doc-${i}`}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="portal-text-body inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-border-light bg-surface-card px-3 py-2 font-medium text-brand-primary hover:bg-muted/30"
                            >
                              {bautagebuchAnhangLabel(url, i)}
                            </a>
                          ) : (
                            <button
                              key={`${e.id}-foto-${i}`}
                              type="button"
                              className="block h-20 w-20 overflow-hidden rounded-lg border border-border-light"
                              onClick={() =>
                                openLightbox(
                                  imageFotos,
                                  imageFotos.indexOf(url)
                                )
                              }
                              aria-label={`${bautagebuchAnhangLabel(url, i)} vergrößern`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt={bautagebuchAnhangLabel(url, i)}
                                className="h-full w-full object-cover"
                              />
                            </button>
                          )
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}
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
