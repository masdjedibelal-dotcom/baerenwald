"use client";

import { Pencil } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { resolveObjektCoverSrc } from "@/lib/portal2/portal-media";
import { cn } from "@/lib/utils";

export type PortalDetailCoverProps = {
  coverUrl?: string | null;
  onBack?: () => void;
  backLabel?: string;
  onEdit?: () => void;
  children?: ReactNode;
  className?: string;
  editLabel?: string;
  /** Deep Green: Status-Glas-Pill + Titel im Cover */
  statusLabel?: string | null;
  statusColor?: string | null;
  title?: string | null;
};

const COVER_FALLBACK_GRADIENT =
  "linear-gradient(135deg, #1A3D2B 0%, #2E7D52 60%, #0f766e 100%)";

/**
 * Detail-Cover 200 px — Deep Green Overlay, Zurück-Pill, Status+Titel unten.
 */
export function PortalDetailCover({
  coverUrl,
  onBack,
  backLabel = "← Zurück",
  onEdit,
  children,
  className,
  editLabel = "Bearbeiten",
  statusLabel,
  statusColor,
  title,
}: PortalDetailCoverProps) {
  const src = resolveObjektCoverSrc(coverUrl);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showCaption = Boolean(title?.trim() || statusLabel?.trim());

  return (
    <div
      className={cn(
        "portal-detail-cover relative w-full shrink-0 overflow-hidden",
        className
      )}
    >
      {!failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: COVER_FALLBACK_GRADIENT }}
          aria-hidden
        />
      )}

      <div className="portal-detail-cover-overlay" aria-hidden />

      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="portal-detail-cover-back"
        >
          {backLabel}
        </button>
      ) : null}

      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="portal-detail-cover-edit"
          title={editLabel}
          aria-label={editLabel}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : null}

      {children ? (
        <div className="portal-detail-cover-caption">{children}</div>
      ) : showCaption ? (
        <div className="portal-detail-cover-caption">
          {statusLabel?.trim() ? (
            <span className="portal-detail-cover-status">
              <span
                className="portal-detail-cover-status-dot"
                style={{
                  background: statusColor || "var(--p2-primary, #2e7d52)",
                }}
                aria-hidden
              />
              {statusLabel}
            </span>
          ) : null}
          {title?.trim() ? (
            <h1 className="portal-detail-cover-title">{title}</h1>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
