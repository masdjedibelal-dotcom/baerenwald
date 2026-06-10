"use client";

import { Camera, MapPin } from "lucide-react";

import { partnerMapsHref } from "@/lib/partner/partner-maps-href";
import type { PortalAnfrageLeadSource } from "@/lib/portal/portal-anfrage-display";
import { cn } from "@/lib/utils";

type PartnerJobFieldActionsProps = {
  lead?: PortalAnfrageLeadSource | null;
  plz?: string | null;
  ort?: string | null;
  onAddPhoto?: () => void;
  className?: string;
};

export function PartnerJobFieldActions({
  lead,
  plz,
  ort,
  onAddPhoto,
  className,
}: PartnerJobFieldActionsProps) {
  const mapsHref = partnerMapsHref({ lead, plz, ort });
  if (!mapsHref && !onAddPhoto) return null;

  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      {mapsHref ? (
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-pill-outline portal-btn inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 !py-3"
        >
          <MapPin className="h-4 w-4 shrink-0" aria-hidden />
          Route
        </a>
      ) : null}
      {onAddPhoto ? (
        <button
          type="button"
          onClick={onAddPhoto}
          className="btn-pill-primary portal-btn inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 !py-3"
        >
          <Camera className="h-4 w-4 shrink-0" aria-hidden />
          Foto
        </button>
      ) : null}
    </div>
  );
}
