"use client";

import { useEffect, useState } from "react";

import { PortalButton } from "@/components/portal/PortalButton";
import { PortalIcon } from "@/components/portal/PortalIcon";

/** Supabase-Storage liefert mit ?download= die Datei als Download (sonst nur Anzeige im Browser). */
function downloadHref(url: string, index: number): string {
  if (!/\/storage\/v1\/object\//.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}download=${encodeURIComponent(`Foto-${index + 1}.jpg`)}`;
}

/** Foto groß ansehen: ✕ / Tipp daneben / Esc schließt, Pfeiltasten blättern, Herunterladen. */
export function FotoLightbox({
  urls,
  index,
  onIndex,
  onClose,
}: {
  urls: string[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (urls.length < 2) return;
      if (e.key === "ArrowRight") onIndex((index + 1) % urls.length);
      if (e.key === "ArrowLeft") onIndex((index - 1 + urls.length) % urls.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [urls.length, index, onIndex, onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Foto-Ansicht"
      onClick={onClose}
    >
      <div className="absolute right-4 top-4 flex gap-2" onClick={(ev) => ev.stopPropagation()}>
        <a
          href={downloadHref(urls[index] ?? "", index)}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="rounded-pill bg-white/15 p-2 text-white"
          aria-label="Foto herunterladen"
          title="Herunterladen"
        >
          <PortalIcon n="download" ctx="default" className="h-5 w-5" aria-hidden />
        </a>
        <PortalButton
          variant="ghost"
          type="button"
          className="rounded-pill bg-white/15 p-2 text-white"
          aria-label="Schließen"
          onClick={onClose}
        >
          <PortalIcon n="x" ctx="default" className="h-5 w-5" aria-hidden />
        </PortalButton>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={urls[index]}
        alt=""
        className="max-h-[90vh] max-w-[min(96vw,1100px)] rounded-card object-contain"
        onClick={(ev) => ev.stopPropagation()}
      />
      {urls.length > 1 ? (
        <p className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-pill bg-black/55 px-3 py-1 text-fs-meta font-semibold text-white">
          {index + 1} / {urls.length}
        </p>
      ) : null}
    </div>
  );
}

/** Vorschaubilder; Antippen öffnet groß. */
export function FotoGalerie({ urls, label = "Foto" }: { urls: string[]; label?: string }) {
  const [offen, setOffen] = useState<number | null>(null);
  if (!urls.length) return null;
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {urls.map((url, i) => (
          <PortalButton
            variant="ghost"
            action={false}
            key={`${url}-${i}`}
            type="button"
            className="block h-[4.5rem] w-[4.5rem] overflow-hidden rounded-sheet border border-border-light bg-muted/20 p-0 sm:h-24 sm:w-24"
            onClick={() => setOffen(i)}
            aria-label={`${label} ${i + 1} vergrößern`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`${label} ${i + 1}`} className="h-full w-full object-cover" />
          </PortalButton>
        ))}
      </div>
      {offen != null ? (
        <FotoLightbox urls={urls} index={offen} onIndex={setOffen} onClose={() => setOffen(null)} />
      ) : null}
    </>
  );
}
