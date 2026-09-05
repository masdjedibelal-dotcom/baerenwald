import Link from "next/link";

import { CookieSettingsLink } from "@/components/consent/CookieSettingsLink";
import { MeldeServiceByLine } from "@/components/melden/MeldeServiceByLine";
import { cn } from "@/lib/utils";

export function PortalLegalFooter({
  variant,
  className,
  /** Mieter/Eigentümer: Hinweis, dass die HV Bärenwald als Technik nutzt. */
  showServiceBy = false,
}: {
  variant: "partner" | "kunde" | "org";
  className?: string;
  showServiceBy?: boolean;
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
        "portal-legal-footer portal-text-meta text-center text-text-tertiary",
        /* Innerhalb der Shell: Abstand zur Bottom-Nav; Desktop normal */
        "pb-2 lg:pb-0",
        className
      )}
      aria-label="Rechtliches"
    >
      <nav className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <Link
          href="/impressum"
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:text-text-secondary hover:underline"
        >
          Impressum
        </Link>
        <span aria-hidden className="text-text-tertiary/60">
          ·
        </span>
        <Link
          href={datenschutzHref}
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:text-text-secondary hover:underline"
        >
          Datenschutz
        </Link>
        <span aria-hidden className="text-text-tertiary/60">
          ·
        </span>
        <CookieSettingsLink className="underline-offset-2 hover:text-text-secondary hover:underline" />
      </nav>
      {showServiceBy ? (
        <MeldeServiceByLine className="mt-2 block" />
      ) : null}
    </footer>
  );
}
