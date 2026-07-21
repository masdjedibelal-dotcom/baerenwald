"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { OrganisationObjektCover } from "@/components/org/OrganisationObjektCover";
import { OrganisationObjektDokumentePanel } from "@/components/org/OrganisationObjektDokumentePanel";
import { OrganisationObjektEinheitenBewohnerPanel } from "@/components/org/OrganisationObjektEinheitenBewohnerPanel";
import { OrganisationObjektMieterTab } from "@/components/org/OrganisationObjektMieterTab";
import { PortalListCard } from "@/components/shared/PortalListCard";
import {
  EinstellungenCard,
  EinstellungenEdField,
  EinstellungenEuroInput,
  EinstellungenInfoBox,
} from "@/components/shared/PortalEinstellungenUi";
import { cn } from "@/lib/utils";
import { leadBelongsToObjekt } from "@/lib/org/match-lead-objekt";
import { meldeKategorieLabel } from "@/lib/org/melde-kategorien";
import {
  isMeldeNotfall,
  meldeKategorieFromLead,
} from "@/lib/org/org-eingang-utils";
import type { OrganisationLead, OrganisationObjekt } from "@/lib/org/types";
import {
  EINSTELLUNGEN_SCHWELLE_PRESETS,
} from "@/lib/portal2/einstellungen";
import {
  decodeObjektMeta,
  encodeObjektMeta,
  formatObjektIdKurz,
  formatObjektPlzOrt,
  formatObjektStrasse,
  formatObjektTypLine,
  OBJ_DETAIL_TABS,
  OBJ_REGELN_FALLBACK,
  OBJ_SCHWELLE_INFO,
  OBJ_SCHWELLE_WIZARD_DESC,
  OBJ_SCHWELLE_WIZARD_TITLE,
  parseEinheitenCount,
  type ObjDetailTabId,
} from "@/lib/portal2/objekte";
import { PORTAL_C } from "@/lib/portal2/tokens";
import { orgPortalToast, portalToastError } from "@/lib/shared/portal-toast";
import {
  plattformStatusLabel,
  plattformStatusPillClass,
  resolvePlattformStatus,
} from "@/lib/vorgang/plattform-status";

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
  /** Öffnet den Vorgang in der Listenansicht (Vorgänge). */
  onOpenVorgang?: (leadId: string) => void;
  dokumenteByLeadId?: Record<
    string,
    Array<{
      id: string;
      name: string;
      subtitle?: string;
      datum?: string;
      href: string;
    }>
  >;
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
  onOpenVorgang,
  dokumenteByLeadId = {},
}: Props) {
  const [tab, setTab] = useState<ObjDetailTabId>("stamm");
  const [schwelle, setSchwelle] = useState(() =>
    objekt.freigabe_schwelle_eur != null
      ? Number(objekt.freigabe_schwelle_eur)
      : 500
  );
  const schwelleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const meta = useMemo(
    () => decodeObjektMeta(objekt.notizen_intern),
    [objekt.notizen_intern]
  );

  const [kontaktName, setKontaktName] = useState(meta.kontakt ?? "");
  const [kontaktTel, setKontaktTel] = useState(meta.tel ?? "");
  const [kontaktEmail, setKontaktEmail] = useState(meta.email ?? "");
  const kontaktTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setKontaktName(meta.kontakt ?? "");
    setKontaktTel(meta.tel ?? "");
    setKontaktEmail(meta.email ?? "");
  }, [meta.kontakt, meta.tel, meta.email, objekt.id]);

  useEffect(() => {
    setSchwelle(
      objekt.freigabe_schwelle_eur != null
        ? Number(objekt.freigabe_schwelle_eur)
        : 500
    );
  }, [objekt.id, objekt.freigabe_schwelle_eur]);

  useEffect(() => {
    return () => {
      if (kontaktTimer.current) clearTimeout(kontaktTimer.current);
      if (schwelleTimer.current) clearTimeout(schwelleTimer.current);
    };
  }, []);

  const typLine = formatObjektTypLine(objekt);
  const plzOrt = formatObjektPlzOrt(objekt) || "—";
  const strasse = formatObjektStrasse(objekt) || "—";
  const we =
    typeof objekt.einheitenCount === "number" && objekt.einheitenCount > 0
      ? objekt.einheitenCount
      : parseEinheitenCount(objekt.einheiten_hinweis);

  const objektLeads = useMemo(
    () => leads.filter((l) => leadBelongsToObjekt(l, objekt)),
    [leads, objekt]
  );

  const saveAnsprechpartner = async (next: {
    kontakt: string;
    tel: string;
    email: string;
  }) => {
    try {
      const notizen_intern = encodeObjektMeta(
        {
          typ: meta.typ,
          kontakt: next.kontakt.trim() || undefined,
          tel: next.tel.trim() || undefined,
          email: next.email.trim() || undefined,
        },
        objekt.notizen_intern
      );
      const res = await fetch("/api/org/objekte", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: objekt.id, notizen_intern }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError("Ansprechpartner nicht gespeichert", json.error);
        return;
      }
      orgPortalToast.objektAktualisiert();
      onRefresh();
    } catch {
      portalToastError("Ansprechpartner nicht gespeichert");
    }
  };

  const scheduleAnsprechpartner = (patch: {
    kontakt?: string;
    tel?: string;
    email?: string;
  }) => {
    const next = {
      kontakt: patch.kontakt ?? kontaktName,
      tel: patch.tel ?? kontaktTel,
      email: patch.email ?? kontaktEmail,
    };
    if (patch.kontakt !== undefined) setKontaktName(patch.kontakt);
    if (patch.tel !== undefined) setKontaktTel(patch.tel);
    if (patch.email !== undefined) setKontaktEmail(patch.email);
    if (kontaktTimer.current) clearTimeout(kontaktTimer.current);
    kontaktTimer.current = setTimeout(() => {
      void saveAnsprechpartner(next);
    }, 550);
  };

  const saveSchwelle = async (value: number) => {
    try {
      const res = await fetch("/api/org/objekte", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: objekt.id,
          freigabe_schwelle_eur: value,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError("Schwelle nicht gespeichert", json.error);
        return;
      }
      orgPortalToast.objektAktualisiert();
      onRefresh();
    } catch {
      portalToastError("Schwelle nicht gespeichert");
    }
  };

  const onSchwelleChange = (value: number) => {
    setSchwelle(value);
    if (schwelleTimer.current) clearTimeout(schwelleTimer.current);
    schwelleTimer.current = setTimeout(() => {
      void saveSchwelle(value);
    }, 450);
  };

  let body: React.ReactNode = null;

  if (tab === "stamm") {
    body = (
      <div className="grid gap-3.5 md:grid-cols-2">
        <ObjCard title="Ansprechpartner">
          <div className="flex flex-col gap-3">
            <p
              className="text-[13px] leading-[1.55]"
              style={{ color: PORTAL_C.sub }}
            >
              Kontakt für diese WEG — Name, Telefon und E-Mail.
            </p>
            <EinstellungenEdField
              label="Name"
              value={kontaktName}
              onChange={(v) => scheduleAnsprechpartner({ kontakt: v })}
              placeholder="Max Mustermann"
              autoComplete="name"
            />
            <EinstellungenEdField
              label="Telefon"
              type="tel"
              value={kontaktTel}
              onChange={(v) => scheduleAnsprechpartner({ tel: v })}
              placeholder="089 / …"
              autoComplete="tel"
            />
            <EinstellungenEdField
              label="E-Mail"
              type="email"
              value={kontaktEmail}
              onChange={(v) => scheduleAnsprechpartner({ email: v })}
              placeholder="name@firma.de"
              autoComplete="email"
            />
          </div>
        </ObjCard>
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
      <div className="space-y-2.5">
        <div className="flex items-baseline justify-between gap-2 px-0.5">
          <p className="font-[family-name:var(--font-display)] text-sm font-bold text-text-primary">
            Vorgänge ({objektLeads.length})
          </p>
          <p className="text-xs text-text-tertiary">{offenCount} offen</p>
        </div>
        {objektLeads.length === 0 ? (
          <div className="rounded-xl border border-border-default bg-white px-4 py-8 text-center text-[13px] text-text-secondary">
            Keine Vorgänge an diesem Objekt.
          </div>
        ) : (
          objektLeads.map((l) => {
            const kat = meldeKategorieLabel(
              meldeKategorieFromLead(l) ?? undefined
            );
            const notfall = isMeldeNotfall(l);
            const adresse = [l.strasse, l.hausnummer]
              .filter(Boolean)
              .join(" ");
            const we = l.melder_einheit?.trim()
              ? /^(WE|Whg)/i.test(l.melder_einheit.trim())
                ? l.melder_einheit.trim()
                : `WE ${l.melder_einheit.trim()}`
              : undefined;
            const person = l.melder_name?.trim() || undefined;
            const subtitle = [
              adresse || objekt.titel || "Objekt",
              we,
              person,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <PortalListCard
                key={l.id}
                variant="card"
                selected={false}
                onClick={() => onOpenVorgang?.(l.id)}
                title={kat}
                subtitle={subtitle}
                statusLabel={plattformStatusLabel(resolvePlattformStatus(l))}
                statusPillClass={plattformStatusPillClass(
                  resolvePlattformStatus(l)
                )}
                accent="anfrage"
                meta={
                  notfall ? [{ icon: AlertTriangle, text: "Notfall" }] : []
                }
                showChevron
              />
            );
          })
        )}
      </div>
    );
  } else if (tab === "regeln") {
    body = (
      <EinstellungenCard title={OBJ_SCHWELLE_WIZARD_TITLE}>
        <div className="flex flex-col gap-3">
          <p
            className="text-[13px] leading-[1.55]"
            style={{ color: PORTAL_C.sub }}
          >
            {OBJ_SCHWELLE_WIZARD_DESC}
          </p>
          <EinstellungenEuroInput
            value={schwelle}
            presets={EINSTELLUNGEN_SCHWELLE_PRESETS}
            onChange={onSchwelleChange}
          />
          <EinstellungenInfoBox>
            {OBJ_SCHWELLE_INFO(schwelle)}
          </EinstellungenInfoBox>
          <p
            className="text-[12.5px] leading-relaxed"
            style={{ color: PORTAL_C.sub }}
          >
            {OBJ_REGELN_FALLBACK}
          </p>
        </div>
      </EinstellungenCard>
    );
  } else {
    body = (
      <OrganisationObjektDokumentePanel
        key={objekt.id}
        objekt={objekt}
        leads={objektLeads}
        dokumenteByLeadId={dokumenteByLeadId}
        onOpenVorgang={onOpenVorgang}
      />
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

      <div className="mb-4 flex flex-col gap-3.5 md:mb-5 md:flex-row md:items-center">
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

      <div className="mb-6 flex gap-3.5 overflow-x-auto whitespace-nowrap border-b border-border-default pb-0.5 md:mb-8 md:gap-5">
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

      <div className="pt-1">{body}</div>
    </div>
  );
}
