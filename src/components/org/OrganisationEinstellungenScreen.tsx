"use client";

import { useEffect, useRef, useState } from "react";

import { OrganisationBrandingEditor } from "@/components/org/OrganisationBrandingEditor";
import { OrganisationEinstellungenPanel } from "@/components/org/OrganisationEinstellungenPanel";
import { OrganisationExportPanel } from "@/components/org/OrganisationTeamPanel";
import { OrganisationMeldeMaterial } from "@/components/org/OrganisationMeldeMaterial";
import { OrganisationMieterKontaktPanel } from "@/components/org/OrganisationMieterKontaktPanel";
import { PortalEinstellungenShell } from "@/components/shared/PortalEinstellungenShell";
import {
  EinstellungenCard,
  EinstellungenObjektSchwelleRow,
  EinstellungenPfRow,
  EinstellungenSchwelleSlider,
} from "@/components/shared/PortalEinstellungenUi";
import type { OrganisationKunde, OrganisationObjekt } from "@/lib/org/types";
import {
  EINSTELLUNGEN_OBJEKT_SCHWELLE_TITLE,
  EINSTELLUNGEN_PROFIL_EDIT,
  EINSTELLUNGEN_SCHWELLE_INTRO,
  EINSTELLUNGEN_SCHWELLE_TITLE,
  formatEinstellungenSchwelle,
} from "@/lib/portal2/einstellungen";
import { PORTAL_C } from "@/lib/portal2/tokens";
import { orgPortalToast, portalToastError } from "@/lib/shared/portal-toast";

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
  const [schwelle, setSchwelle] = useState(() =>
    kunde.freigabe_schwelle_eur != null
      ? Number(kunde.freigabe_schwelle_eur)
      : 500
  );
  const schwelleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSchwelle(
      kunde.freigabe_schwelle_eur != null
        ? Number(kunde.freigabe_schwelle_eur)
        : 500
    );
  }, [kunde.freigabe_schwelle_eur]);

  useEffect(() => {
    return () => {
      if (schwelleTimer.current) clearTimeout(schwelleTimer.current);
    };
  }, []);

  const displayName =
    kunde.org_anzeigename?.trim() || kunde.name?.trim() || "Hausverwaltung";
  const tel =
    kunde.org_telefon?.trim() ||
    kunde.mieter_kontakt_telefon?.trim() ||
    "—";

  const saveSchwelle = async (value: number) => {
    if (!isAdmin) return;
    try {
      const res = await fetch("/api/org/einstellungen", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freigabe_schwelle_eur: value,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError("Schwelle nicht gespeichert", json.error);
        return;
      }
      orgPortalToast.einstellungenGespeichert();
      onSaved();
    } catch {
      portalToastError("Schwelle nicht gespeichert");
    }
  };

  const onSchwelleChange = (value: number) => {
    setSchwelle(value);
    if (!isAdmin) return;
    if (schwelleTimer.current) clearTimeout(schwelleTimer.current);
    schwelleTimer.current = setTimeout(() => {
      void saveSchwelle(value);
    }, 500);
  };

  return (
    <PortalEinstellungenShell variant="hv">
      {(tab) => {
        if (tab === "profil") {
          return (
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
              <button
                type="button"
                className="mt-1 w-full rounded-[9px] border border-border-default bg-white px-3 py-2.5 text-[13px] font-semibold text-text-secondary"
                disabled
                title="Stammdaten unter Branding & White-Label"
              >
                {EINSTELLUNGEN_PROFIL_EDIT}
              </button>
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
          <>
            <EinstellungenCard title={EINSTELLUNGEN_SCHWELLE_TITLE}>
              <div className="flex flex-col gap-3">
                <p
                  className="text-[13px] leading-[1.55]"
                  style={{ color: PORTAL_C.sub }}
                >
                  {EINSTELLUNGEN_SCHWELLE_INTRO}
                </p>
                <EinstellungenSchwelleSlider
                  value={schwelle}
                  disabled={!isAdmin}
                  onChange={onSchwelleChange}
                />
              </div>
            </EinstellungenCard>

            <EinstellungenCard title={EINSTELLUNGEN_OBJEKT_SCHWELLE_TITLE}>
              {objekte.length === 0 ? (
                <p
                  className="text-[13px] leading-[1.55]"
                  style={{ color: PORTAL_C.sub }}
                >
                  Noch keine Objekte — Schwellen erscheinen nach dem Anlegen.
                </p>
              ) : (
                <div className="flex flex-col gap-[9px]">
                  {objekte.map((o) => {
                    const val =
                      o.freigabe_schwelle_eur != null
                        ? formatEinstellungenSchwelle(
                            Number(o.freigabe_schwelle_eur)
                          )
                        : formatEinstellungenSchwelle(schwelle);
                    return (
                      <EinstellungenObjektSchwelleRow
                        key={o.id}
                        name={o.titel}
                        value={val}
                      />
                    );
                  })}
                </div>
              )}
            </EinstellungenCard>

            <OrganisationEinstellungenPanel
              kunde={kunde}
              onSaved={onSaved}
              embedded
              readOnly={!isAdmin}
            />

            <OrganisationMeldeMaterial
              kunde={kunde}
              objektCount={objektCount}
              nested
            />

            <OrganisationMieterKontaktPanel
              kunde={kunde}
              onSaved={onSaved}
              readOnly={!isAdmin}
              nested
            />

            <OrganisationExportPanel nested />
          </>
        );
      }}
    </PortalEinstellungenShell>
  );
}
