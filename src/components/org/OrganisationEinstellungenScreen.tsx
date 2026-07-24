"use client";

import { OrganisationBrandingEditor } from "@/components/org/OrganisationBrandingEditor";
import { OrganisationFreigabeRegelnPanel } from "@/components/org/OrganisationFreigabeRegelnPanel";
import { OrganisationMeldeMaterial } from "@/components/org/OrganisationMeldeMaterial";
import { OrganisationMieterLegalLinksPanel } from "@/components/org/OrganisationMieterLegalLinksPanel";
import { PortalKontoSicherheitPanel } from "@/components/shared/PortalKontoSicherheitPanel";
import { PortalPushPermissionRationale } from "@/components/shared/PortalPushPermissionRationale";
import { PortalTrackingConsentPanel } from "@/components/shared/PortalTrackingConsentPanel";
import { PortalEinstellungenShell } from "@/components/shared/PortalEinstellungenShell";
import { EinstellungenPfRow } from "@/components/shared/PortalEinstellungenUi";
import type { OrganisationKunde } from "@/lib/org/types";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { SITE_CONFIG } from "@/lib/config";

type Props = {
  kunde: OrganisationKunde;
  objektCount: number;
  onSaved: () => void;
  isAdmin?: boolean;
};

/**
 * D6 / D12 HV — Mock Einstellungen mit Subnav:
 * Profil · Branding & White-Label · Freigabe-Regeln
 */
export function OrganisationEinstellungenScreen({
  kunde,
  objektCount,
  onSaved,
  isAdmin = true,
}: Props) {
  const displayName =
    kunde.org_anzeigename?.trim() || kunde.name?.trim() || "Verwaltung";
  const tel =
    kunde.org_telefon?.trim() ||
    kunde.mieter_kontakt_telefon?.trim() ||
    "—";

  return (
    <PortalEinstellungenShell variant="hv">
      {(tab) => {
        if (tab === "profil") {
          return (
            <div className="flex flex-col gap-3">
              <div className="space-y-2.5">
                <h3
                  className="text-sm font-bold"
                  style={{
                    color: PORTAL_VAR.ink,
                    fontFamily: "var(--p2-font-head, " + PORTAL_VAR.head + ")",
                  }}
                >
                  Profil
                </h3>
                <EinstellungenPfRow label="Name" value={displayName} />
                <EinstellungenPfRow
                  label="E-Mail"
                  value={kunde.email?.trim() || "—"}
                />
                <EinstellungenPfRow label="Telefon" value={tel} />
                <p
                  className="text-[12.5px] leading-relaxed"
                  style={{ color: PORTAL_VAR.sub }}
                >
                  Diese Kontaktdaten gelten auch für die Mieter-Kommunikation
                  (Melde-Flow, Status und E-Mails).
                </p>
              </div>

              <OrganisationMeldeMaterial
                kunde={kunde}
                objektCount={objektCount}
                nested
              />

              <OrganisationMieterLegalLinksPanel
                kunde={kunde}
                readOnly={!isAdmin}
                onSaved={onSaved}
              />

              <PortalKontoSicherheitPanel
                signOutHref="/portal/login"
                allowDelete={false}
                deleteBlockedHint={`Organisationskonten löschen Sie über den Support (${SITE_CONFIG.email}). Passwort ändern und Datenexport sind möglich.`}
              />

              <PortalPushPermissionRationale role="hv" embedded />
              <PortalTrackingConsentPanel />
            </div>
          );
        }

        if (tab === "branding") {
          return (
            <OrganisationBrandingEditor
              kunde={kunde}
              readOnly={!isAdmin}
              onSaved={onSaved}
              nested
            />
          );
        }

        return (
          <OrganisationFreigabeRegelnPanel
            kunde={kunde}
            onSaved={onSaved}
            isAdmin={isAdmin}
          />
        );
      }}
    </PortalEinstellungenShell>
  );
}
