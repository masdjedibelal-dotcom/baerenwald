"use client";

import { Loader2 } from "lucide-react";

type Props = {
  title?: string;
  body?: string;
};

/**
 * Vollständiger Auth-Ladezustand (ersetzt Formular während Login/Redirect).
 */
export function PortalAuthBusy({
  title = "Anmeldung läuft…",
  body = "Einen Moment — wir melden Sie an und öffnen Ihr Portal.",
}: Props) {
  return (
    <div
      className="portal-auth-busy flex flex-col items-center justify-center py-10 text-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2
        className="h-9 w-9 animate-spin text-accent"
        strokeWidth={2}
        aria-hidden
      />
      <h2 className="portal-auth-heading mt-5">{title}</h2>
      <p className="portal-auth-sub mx-auto mt-2 max-w-[320px]">{body}</p>
    </div>
  );
}
