"use client";

import { useMemo, useState } from "react";

import { OrganisationObjektCover } from "@/components/org/OrganisationObjektCover";
import { OrganisationObjektDokumentePanel } from "@/components/org/OrganisationObjektDokumentePanel";
import { OrganisationObjektEinheitenBewohnerPanel } from "@/components/org/OrganisationObjektEinheitenBewohnerPanel";
import { OrganisationObjektKontaktePanel } from "@/components/org/OrganisationObjektKontaktePanel";
import { OrganisationObjektMieterTab } from "@/components/org/OrganisationObjektMieterTab";
import { cn } from "@/lib/utils";
import type { OrganisationLead, OrganisationObjekt } from "@/lib/org/types";
import {
  decodeObjektMeta,
  formatObjektIdKurz,
  formatObjektPlzOrt,
  formatObjektStrasse,
  formatObjektTypLine,
  formatSchwelleEur,
  OBJ_AUTOPASS_DETAIL_DESC,
  OBJ_AUTOPASS_OFFENER_PUNKT,
  OBJ_DETAIL_TABS,
  OBJ_REGELN_FALLBACK,
  parseEinheitenCount,
  type ObjDetailTabId,
} from "@/lib/portal2/objekte";
import { orgPortalToast, portalToastError } from "@/lib/shared/portal-toast";

type Props = {
  objekt: OrganisationObjekt;
  leads: OrganisationLead[];
  offenCount: number;
  canAushang: boolean;
  onBack: () => void;
  onCopyMeldeLink: () => void;
  onOpenAushangPdf: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onEinladen: () => void;
  onRefresh: () => void;
};

function ObjCard({
  title,
  children,
}: {
  title?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3.5 rounded-xl border border-border-default bg-white p-4">
      {title ? (
        <p className="mb-3 font-[family-name:var(--font-display)] text-sm font-bold text-text-primary">
          {title}
        </p>
      ) : null}
      {children}
    </div>
  );
}

function ObjRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border-default py-2 text-[13.5px] last:border-b-0">
      <span className="text-text-secondary">{label}</span>
      <span className="text-right font-semibold text-text-primary">{value}</span>
    </div>
  );
}

