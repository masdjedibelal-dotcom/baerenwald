import { labelOrgAnlass } from "@/lib/org/org-anlass";
import { cn } from "@/lib/utils";

type Props = {
  anlass?: string | null;
  className?: string;
};

export function OrgAnlassBadge({ anlass, className }: Props) {
  const label = labelOrgAnlass(anlass);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill bg-muted px-2 py-0.5 text-fs-caption font-medium text-text-secondary",
        className
      )}
    >
      {label}
    </span>
  );
}
