"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  urls: string[];
  /** Max. Thumbnails in der Galerie. */
  maxThumbs?: number;
  className?: string;
};

async function downloadFoto(url: string, index: number) {
  const filename = `foto-${index + 1}.jpg`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

/**
 * HV-Portal: Melde-Fotos als Kacheln — Klick öffnet Großansicht inkl. Download.
 */
export function PortalPhotoGallery({
  urls,
  maxThumbs = 12,
  className,
}: Props) {
  const list = urls.map((u) => u.trim()).filter(Boolean).slice(0, maxThumbs);
  const [index, setIndex] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);

  const open = index != null;
  const current = open ? list[index] : null;

  const close = useCallback(() => setIndex(null), []);

  const goPrev = useCallback(() => {
    setIndex((i) =>
      i == null || list.length < 2
        ? i
        : (i + list.length - 1) % list.length
    );
  }, [list.length]);

  const goNext = useCallback(() => {
    setIndex((i) =>
      i == null || list.length < 2 ? i : (i + 1) % list.length
    );
  }, [list.length]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close, goPrev, goNext]);

  if (list.length === 0) return null;

  return (
    <>
      <div
        className={cn(
          "grid grid-cols-3 gap-2 sm:grid-cols-4",
          className
        )}
      >
        {list.map((src, i) => (
          <button
            key={`${src}-${i}`}
            type="button"
            onClick={() => setIndex(i)}
            className="group relative aspect-square overflow-hidden rounded-lg border border-border-light bg-muted/20 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--org-primary,#2E7D52)]"
            aria-label={`Foto ${i + 1} vergrößern`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              className="h-full w-full object-cover transition group-hover:scale-[1.03]"
            />
          </button>
        ))}
      </div>

      {open && current ? (
        <div
          className="fixed inset-0 z-[220] flex flex-col bg-black/80"
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ${index! + 1} von ${list.length}`}
          onClick={close}
        >
          <div
            className="flex shrink-0 items-center justify-between gap-2 px-3 py-3 text-white sm:px-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[13px] font-semibold">
              Foto {index! + 1} / {list.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={downloading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-[13px] font-semibold hover:bg-white/25 disabled:opacity-60"
                onClick={() => {
                  setDownloading(true);
                  void downloadFoto(current, index!).finally(() =>
                    setDownloading(false)
                  );
                }}
              >
                <Download className="h-4 w-4" aria-hidden />
                {downloading ? "…" : "Download"}
              </button>
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-lg bg-white/15 hover:bg-white/25"
                aria-label="Schließen"
                onClick={close}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </div>

          <div
            className="relative flex min-h-0 flex-1 items-center justify-center px-3 pb-6 sm:px-10"
            onClick={(e) => e.stopPropagation()}
          >
            {list.length > 1 ? (
              <button
                type="button"
                className="absolute left-2 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25 sm:left-4"
                aria-label="Vorheriges Foto"
                onClick={goPrev}
              >
                <ChevronLeft className="h-6 w-6" aria-hidden />
              </button>
            ) : null}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current}
              alt={`Foto ${index! + 1}`}
              className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
            />
            {list.length > 1 ? (
              <button
                type="button"
                className="absolute right-2 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25 sm:right-4"
                aria-label="Nächstes Foto"
                onClick={goNext}
              >
                <ChevronRight className="h-6 w-6" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