export function OrganisationObjektDetail({
  objekt,
  leads,
  offenCount,
  canAushang,
  onBack,
  onCopyMeldeLink,
  onOpenAushangPdf,
  onEdit,
  onCopy,
  onDelete,
  onEinladen,
  onRefresh,
}: Props) {
  const [tab, setTab] = useState<ObjDetailTabId>("stamm");
  const [schwelle, setSchwelle] = useState(() =>
    objekt.freigabe_schwelle_eur != null
      ? String(objekt.freigabe_schwelle_eur)
      : "500"
  );
  const [busySchwelle, setBusySchwelle] = useState(false);
  const [autopassUi, setAutopassUi] = useState(false);

  const meta = useMemo(
    () => decodeObjektMeta(objekt.notizen_intern),
    [objekt.notizen_intern]
  );
  const typLine = formatObjektTypLine(objekt);
  const plzOrt = formatObjektPlzOrt(objekt) || "—";
  const strasse = formatObjektStrasse(objekt) || "—";
  const we =
    typeof objekt.einheitenCount === "number" && objekt.einheitenCount > 0
      ? objekt.einheitenCount
      : parseEinheitenCount(objekt.einheiten_hinweis);

  const objektLeads = useMemo(
    () => leads.filter((l) => l.kunde_objekt_id === objekt.id),
    [leads, objekt.id]
  );

  const saveSchwelle = async () => {
    setBusySchwelle(true);
    try {
      const v = schwelle.trim();
      const res = await fetch("/api/org/objekte", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: objekt.id,
          freigabe_schwelle_eur: v ? Number(v) : null,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError("Schwelle nicht gespeichert", json.error);
        return;
      }
      orgPortalToast.objektAktualisiert();
      onRefresh();
    } finally {
      setBusySchwelle(false);
    }
  };

  let body: React.ReactNode = null;

  if (tab === "stamm") {
    body = (
      <div className="grid gap-3.5 md:grid-cols-2">
        <ObjCard title="Objektdaten">
          <ObjRow label="Bezeichnung" value={objekt.titel} />
          <ObjRow label="Typ" value={typLine} />
          <ObjRow label="Adresse" value={strasse} />
          <ObjRow
            label="Einheiten"
            value={we === 1 ? "1 Einheit" : `${we} Einheiten`}
          />
          <ObjRow label="Objekt-ID" value={formatObjektIdKurz(objekt.id)} />
          <ObjRow
            label="Melde-Link"
            value={objekt.melde_aktiv && objekt.melde_slug ? "Aktiv" : "Inaktiv"}
          />
        </ObjCard>
        <ObjCard title="Hausverwaltung">
          <ObjRow label="Verwaltung" value={meta.hv?.trim() || "—"} />
          <ObjRow label="Ansprechpartner" value={meta.kontakt?.trim() || "—"} />
          <ObjRow label="Telefon" value={meta.tel?.trim() || "—"} />
        </ObjCard>
      </div>
    );
  } else if (tab === "einheiten") {
    body = (
      <OrganisationObjektEinheitenBewohnerPanel
        objektId={objekt.id}
        detailLayout
        titleCount={we}
      />
    );
  } else if (tab === "mieter") {
    body = (
      <OrganisationObjektMieterTab
        objektId={objekt.id}
        leads={objektLeads}
        onEinladen={onEinladen}
        onGotoVorgaenge={() => setTab("vorgaenge")}
      />
    );
  } else if (tab === "vorgaenge") {
    body = (
      <ObjCard title={`Vorgänge (${objektLeads.length})`}>
        {objektLeads.length === 0 ? (
          <p className="text-[13px] text-text-secondary">
            Keine Vorgänge an diesem Objekt.
          </p>
        ) : (
          <ul className="space-y-0">
            {objektLeads.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between gap-2 border-b border-border-default py-2.5 text-[13px] last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-[11.5px] font-semibold text-text-tertiary">
                    {l.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="truncate font-medium text-text-primary">
                    {(l.situation ?? l.kontakt_name ?? "Vorgang").slice(0, 80)}
                  </p>
                  <p className="truncate text-[12px] text-text-secondary">
                    {objekt.titel}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11.5px] font-semibold text-text-secondary">
                  {l.vorgang_phase ?? l.status ?? "—"}
                </span>
                <span className="shrink-0 text-text-tertiary" aria-hidden>
                  ›
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-text-tertiary">
          {offenCount} offen · Details unter Vorgänge in der Navigation.
        </p>
      </ObjCard>
    );
  } else if (tab === "regeln") {
    body = (
      <ObjCard title="Regeln für dieses Objekt">
        <button
          type="button"
          onClick={() => setAutopassUi((v) => !v)}
          className="mb-4 flex w-full items-start gap-3 rounded-[10px] border border-border-default bg-muted/30 p-3 text-left"
        >
          <span
            className={cn(
              "mt-0.5 flex h-6 w-10 shrink-0 items-center rounded-full p-0.5",
              autopassUi ? "bg-accent" : "bg-border-default"
            )}
          >
            <span
              className={cn(
                "h-5 w-5 rounded-full bg-white shadow transition-transform",
                autopassUi ? "translate-x-4" : "translate-x-0"
              )}
            />
          </span>
          <span>
            <span className="block text-[13.5px] font-semibold text-text-primary">
              Notfall-Autopass
            </span>
            <span className="mt-1 block text-xs leading-snug text-text-secondary">
              {OBJ_AUTOPASS_DETAIL_DESC}
            </span>
            <span className="mt-1.5 block text-[11px] text-text-tertiary">
              {OBJ_AUTOPASS_OFFENER_PUNKT}
            </span>
          </span>
        </button>

        <p className="portal-text-label mb-1">Freigabe-Schwelle (€)</p>
        <div className="flex gap-2">
          <input
            type="number"
            className="portal-input flex-1 rounded-xl border border-border-default px-3 py-2 text-sm"
            value={schwelle}
            onChange={(e) => setSchwelle(e.target.value)}
          />
          <button
            type="button"
            className="btn-pill-outline !text-xs"
            disabled={busySchwelle}
            onClick={() => void saveSchwelle()}
          >
            Speichern
          </button>
        </div>
        <p className="mt-2 text-xs text-text-tertiary">
          Aktuell:{" "}
          {formatSchwelleEur(
            objekt.freigabe_schwelle_eur != null
              ? Number(objekt.freigabe_schwelle_eur)
              : 500
          )}
        </p>
        <p className="mt-3 text-[12.5px] leading-relaxed text-text-secondary">
          {OBJ_REGELN_FALLBACK}
        </p>
      </ObjCard>
    );
  } else if (tab === "eigentuemer") {
    body = (
      <ObjCard title="Eigentümer & Kontakte">
        <OrganisationObjektKontaktePanel objektId={objekt.id} />
      </ObjCard>
    );
  } else {
    body = (
      <ObjCard title="Dokumente">
        <OrganisationObjektDokumentePanel objektId={objekt.id} />
      </ObjCard>
    );
  }

  return (
    <div className="space-y-0">
      <div className="mb-2 flex items-center gap-1.5 text-[12.5px] text-text-tertiary">
        <button
          type="button"
          className="font-semibold text-accent"
          onClick={onBack}
        >
          ‹ Objekte
        </button>
        <span>/</span>
        <span>{objekt.titel}</span>
      </div>

      <div className="mb-3 md:hidden">
        <OrganisationObjektCover
          objektId={objekt.id}
          coverUrl={objekt.cover_url}
          variant="card"
          onUploaded={() => onRefresh()}
        />
      </div>

      <div className="mb-4 flex flex-col gap-3.5 md:flex-row md:items-center">
        <OrganisationObjektCover
          objektId={objekt.id}
          coverUrl={objekt.cover_url}
          variant="detail"
          className="hidden md:block"
          onUploaded={() => onRefresh()}
        />
        <div className="min-w-0 flex-1">
          <h2 className="font-[family-name:var(--font-display)] text-[21px] font-bold text-text-primary md:text-[25px]">
            {objekt.titel}
          </h2>
          <p className="mt-0.5 text-[13px] text-text-secondary">
            {typLine}
            {plzOrt !== "—" ? ` · ${plzOrt}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canAushang ? (
            <>
              <button
                type="button"
                className="rounded-[9px] border border-border-default bg-white px-3.5 py-2 text-[13px] font-semibold text-text-secondary"
                onClick={onCopyMeldeLink}
              >
                Link kopieren
              </button>
              <button
                type="button"
                className="rounded-[9px] border border-accent bg-accent-light px-3.5 py-2 text-[13px] font-semibold text-accent"
                onClick={onOpenAushangPdf}
              >
                Aushang PDF
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="rounded-[9px] border border-border-default bg-white px-3.5 py-2 text-[13px] font-semibold text-[#B42318]"
            onClick={onDelete}
          >
            Löschen
          </button>
          <button
            type="button"
            className="rounded-[9px] border border-border-default bg-white px-3.5 py-2 text-[13px] font-semibold text-text-secondary"
            onClick={onEdit}
          >
            Bearbeiten
          </button>
          <button
            type="button"
            className="rounded-[9px] border border-border-default bg-white px-3.5 py-2 text-[13px] font-semibold text-text-secondary"
            onClick={onCopy}
          >
            Kopieren
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-3.5 overflow-x-auto whitespace-nowrap border-b border-border-default md:gap-5">
        {OBJ_DETAIL_TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "shrink-0 border-b-2 pb-2.5 text-[13.5px] font-semibold",
                on
                  ? "border-accent text-text-primary"
                  : "border-transparent text-text-secondary"
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div>{body}</div>
    </div>
  );
}
