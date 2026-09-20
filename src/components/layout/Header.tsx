import { SiteIcon } from "@/components/ui/SiteIcon";
import { cn } from "@/lib/utils";

export interface HeaderProps {
  companyName: string;
  phone: string;
  logoInitials: string;
  accentColor?: string;
  className?: string;
}

export function Header({
  companyName,
  phone,
  logoInitials,
  accentColor = "var(--fl-accent-dark)",
  className,
}: HeaderProps) {
  const initials = logoInitials.slice(0, 2).toUpperCase();
  const tel = phone.replace(/\s/g, "");

  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex h-[60px] min-h-[60px] items-center justify-between border-b border-border-default bg-surface-card/80 px-[18px] backdrop-blur-[12px]",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-pill text-xs font-semibold text-white"
          style={{ backgroundColor: accentColor }}
          aria-hidden
        >
          {initials}
        </div>
        <span className="truncate text-fs-title font-semibold text-text-primary">
          {companyName}
        </span>
      </div>
      <a
        href={`tel:${tel}`}
        className="flex shrink-0 items-center gap-1.5 text-fs-body text-[var(--fl-faint2)]"
      >
        <SiteIcon n="phone" ctx="default" size={14} className="shrink-0 text-[var(--fl-faint2)]" />
        <span className="hidden sm:inline">{phone}</span>
      </a>
    </header>
  );
}
