"use client";

import { OrganisationBrandingEditor } from "@/components/org/OrganisationBrandingEditor";
import { OrganisationFreigabeRegelnPanel } from "@/components/org/OrganisationFreigabeRegelnPanel";
import { OrganisationMeldeMaterial } from "@/components/org/OrganisationMeldeMaterial";
import { PortalEinstellungenShell } from "@/components/shared/PortalEinstellungenShell";
import { EinstellungenPfRow } from "@/components/shared/PortalEinstellungenUi";
import type { OrganisationKunde, OrganisationObjekt } from "@/lib/org/types";
import { EINSTELLUNGEN_PROFIL_EDIT } from "@/lib/portal2/einstellungen";
import { PORTAL_C } from "@/lib/portal2/tokens";

type Props = {
  kunde: OrganisationKunde;
  objekte: OrganisationObjekt[];
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
  objekte,
  objektCount,
  onSaved,
  isAdmin = true,
}: Props) {
  const displayName =
    kunde.org_anzeigename?.trim() || kunde.name?.trim() || "Hausverwaltung";
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
                    color: PORTAL_C.ink,
                    fontFamily: "var(--p2-font-head, " + PORTAL_C.head + ")",
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
                  style={{ color: PORTAL_C.sub }}
                >
                  Diese Kontaktdaten gelten auch für die Mieter-Kommunikation
                  (Melde-Flow, Status und E-Mails).
                </p>
                <button
                  type="button"
                  className="mt-1 w-full rounded-[9px] border border-border-default bg-white px-3 py-2.5 text-[13px] font-semibold text-text-secondary"
                  disabled
                  title="Stammdaten unter Branding & White-Label"
                >
                  {EINSTELLUNGEN_PROFIL_EDIT}
                </button>
              </div>

              <OrganisationMeldeMaterial
                kunde={kunde}
                objektCount={objektCount}
                nested
              />
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
            objekte={objekte}
            onSaved={onSaved}
            isAdmin={isAdmin}
          />
        );
      }}
    </PortalEinstellungenShell>
  );
}
