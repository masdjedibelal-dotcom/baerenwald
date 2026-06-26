"use client";

import { Camera } from "lucide-react";

import { cn } from "@/lib/utils";

type PartnerJobFieldActionsProps = {
  onAddPhoto: () => void;
  className?: string;
};

export function PartnerJobFieldActions({
  onAddPhoto,
  className,
}: PartnerJobFieldActionsProps) {
  return (
    <div className={cn(className)}>
      <button
        type="button"
        onClick={onAddPhoto}
        className="btn-pill-primary portal-btn inline-flex min-h-[48px] w-full items-center justify-center gap-2 !py-3"
      >
        <Camera className="h-4 w-4 shrink-0" aria-hidden />
        Foto
      </button>
    </div>
  );
}
