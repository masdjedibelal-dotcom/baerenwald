"use client";

import { useRef, useState, type DragEvent } from "react";

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
 * Dekoratives Gebäudefoto — Klick oder Drop zum direkten Hochladen / Ersetzen.
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
              "absolute inset-0 flex flex-col items-center justify-center gap-1 text-center transition-colors",
              dragging ? "bg-black/40" : "bg-black/20 hover:bg-black/40",
              "focus-visible:bg-black/40"
            )}
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            disabled={busy}
            title={hasCustom ? "Gebäudefoto ersetzen" : "Gebäudefoto hochladen"}
          >
            <span className="rounded-full bg-black/55 px-2.5 py-1 text-[11.5px] font-semibold text-white shadow-sm backdrop-blur-[2px]">
              {busy
                ? "Wird hochgeladen…"
                : hasCustom
                  ? "Foto ersetzen"
                  : "Foto hochladen"}
            </span>
            {variant === "card" ? (
              <span className="text-[11px] text-white/95">
                Tippen oder Datei hierher ziehen
              </span>
            ) : null}
          </button>
        </>
      ) : null}
    </div>
  );
}
