import { SITE_CONFIG } from "@/lib/config";
import { cn } from "@/lib/utils";

/**
 * Unauffälliger WL-Hinweis: Bärenwald als technischer Service
 * (Funnel-Footer + Mieter-Legal-Seiten).
 */
export function MeldeServiceByLine({
  className,
  as = "p",
}: {
  className?: string;
  as?: "p" | "span";
}) {
  const Tag = as;
  return (
    <Tag
      className={cn(
        "text-[10.5px] leading-snug text-text-tertiary/80",
        className
      )}
    >
      Technischer Service von {SITE_CONFIG.companyName}
    </Tag>
  );
}
