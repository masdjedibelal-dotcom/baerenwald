import { cn } from "@/lib/utils";

export interface HeaderProps {
  companyName: string;
  phone: string;
  logoInitials: string;
  accentColor?: string;
  className?: string;
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Header({
  companyName,
  phone,
  logoInitials,
  accentColor = "#1B4332",
  className,
}: HeaderProps) {
  const initials = logoInitials.slice(0, 2).toUpperCase();
  const tel = phone.replace(/\s/g, "");

  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex h-[60px] min-h-[60px] items-center justify-between border-b border-[#e8e8e8] bg-white/80 px-[18px] backdrop-blur-[12px]",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
          style={{ backgroundColor: accentColor }}
          aria-hidden
        >
          {initials}
        </div>
        <span className="truncate text-[15px] font-semibold text-text-primary">
          {companyName}
        </span>
      </div>
      <a
        href={`tel:${tel}`}
        className="flex shrink-0 items-center gap-1.5 text-[14px] text-[#999]"
      >
        <PhoneIcon className="shrink-0 text-[#999]" />
        <span className="hidden sm:inline">{phone}</span>
      </a>
    </header>
  );
}
