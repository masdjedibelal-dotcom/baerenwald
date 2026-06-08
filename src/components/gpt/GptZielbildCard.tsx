"use client";

import { Download, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  composeGptZielbildBlob,
  composeGptZielbildDataUrl,
  downloadZielbildBlob,
} from "@/lib/gpt-viz/compose-zielbild";

type GptZielbildCardProps = {
  vorherUrl: string;
  nachherUrl: string;
  beschreibung: string;
  className?: string;
};

export function GptZielbildCard({
  vorherUrl,
  nachherUrl,
  beschreibung,
  className,
}: GptZielbildCardProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPreviewUrl(null);

    void composeGptZielbildDataUrl({ vorherUrl, nachherUrl, beschreibung })
      .then((url) => {
        if (!cancelled) setPreviewUrl(url);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Zielbild konnte nicht erstellt werden (Bilder prüfen).");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [vorherUrl, nachherUrl, beschreibung]);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    setError(null);
    try {
      const blob = await composeGptZielbildBlob({ vorherUrl, nachherUrl, beschreibung });
      downloadZielbildBlob(blob);
    } catch {
      setError("Download fehlgeschlagen.");
    } finally {
      setDownloading(false);
    }
  }, [vorherUrl, nachherUrl, beschreibung]);

  return (
    <div className={className ? `gpt-zielbild-card ${className}` : "gpt-zielbild-card"}>
      <div className="gpt-zielbild-card-head">
        <p className="gpt-zielbild-card-title">Dein Zielbild</p>
        <p className="gpt-zielbild-card-hint">
          Bärenwald GPT · Vorher &amp; Nachher · dein Wunsch — eine PNG zum Teilen oder Speichern.
        </p>
      </div>

      <div className="gpt-zielbild-card-preview">
        {loading ? (
          <div className="gpt-zielbild-card-loading">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
            <span>Zielbild wird erstellt …</span>
          </div>
        ) : previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Bärenwald GPT Zielbild" className="gpt-zielbild-card-img" />
        ) : (
          <p className="gpt-viz-muted">{error ?? "Keine Vorschau"}</p>
        )}
      </div>

      <button
        type="button"
        className="gpt-viz-btn gpt-viz-btn--primary gpt-zielbild-download"
        disabled={loading || downloading || !previewUrl}
        onClick={() => void handleDownload()}
      >
        {downloading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Wird gespeichert …
          </>
        ) : (
          <>
            <Download className="h-4 w-4" aria-hidden />
            Zielbild herunterladen
          </>
        )}
      </button>

      {error ? <p className="gpt-viz-error">{error}</p> : null}
    </div>
  );
}
