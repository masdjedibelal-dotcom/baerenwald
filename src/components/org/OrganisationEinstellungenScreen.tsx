"use client";

import { OrganisationFreigabeRegelnPanel } from "@/components/org/OrganisationFreigabeRegelnPanel";
import { OrganisationMeldeMaterial } from "@/components/org/OrganisationMeldeMaterial";
import { OrganisationMieterLegalLinksPanel } from "@/components/org/OrganisationMieterLegalLinksPanel";
import { OrganisationPortalAngabenPanel } from "@/components/org/OrganisationPortalAngabenPanel";
import { PortalKontoSicherheitPanel } from "@/components/shared/PortalKontoSicherheitPanel";
import { PortalEinstellungenShell } from "@/components/shared/PortalEinstellungenShell";
import { PortalPushSettingsPanel } from "@/components/shared/PortalPushSettingsPanel";
import {
  EinstellungenPfRow,
  EinstellungenSectionHeader,
} from "@/components/shared/PortalEinstellungenUi";
import type { OrganisationKunde } from "@/lib/org/types";

type Props = {
  kunde: OrganisationKunde;
  onSaved: () => void;
  isAdmin?: boolean;
};

/**
 * HV-Einstellungen: Profil (inkl. Logo & Portal-Angaben) · Freigabe · Benachrichtigungen.
 */
export function OrganisationEinstellungenScreen({
  kunde,
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
            <div className="flex flex-col gap-6">
              <OrganisationPortalAngabenPanel
                kunde={kunde}
                readOnly={!isAdmin}
                onSaved={onSaved}
              />

              <div className="space-y-3">
                <EinstellungenSectionHeader title="Profil" />
                <div className="flex flex-col gap-[11px]">
                  <EinstellungenPfRow label="Name" value={displayName} />
                  <EinstellungenPfRow
                    label="E-Mail"
                    value={kunde.email?.trim() || "—"}
                  />
                  <EinstellungenPfRow label="Telefon" value={tel} />
                </div>
              </div>

              <OrganisationMieterLegalLinksPanel
                kunde={kunde}
                readOnly={!isAdmin}
                onSaved={onSaved}
              />

              <OrganisationMeldeMaterial kunde={kunde} />

              <PortalKontoSicherheitPanel
                signOutHref="/portal/login"
                allowDelete={false}
                deleteMailto="info@baerenwald-muenchen.de"
              />
            </div>
          );
        }

        if (tab === "benachrichtigungen") {
          return <PortalPushSettingsPanel portal="portal" />;
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
