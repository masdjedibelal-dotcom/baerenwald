"use client";

import { useRef, useState, type DragEvent } from "react";
import { Pencil } from "lucide-react";

import {
  isPortalDefaultMediaUrl,
  resolveObjektCoverSrc,
} from "@/lib/portal2/portal-media";
import { orgPortalToast, portalToastError } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";

type Props = {
  objektId: string;
  coverUrl?: string | null;
  /** card = 140px Liste · detail = kompakter Thumb */
  variant?: "card" | "detail";
  className?: string;
  onUploaded?: (url: string) => void;
  /** Wenn false: nur Anzeige (Eigentümer-Lesesicht). */
  canUpload?: boolean;
};

/**
 * Gebäudefoto — Bearbeiten-Icon oben rechts öffnet den Upload; Drop bleibt möglich.
 */
export function OrganisationObjektCover({
  objektId,
  coverUrl,
  variant = "card",
  className,
  onUploaded,
  canUpload = true,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const effectiveCover =
    preview ||
    (coverUrl && !isPortalDefaultMediaUrl(coverUrl) ? coverUrl : null);
  const src = resolveObjektCoverSrc(effectiveCover);
  const hasCustom = Boolean(effectiveCover);

  const upload = async (file: File) => {
    if (!canUpload || busy) return;
    if (!file.type.startsWith("image/")) {
      portalToastError("Nur Bilder erlaubt");
      return;
    }
    setBusy(true);
    try {
      const local = URL.createObjectURL(file);
      setPreview(local);
      const fd = new FormData();
      fd.set("objektId", objektId);
      fd.set("file", file);
      const res = await fetch("/api/org/objekte/cover", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as { error?: string; cover_url?: string };
      if (!res.ok || !json.cover_url) {
        setPreview(null);
        portalToastError("Foto nicht gespeichert", json.error);
        return;
      }
      setPreview(json.cover_url);
      onUploaded?.(json.cover_url);
      orgPortalToast.saved();
    } catch {
      setPreview(null);
      portalToastError("Upload fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void upload(f);
  };

  const height = variant === "card" ? "h-[140px]" : "h-[66px] w-24";
  const editLabel = hasCustom
    ? "Gebäudefoto ersetzen"
    : "Gebäudefoto hochladen";

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted",
        variant === "card" ? "w-full rounded-t-xl" : "shrink-0 rounded-[10px]",
        height,
        className
      )}
      onDragOver={(e) => {
        if (!canUpload) return;
        e.preventDefault();
        e.stopPropagation();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={canUpload ? onDrop : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className={cn(
          "h-full w-full object-cover",
          !hasCustom && "opacity-90"
        )}
      />

      {canUpload && dragging ? (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35"
          aria-hidden
        >
          <span className="rounded-full bg-black/55 px-2.5 py-1 text-[11.5px] font-semibold text-white">
            Datei ablegen
          </span>
        </div>
      ) : null}

      {canUpload ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void upload(f);
            }}
          />
          <button
            type="button"
            className={cn(
              "absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full",
              "border border-white/40 bg-black/55 text-white shadow-sm backdrop-blur-[2px]",
              "transition-colors hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
              "disabled:opacity-60"
            )}
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            disabled={busy}
            title={busy ? "Wird hochgeladen…" : editLabel}
            aria-label={busy ? "Wird hochgeladen…" : editLabel}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </button>
        </>
      ) : null}
    </div>
  );
}
