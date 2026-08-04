import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

export function PartnerStarRatingDisplay({
  value,
  max = 5,
  size = "md",
  className,
}: {
  value: number;
  max?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const clamped = Math.min(max, Math.max(0, Math.round(value)));
  const iconClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${clamped} von ${max} Sternen`}
    >
      {Array.from({ length: max }, (_, i) => {
        const filled = i < clamped;
        return (
          <Star
            key={i}
            className={cn(
              iconClass,
              filled
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-border-default"
            )}
            aria-hidden
          />
        );
      })}
    </div>
  );
}
