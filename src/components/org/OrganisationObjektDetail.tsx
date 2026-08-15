"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { OrganisationObjektDokumentePanel } from "@/components/org/OrganisationObjektDokumentePanel";
import { OrganisationObjektMieterTab } from "@/components/org/OrganisationObjektMieterTab";
import { PortalDetailCover } from "@/components/shared/PortalDetailCover";
import { PortalDetailHead } from "@/components/shared/PortalDetailUi";
import { PortalDetailTabs } from "@/components/shared/PortalDetailTabs";
import { PortalInboxEmpty } from "@/components/shared/PortalEmptyState";
import {
  EinstellungenEditModal,
  EinstellungenEuroSlider,
  EinstellungenPfRow,
  EinstellungenSectionHeader,
  EinstellungenSheetCard,
  EinstellungenToggle,
} from "@/components/shared/PortalEinstellungenUi";
import { SofortmassnahmeAkutTitleWithFaelle } from "@/components/org/SofortmassnahmeFaelleLink";
import { PortalListCard } from "@/components/shared/PortalListCard";
import { leadBelongsToObjekt } from "@/lib/org/match-lead-objekt";
import { meldeKategorieLabel } from "@/lib/org/melde-kategorien";
import { meldeKategorieFromLead } from "@/lib/org/org-eingang-utils";
import type { OrganisationLead, OrganisationObjekt } from "@/lib/org/types";
import {
  EINSTELLUNGEN_AKUT_INTRO,
  EINSTELLUNGEN_SCHWELLE_BETRAG_INTRO,
  EINSTELLUNGEN_SCHWELLE_BETRAG_TITLE,
  EINSTELLUNGEN_SCHWELLE_SLIDER_MAX,
  EINSTELLUNGEN_SCHWELLE_SLIDER_MIN,
  EINSTELLUNGEN_SCHWELLE_SLIDER_STEP,
  EINSTELLUNGEN_SCHWELLE_TITLE,
  EINSTELLUNGEN_UNTER_SCHWELLE_INTRO,
  EINSTELLUNGEN_UNTER_SCHWELLE_TITLE,
  formatEinstellungenSchwelle,
  snapEinstellungenSchwelle,
} from "@/lib/portal2/einstellungen";
import {
  decodeObjektMeta,
  encodeObjektMeta,
  formatObjektPlzOrt,
  formatObjektStrasse,
  formatObjektTypLine,
  OBJ_DETAIL_TABS,
  parseEinheitenCount,
  type ObjDetailTabId,
} from "@/lib/portal2/objekte";
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
  onBack: () => void;
  onEdit: () => void;
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
      {title ? <p className="portal-text-section mb-3">{title}</p> : null}
      {children}
    </div>
  );
}

function ObjRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="portal-text-meta flex items-center justify-between gap-3 border-b border-border-default py-2 last:border-b-0">
      <span className="shrink-0 text-text-secondary">{label}</span>
      <span className="min-w-0 text-right font-semibold text-text-primary">
        {value}
      </span>
    </div>
  );
}

function ObjEditRow({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
  /** Soft-Kachel wie Stammdaten-Felder (p2-selected). */
  variant = "plain",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  variant?: "plain" | "tile";
}) {
  if (variant === "tile") {
    return (
      <label className="block rounded-[11px] border border-[var(--p2-line,rgba(0,0,0,0.08))] bg-[var(--p2-selected,#e8ece9)] px-3.5 py-2.5">
        <span className="portal-text-label block normal-case tracking-wide text-text-tertiary">
          {label}
        </span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="portal-text-card-title mt-0.5 w-full border-0 bg-transparent p-0 font-semibold text-text-primary outline-none placeholder:font-normal placeholder:text-text-tertiary"
        />
      </label>
    );
  }

  return (
    <div className="portal-text-meta flex items-center justify-between gap-3 border-b border-border-default py-1.5 last:border-b-0">
      <span className="shrink-0 text-text-secondary">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="min-w-0 max-w-[65%] flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-right font-semibold text-text-primary outline-none placeholder:font-normal placeholder:text-text-tertiary focus:border-border-default focus:bg-white"
      />
    </div>
  );
}

