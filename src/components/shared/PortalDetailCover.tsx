"use client";

import { Pencil } from "lucide-react";
import type { ReactNode } from "react";

import { isPortalDefaultMediaUrl } from "@/lib/portal2/portal-media";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { cn } from "@/lib/utils";

export type PortalDetailCoverProps = {
  coverUrl?: string | null;
  onBack: () => void;
  backLabel?: string;
  onEdit?: () => void;
  /** Optional title/content overlay (z. B. unter den Buttons). */
  children?: ReactNode;
  className?: string;
  /** Edit-Button aria/title. */
  editLabel?: string;
};

/**
 * Full-bleed Detail-Cover — Zurück links, optional Edit (Stift) rechts.
 * Ohne Bild: Gradient/Muted-Fläche mit denselben Overlays.
 */
export function PortalDetailCover({
  coverUrl,
  onBack,
  backLabel = "← Zurück",
  onEdit,
  children,
  className,
  editLabel = "Bearbeiten",
}: PortalDetailCoverProps) {
  const src =
    coverUrl?.trim() && !isPortalDefaultMediaUrl(coverUrl)
      ? coverUrl.trim()
      : null;

  return (
    <div
      className={cn(
        "relative w-full shrink-0 overflow-hidden",
        "h-[200px] sm:h-[220px]",
        className
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 bg-muted"
          style={{
            background:
              "linear-gradient(135deg, #1A3D2B 0%, #2E7D52 60%, #0f766e 100%)",
          }}
          aria-hidden
        />
      )}

      {/* Leichte Abdunkelung für Lesbarkeit der Overlays */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/20"
        aria-hidden
      />

      <button
        type="button"
        onClick={onBack}
        className="absolute left-3.5 top-3 z-10 inline-flex h-9 items-center gap-1 rounded-full border border-black/10 px-3 text-[13px] font-semibold shadow-md backdrop-blur-[2px]"
        style={{
          background: "rgba(240, 242, 240, 0.95)",
          color: PORTAL_VAR.sub,
        }}
      >
        {backLabel}
      </button>

      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className={cn(
            "absolute right-3.5 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full",
            "border border-white/40 bg-black/55 text-white shadow-sm backdrop-blur-[2px]",
            "transition-colors hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          )}
          title={editLabel}
          aria-label={editLabel}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : null}

      {children ? (
        <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-3.5 pt-8">
          {children}
        </div>
      ) : null}
    </div>
  );
}
