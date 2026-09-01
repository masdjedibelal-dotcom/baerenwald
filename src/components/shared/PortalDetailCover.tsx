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
  /** @deprecated Status nur noch in Kopfkarte / Timeline — nicht im Hero. */
  statusLabel?: string | null;
  /** @deprecated */
  statusColor?: string | null;
  title?: string | null;
};

/**
 * Detail-Hero — gleiche Vorlage wie Dashboard (grün + dezentes Cover-Bild).
 */
export function PortalDetailCover({
  coverUrl,
  onBack,
  backLabel = "← Zurück",
  onEdit,
  children,
  className,
  editLabel = "Bearbeiten",
  title,
}: PortalDetailCoverProps) {
  const src = resolveObjektCoverSrc(coverUrl);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showTitle = Boolean(title?.trim());

  return (
    <section
      className={cn(
        "portal-dash-hero portal-detail-hero relative w-full shrink-0 overflow-hidden",
        className
      )}
    >
      {src && !failed ? (
        <div
          className="portal-dash-hero-bg"
          style={{ backgroundImage: `url(${src})` }}
          aria-hidden
        />
      ) : null}

      <div className="portal-dash-hero-scrim" aria-hidden />

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

      <div className="portal-detail-hero-inner">
        {children ? (
          children
        ) : showTitle ? (
          <h1 className="portal-dash-hero-name">{title}</h1>
        ) : null}
      </div>
    </section>
  );
}
