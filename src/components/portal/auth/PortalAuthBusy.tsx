"use client";

import { PortalContentBusy } from "@/components/shared/PortalContentBusy";

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
    <PortalContentBusy
      variant="inline"
      title={title}
      body={body}
      className="portal-auth-busy"
    />
  );
}
