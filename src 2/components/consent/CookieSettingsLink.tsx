"use client";

import { useCookieConsent } from "@/components/consent/CookieConsentContext";
import { cn } from "@/lib/utils";

export function CookieSettingsLink({
  className,
}: {
  className?: string;
}) {
  const { openSettings } = useCookieConsent();

  return (
    <button
      type="button"
      onClick={openSettings}
      className={cn("cookie-settings-link", className)}
    >
      Cookie-Einstellungen
    </button>
  );
}
