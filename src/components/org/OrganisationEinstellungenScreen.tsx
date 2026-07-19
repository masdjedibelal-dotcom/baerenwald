"use client";

import { useEffect, useRef, useState } from "react";

import { OrganisationBrandingEditor } from "@/components/org/OrganisationBrandingEditor";
import { OrganisationEinstellungenPanel } from "@/components/org/OrganisationEinstellungenPanel";
import {
  OrganisationExportPanel,
  OrganisationTeamPanel,
} from "@/components/org/OrganisationTeamPanel";
import { OrganisationMeldeMaterial } from "@/components/org/OrganisationMeldeMaterial";
import { OrganisationMieterKontaktPanel } from "@/components/org/OrganisationMieterKontaktPanel";
import { EinstellungenPfRow } from "@/components/shared/PortalEinstellungenUi";
import type { OrganisationKunde, OrganisationObjekt } from "@/lib/org/types";
import {
  EINSTELLUNGEN_OBJEKT_SCHWELLE_TITLE,
  EINSTELLUNGEN_PROFIL_EDIT,
  EINSTELLUNGEN_SCHWELLE_INTRO,
  EINSTELLUNGEN_SCHWELLE_TITLE,
  einstellungenPageTitle,
  formatEinstellungenSchwelle,
} from "@/lib/portal2/einstellungen";
import { einstellungenMaxWidthClass } from "@/lib/portal2/einstellungen-ui";
import { formatObjektTypLine } from "@/lib/portal2/objekte";
import { orgPortalToast, portalToastError } from "@/lib/shared/portal-toast";

type Props = {
  kunde: OrganisationKunde;
  objekte: OrganisationObjekt[];
  objektCount: number;
  onSaved: () => void;
  isAdmin?: boolean;
};

/**
 * D6 / D12 HV-Variante von `screenSettings`:
 * Profil · Branding · globale + Objekt-Schwellen · bestehende Org-Panels.
 */
export function OrganisationEinstellungenScreen({
  kunde,
  objekte,
  objektCount,
  onSaved,
  isAdmin = true,
}: Props) {
  const brandingRef = useRef<HTMLDivElement>(null);
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
    <div
      className={`mx-auto flex w-full flex-col gap-3.5 ${einstellungenMaxWidthClass("hv")}`}
    >
      <div className="space-y-0.5">
        <h2 className="portal-text-section text-text-primary">
          {einstellungenPageTitle("hv")}
        </h2>
      </div>

      <section className="card-bordered space-y-2.5 p-4 sm:p-5">
        <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-primary">
          Profil
        </h3>
        <EinstellungenPfRow label="Name" value={displayName} />
        <EinstellungenPfRow label="E-Mail" value={kunde.email?.trim() || "—"} />
        <EinstellungenPfRow label="Telefon" value={tel} />
        <button
          type="button"
          className="mt-1 w-full rounded-[9px] border border-border-default bg-white px-3 py-2.5 text-[13px] font-semibold text-text-secondary"
          onClick={() =>
            brandingRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            })
          }
        >
          {EINSTELLUNGEN_PROFIL_EDIT}
        </button>
      </section>

      <div ref={brandingRef}>
        <OrganisationBrandingEditor
          kunde={kunde}
          readOnly={!isAdmin}
          onSaved={onSaved}
        />
      </div>

      <section className="card-bordered space-y-3 p-4 sm:p-5">
        <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-primary">
          {EINSTELLUNGEN_SCHWELLE_TITLE}
        </h3>
        <p className="text-[13px] leading-relaxed text-text-secondary">
          {EINSTELLUNGEN_SCHWELLE_INTRO}
        </p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={2000}
            step={50}
            value={schwelle}
            disabled={!isAdmin}
            onChange={(e) => onSchwelleChange(Number(e.target.value))}
            className="flex-1"
          />
          <span className="w-[110px] text-right font-[family-name:var(--font-display)] text-xl font-bold text-accent">
            {formatEinstellungenSchwelle(schwelle)}
          </span>
        </div>
      </section>

      <section className="card-bordered space-y-2.5 p-4 sm:p-5">
        <h3 className="font-[family-name:var(--font-display)] text-sm font-bold text-text-primary">
          {EINSTELLUNGEN_OBJEKT_SCHWELLE_TITLE}
        </h3>
        {objekte.length === 0 ? (
          <p className="text-[13px] text-text-secondary">
            Noch keine Objekte — Schwellen erscheinen nach dem Anlegen.
          </p>
        ) : (
          objekte.map((o) => {
            const val =
              o.freigabe_schwelle_eur != null
                ? formatEinstellungenSchwelle(Number(o.freigabe_schwelle_eur))
                : "Standard";
            return (
              <div
                key={o.id}
                className="flex items-center justify-between gap-3 rounded-[9px] border border-border-default px-3.5 py-[11px]"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold text-text-primary">
                    {o.titel}
                  </p>
                  <p className="truncate text-[11px] text-text-tertiary">
                    {formatObjektTypLine(o)}
                  </p>
                </div>
                <span className="shrink-0 text-[13.5px] font-semibold text-accent">
                  {val}
                </span>
              </div>
            );
          })
        )}
        <p className="text-[11.5px] text-text-tertiary">
          Objekt-Schwellen unter Objekte → Detail → Regeln festlegen.
        </p>
      </section>

      <OrganisationMeldeMaterial kunde={kunde} objektCount={objektCount} />

      <OrganisationMieterKontaktPanel
        kunde={kunde}
        onSaved={onSaved}
        readOnly={!isAdmin}
      />

      <OrganisationTeamPanel kunde={kunde} isAdmin={isAdmin} />

      <OrganisationExportPanel />

      <section className="card-bordered p-4 sm:p-5">
        <h3 className="mb-4 font-[family-name:var(--font-display)] text-sm font-bold text-text-primary">
          Weitere Freigabe-Regeln
        </h3>
        <OrganisationEinstellungenPanel
          kunde={kunde}
          onSaved={onSaved}
          embedded
          readOnly={!isAdmin}
        />
      </section>
    </div>
  );
}
