import Link from "next/link";

import { CookieSettingsLink } from "@/components/consent/CookieSettingsLink";
import { cn } from "@/lib/utils";

export function PortalLegalFooter({
  variant,
  className,
}: {
  variant: "partner" | "kunde" | "org";
  className?: string;
}) {
  const datenschutzHref =
    variant === "partner"
      ? "/datenschutz#partner-portal"
      : variant === "org"
        ? "/datenschutz#hausverwaltung"
        : "/datenschutz#meinbaerenwald";

  return (
    <footer
      className={cn(
        "portal-text-meta text-center text-text-tertiary",
        className
      )}
      aria-label="Rechtliches"
    >
      <nav className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <Link href="/impressum" className="underline-offset-2 hover:text-text-secondary hover:underline">
          Impressum
        </Link>
        <span aria-hidden className="text-text-tertiary/60">
          ·
        </span>
        <Link
          href={datenschutzHref}
          className="underline-offset-2 hover:text-text-secondary hover:underline"
        >
          Datenschutz
        </Link>
        <span aria-hidden className="text-text-tertiary/60">
          ·
        </span>
        <CookieSettingsLink className="underline-offset-2 hover:text-text-secondary hover:underline" />
      </nav>
    </footer>
  );
}
