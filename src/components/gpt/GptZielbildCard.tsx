"use client";

import { Download, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  composeGptZielbildBlob,
  composeGptZielbildDataUrl,
  downloadZielbildBlob,
  erklaerungFromBrief,
  type ZielbildFormat,
} from "@/lib/gpt-viz/compose-zielbild";
import type { GptVizBauErklaerung } from "@/lib/gpt-viz/types";

type GptZielbildCardProps = {
  vorherUrl: string;
  nachherUrl: string;
  erklaerung?: GptVizBauErklaerung | null;
  className?: string;
};

export function GptZielbildCard({
  vorherUrl,
  nachherUrl,
  erklaerung,
  className,
}: GptZielbildCardProps) {
  const resolved = useMemo(() => erklaerungFromBrief(erklaerung), [erklaerung]);
  const [format, setFormat] = useState<ZielbildFormat>("story");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPreviewUrl(null);

    void composeGptZielbildDataUrl({ vorherUrl, nachherUrl, erklaerung: resolved, format })
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
  }, [vorherUrl, nachherUrl, resolved, format]);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    setError(null);
    try {
      const blob = await composeGptZielbildBlob({
        vorherUrl,
        nachherUrl,
        erklaerung: resolved,
        format,
      });
      downloadZielbildBlob(
        blob,
        format === "story" ? "baerenwald-gpt-zielbild-story.png" : "baerenwald-gpt-zielbild.png"
      );
    } catch {
      setError("Download fehlgeschlagen.");
    } finally {
      setDownloading(false);
    }
  }, [vorherUrl, nachherUrl, resolved, format]);

  return (
    <div className={className ? `gpt-zielbild-card ${className}` : "gpt-zielbild-card"}>
      <div className="gpt-zielbild-card-head">
        <p className="gpt-zielbild-card-title">Dein Zielbild</p>
        <p className="gpt-zielbild-card-hint">
          Story 9:16 für Instagram &amp; Pinterest — editorial mit Vorher/Nachher.
        </p>
        <div className="gpt-zielbild-format-toggle" role="tablist" aria-label="Zielbild-Format">
          <button
            type="button"
            role="tab"
            aria-selected={format === "story"}
            className={format === "story" ? "is-active" : undefined}
            onClick={() => setFormat("story")}
          >
            Story 9:16
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={format === "feed"}
            className={format === "feed" ? "is-active" : undefined}
            onClick={() => setFormat("feed")}
          >
            Feed quer
          </button>
        </div>
      </div>

      <div
        className={
          format === "story"
            ? "gpt-zielbild-card-preview gpt-zielbild-card-preview--story"
            : "gpt-zielbild-card-preview"
        }
      >
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
