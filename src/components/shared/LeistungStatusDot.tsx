import { cn } from "@/lib/utils";

export type LeistungStatusAmpel = "gruen" | "gelb" | "rot";

const AMPLE_CLASS: Record<LeistungStatusAmpel, string> = {
  gruen: "bg-emerald-500",
  gelb: "bg-amber-400",
  rot: "bg-red-500",
};

const AMPLE_LABEL: Record<LeistungStatusAmpel, string> = {
  gruen: "Angenommen",
  gelb: "Aktion nötig",
  rot: "Entfernt",
};

export function leistungStatusAmpelLabel(status: LeistungStatusAmpel): string {
  return AMPLE_LABEL[status];
}

export function resolvePortalLeistungStatusAmpel(input: {
  aenderungBadge?: "neu" | "geaendert" | "entfernt";
  entfernt?: boolean;
}): LeistungStatusAmpel {
  if (input.entfernt || input.aenderungBadge === "entfernt") return "rot";
  if (input.aenderungBadge === "neu" || input.aenderungBadge === "geaendert") return "gelb";
  return "gruen";
}

export function LeistungStatusDot({
  status,
  className,
}: {
  status: LeistungStatusAmpel;
  className?: string;
}) {
  const label = AMPLE_LABEL[status];
  return (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-surface-card",
        AMPLE_CLASS[status],
        className
      )}
      title={label}
      aria-label={`Status: ${label}`}
      role="img"
    />
  );
}