export function OrganisationObjektDetail({
  objekt,
  leads,
  offenCount,
  onBack,
  onEdit,
  onEinladen,
  onRefresh,
  onOpenVorgang,
  dokumenteByLeadId = {},
}: Props) {
  const [tab, setTab] = useState<ObjDetailTabId>("stamm");
  const [schwelleAktiv, setSchwelleAktiv] = useState(
    () =>
      objekt.freigabe_schwelle_eur != null &&
      Number(objekt.freigabe_schwelle_eur) > 0
  );
  const [schwelle, setSchwelle] = useState(() =>
    snapEinstellungenSchwelle(
      objekt.freigabe_schwelle_eur != null &&
        Number(objekt.freigabe_schwelle_eur) > 0
        ? Number(objekt.freigabe_schwelle_eur)
        : 500
    )
  );
  const [akutDirekt, setAkutDirekt] = useState(
    objekt.notfall_direkt == null ? true : Boolean(objekt.notfall_direkt)
  );
  const [freigabeEditOpen, setFreigabeEditOpen] = useState(false);
  const [editSchwelle, setEditSchwelle] = useState(schwelle);
  const [editSchwelleAktiv, setEditSchwelleAktiv] = useState(schwelleAktiv);
  const [editAkut, setEditAkut] = useState(akutDirekt);
  const [freigabeSaving, setFreigabeSaving] = useState(false);

  const meta = useMemo(
    () => decodeObjektMeta(objekt.notizen_intern),
    [objekt.notizen_intern]
  );

  const [kontaktName, setKontaktName] = useState(meta.kontakt ?? "");
  const [kontaktTel, setKontaktTel] = useState(meta.tel ?? "");
  const [kontaktEmail, setKontaktEmail] = useState(meta.email ?? "");
  const kontaktTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [versicherer, setVersicherer] = useState(objekt.versicherer ?? "");
  const [objVersNr, setObjVersNr] = useState(objekt.versicherungs_nr ?? "");
  const [selbstbehalt, setSelbstbehalt] = useState(
    objekt.selbstbehalt_eur != null ? String(objekt.selbstbehalt_eur) : ""
  );
  const [autoSchadenakte, setAutoSchadenakte] = useState(
    Boolean(objekt.automatische_schadenakte)
  );
  const [autoSchadenakteSaving, setAutoSchadenakteSaving] = useState(false);
  const versTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setKontaktName(meta.kontakt ?? "");
    setKontaktTel(meta.tel ?? "");
    setKontaktEmail(meta.email ?? "");
  }, [meta.kontakt, meta.tel, meta.email, objekt.id]);

  useEffect(() => {
    const aktiv =
      objekt.freigabe_schwelle_eur != null &&
      Number(objekt.freigabe_schwelle_eur) > 0;
    setSchwelleAktiv(aktiv);
    setSchwelle(
      snapEinstellungenSchwelle(
        aktiv && objekt.freigabe_schwelle_eur != null
          ? Number(objekt.freigabe_schwelle_eur)
          : 500
      )
    );
    setAkutDirekt(
      objekt.notfall_direkt == null ? true : Boolean(objekt.notfall_direkt)
    );
    setVersicherer(objekt.versicherer ?? "");
    setObjVersNr(objekt.versicherungs_nr ?? "");
    setSelbstbehalt(
      objekt.selbstbehalt_eur != null ? String(objekt.selbstbehalt_eur) : ""
    );
    setAutoSchadenakte(Boolean(objekt.automatische_schadenakte));
  }, [
    objekt.freigabe_schwelle_eur,
    objekt.notfall_direkt,
    objekt.versicherer,
    objekt.versicherungs_nr,
    objekt.selbstbehalt_eur,
    objekt.automatische_schadenakte,
    objekt.id,
  ]);

  useEffect(() => {
    return () => {
      if (kontaktTimer.current) clearTimeout(kontaktTimer.current);
      if (versTimer.current) clearTimeout(versTimer.current);
    };
  }, []);

  const typLine = formatObjektTypLine(objekt);
  const plzOrt = formatObjektPlzOrt(objekt) || "—";
  const strasse = formatObjektStrasse(objekt) || "—";
  const adresseLine = [strasse, plzOrt]
    .filter((x) => x && x !== "—")
    .join(", ");
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

  function openFreigabeEdit() {
    setEditSchwelle(schwelle);
    setEditSchwelleAktiv(schwelleAktiv);
    setEditAkut(akutDirekt);
    setFreigabeEditOpen(true);
  }

  function closeFreigabeEdit() {
    if (freigabeSaving) return;
    setFreigabeEditOpen(false);
  }

  function onToggleUnterSchwelle(next: boolean) {
    setEditSchwelleAktiv(next);
    if (next && editSchwelle <= 0) {
      setEditSchwelle(500);
    }
  }

  async function saveFreigabeEdit() {
    setFreigabeSaving(true);
    try {
      const nextSchwelle = editSchwelleAktiv
        ? snapEinstellungenSchwelle(Math.max(editSchwelle, 500))
        : null;
      const res = await fetch("/api/org/objekte", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: objekt.id,
          freigabe_schwelle_eur: nextSchwelle,
          notfall_direkt: editAkut,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError("Freigabe-Regeln nicht gespeichert", json.error);
        return;
      }
      setSchwelleAktiv(editSchwelleAktiv);
      if (editSchwelleAktiv && nextSchwelle != null) setSchwelle(nextSchwelle);
      setAkutDirekt(editAkut);
      setFreigabeEditOpen(false);
      orgPortalToast.objektAktualisiert();
      onRefresh();
    } catch {
      portalToastError("Freigabe-Regeln nicht gespeichert");
    } finally {
      setFreigabeSaving(false);
    }
  }

  const saveVersicherung = async (next: {
    versicherer: string;
    versicherungs_nr: string;
    selbstbehalt: string;
  }) => {
    try {
      const sb = next.selbstbehalt.trim()
        ? Number(next.selbstbehalt.replace(",", "."))
        : null;
      const res = await fetch("/api/org/objekte", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: objekt.id,
          versicherer: next.versicherer.trim() || null,
          versicherungs_nr: next.versicherungs_nr.trim() || null,
          selbstbehalt_eur: Number.isFinite(sb as number) ? sb : null,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError("Versicherung nicht gespeichert", json.error);
        return;
      }
      orgPortalToast.objektAktualisiert();
      onRefresh();
    } catch {
      portalToastError("Versicherung nicht gespeichert");
    }
  };

  const scheduleVersicherung = (patch: {
    versicherer?: string;
    versicherungs_nr?: string;
    selbstbehalt?: string;
  }) => {
    const next = {
      versicherer: patch.versicherer ?? versicherer,
      versicherungs_nr: patch.versicherungs_nr ?? objVersNr,
      selbstbehalt: patch.selbstbehalt ?? selbstbehalt,
    };
    if (patch.versicherer !== undefined) setVersicherer(patch.versicherer);
    if (patch.versicherungs_nr !== undefined) setObjVersNr(patch.versicherungs_nr);
    if (patch.selbstbehalt !== undefined) setSelbstbehalt(patch.selbstbehalt);
    if (versTimer.current) clearTimeout(versTimer.current);
    versTimer.current = setTimeout(() => {
      void saveVersicherung(next);
    }, 550);
  };

  async function saveAutoSchadenakte(next: boolean) {
    setAutoSchadenakte(next);
    setAutoSchadenakteSaving(true);
    try {
      const res = await fetch("/api/org/objekte", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: objekt.id,
          automatische_schadenakte: next,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setAutoSchadenakte(!next);
        portalToastError("Einstellung nicht gespeichert", json.error);
        return;
      }
      orgPortalToast.objektAktualisiert();
      onRefresh();
    } catch {
      setAutoSchadenakte(!next);
      portalToastError("Einstellung nicht gespeichert");
    } finally {
      setAutoSchadenakteSaving(false);
    }
  }

  let body: React.ReactNode = null;

  if (tab === "stamm") {
    body = (
      <div className="space-y-3.5">
        <ObjCard title="Ansprechpartner">
          <div className="flex flex-col gap-2">
            <ObjEditRow
              variant="tile"
              label="Name"
              value={kontaktName}
              onChange={(v) => scheduleAnsprechpartner({ kontakt: v })}
              placeholder="Max Mustermann"
              autoComplete="name"
            />
            <ObjEditRow
              variant="tile"
              label="Telefon"
              type="tel"
              value={kontaktTel}
              onChange={(v) => scheduleAnsprechpartner({ tel: v })}
              placeholder="089 / …"
              autoComplete="tel"
            />
            <ObjEditRow
              variant="tile"
              label="E-Mail"
              type="email"
              value={kontaktEmail}
              onChange={(v) => scheduleAnsprechpartner({ email: v })}
              placeholder="name@firma.de"
              autoComplete="email"
            />
          </div>
        </ObjCard>

        <div className="grid gap-3.5 md:grid-cols-2">
          <ObjCard title="Objektdaten">
            <ObjRow label="Bezeichnung" value={objekt.titel} />
            <ObjRow label="Typ" value={typLine} />
            <ObjRow
              label="Adresse"
              value={
                [strasse, plzOrt].filter((x) => x && x !== "—").join(", ") || "—"
              }
            />
            <ObjRow
              label="Einheiten"
              value={we === 1 ? "1 Einheit" : `${we} Einheiten`}
            />
          </ObjCard>
          <ObjCard title="Gebäudeversicherung">
            <ObjEditRow
              label="Versicherer"
              value={versicherer}
              onChange={(v) => scheduleVersicherung({ versicherer: v })}
              placeholder="z. B. Allianz"
            />
            <ObjEditRow
              label="Policen-Nr."
              value={objVersNr}
              onChange={(v) => scheduleVersicherung({ versicherungs_nr: v })}
              placeholder="Police / Vertragsnummer"
            />
            <ObjEditRow
              label="Selbstbehalt (€)"
              value={selbstbehalt}
              onChange={(v) => scheduleVersicherung({ selbstbehalt: v })}
              placeholder="0"
            />
            <div className="mt-3 border-t border-border-light pt-3">
              <EinstellungenToggle
                checked={autoSchadenakte}
                onChange={(v) => {
                  if (autoSchadenakteSaving) return;
                  void saveAutoSchadenakte(v);
                }}
                title="Automatische Schadenakte"
                description={
                  autoSchadenakte
                    ? "Ein: Bei jeder Schadenmeldung an diesem Objekt wird die Akte erzeugt und unter Dokumente abgelegt."
                    : "Aus: Keine automatische Schadenakte. Stammdaten unten bleiben für manuelle Nutzung."
                }
              />
            </div>
            <p className="portal-text-meta mt-2 leading-relaxed text-text-tertiary">
              Einmal hinterlegt — Policen-Daten fließen in die Schadenakte.
              Fertige PDFs findest du im Vorgang unter Dokumente.
            </p>
          </ObjCard>
        </div>
      </div>
    );
  } else if (tab === "mieter") {
    body = (
      <OrganisationObjektMieterTab
        objektId={objekt.id}
        leads={objektLeads}
        defaultStrasse={objekt.strasse}
        defaultHausnummer={objekt.hausnummer}
        onEinladen={onEinladen}
        onGotoVorgaenge={() => setTab("vorgaenge")}
      />
    );
  } else if (tab === "vorgaenge") {
    body = (
      <div className="space-y-2.5">
        <div className="flex items-baseline justify-between gap-2 px-0.5">
          <p className="portal-text-section">
            Vorgänge ({objektLeads.length})
          </p>
          <p className="portal-text-meta text-text-tertiary">{offenCount} offen</p>
        </div>
        {objektLeads.length === 0 ? (
          <PortalInboxEmpty title="Noch keine Daten" compact />
        ) : (
          objektLeads.map((l) => {
            const kat = meldeKategorieLabel(
              meldeKategorieFromLead(l) ?? undefined
            );
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
                meta={[]}
                showChevron
              />
            );
          })
        )}
      </div>
    );
  } else if (tab === "regeln") {
    body = (
      <div className="space-y-3">
        <EinstellungenSectionHeader
          title={EINSTELLUNGEN_SCHWELLE_TITLE}
          onEdit={openFreigabeEdit}
        />
        <div className="flex flex-col gap-[11px]">
          <EinstellungenPfRow
            label={<SofortmassnahmeAkutTitleWithFaelle />}
            value={akutDirekt ? "Ja" : "Nein"}
          />
          <EinstellungenPfRow
            label={EINSTELLUNGEN_UNTER_SCHWELLE_TITLE}
            value={schwelleAktiv ? "Ja" : "Nein"}
          />
          {schwelleAktiv ? (
            <EinstellungenPfRow
              label={EINSTELLUNGEN_SCHWELLE_BETRAG_TITLE}
              value={formatEinstellungenSchwelle(schwelle)}
            />
          ) : null}
        </div>

        <EinstellungenEditModal
          open={freigabeEditOpen}
          title={EINSTELLUNGEN_SCHWELLE_TITLE}
          onClose={closeFreigabeEdit}
          onSave={() => void saveFreigabeEdit()}
          saving={freigabeSaving}
        >
          <EinstellungenToggle
            checked={editAkut}
            onChange={setEditAkut}
            title={<SofortmassnahmeAkutTitleWithFaelle />}
            description={
              editAkut
                ? `${EINSTELLUNGEN_AKUT_INTRO} Aktiv: Sofortmaßnahmen ohne Ihre Freigabe, nur Info.`
                : "Aus: Auch Sofortmaßnahmen laufen über Angebot und Freigabe."
            }
          />
          <EinstellungenToggle
            checked={editSchwelleAktiv}
            onChange={onToggleUnterSchwelle}
            title={EINSTELLUNGEN_UNTER_SCHWELLE_TITLE}
            description={
              editSchwelleAktiv
                ? EINSTELLUNGEN_UNTER_SCHWELLE_INTRO
                : "Aus: Jedes Angebot braucht Ihre Freigabe, unabhängig vom Betrag."
            }
          />
          {editSchwelleAktiv ? (
            <EinstellungenSheetCard
              title={EINSTELLUNGEN_SCHWELLE_BETRAG_TITLE}
              description={EINSTELLUNGEN_SCHWELLE_BETRAG_INTRO}
            >
              <EinstellungenEuroSlider
                value={editSchwelle}
                min={Math.max(EINSTELLUNGEN_SCHWELLE_SLIDER_MIN, 500)}
                max={EINSTELLUNGEN_SCHWELLE_SLIDER_MAX}
                step={EINSTELLUNGEN_SCHWELLE_SLIDER_STEP}
                formatValue={formatEinstellungenSchwelle}
                onChange={(v) =>
                  setEditSchwelle(snapEinstellungenSchwelle(Math.max(v, 500)))
                }
              />
            </EinstellungenSheetCard>
          ) : null}
        </EinstellungenEditModal>
      </div>
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
    <div className="-mx-4 -mt-5 min-w-0 lg:-mx-6 lg:-mt-7">
      <PortalDetailCover
        coverUrl={objekt.cover_url}
        onBack={onBack}
        backLabel="← Objekte"
        onEdit={onEdit}
      />

      <div className="mt-4 mb-5 space-y-4 px-4 lg:px-6">
        <PortalDetailHead
          title={objekt.titel}
          metaLine={adresseLine || undefined}
        />

        <PortalDetailTabs
          tabs={OBJ_DETAIL_TABS}
          activeId={tab}
          onChange={(id) => setTab(id as ObjDetailTabId)}
          navLabel="Objekt-Abschnitte"
        >
          {body}
        </PortalDetailTabs>
      </div>
    </div>
  );
}
