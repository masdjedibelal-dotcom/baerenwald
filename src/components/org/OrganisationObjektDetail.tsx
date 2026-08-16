"use client";

import { useEffect, useMemo, useState } from "react";

import { OrganisationObjektDokumentePanel } from "@/components/org/OrganisationObjektDokumentePanel";
import { OrganisationObjektEinheitenTab } from "@/components/org/OrganisationObjektEinheitenTab";
import { PortalDetailCover } from "@/components/shared/PortalDetailCover";
import { PortalDetailHead } from "@/components/shared/PortalDetailUi";
import { PortalDetailTabs } from "@/components/shared/PortalDetailTabs";
import { PortalInboxEmpty } from "@/components/shared/PortalEmptyState";
import {
  EinstellungenEdField,
  EinstellungenEditModal,
  EinstellungenEuroSlider,
  EinstellungenPfList,
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

function dash(v: string) {
  return v.trim() || "—";
}

export function OrganisationObjektDetail({
  objekt,
  leads,
  offenCount,
  onBack,
  onEdit,
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
  const [kontaktEditOpen, setKontaktEditOpen] = useState(false);
  const [editKontaktName, setEditKontaktName] = useState("");
  const [editKontaktTel, setEditKontaktTel] = useState("");
  const [editKontaktEmail, setEditKontaktEmail] = useState("");
  const [kontaktSaving, setKontaktSaving] = useState(false);

  const [versicherer, setVersicherer] = useState(objekt.versicherer ?? "");
  const [objVersNr, setObjVersNr] = useState(objekt.versicherungs_nr ?? "");
  const [selbstbehalt, setSelbstbehalt] = useState(
    objekt.selbstbehalt_eur != null ? String(objekt.selbstbehalt_eur) : ""
  );
  const [autoSchadenakte, setAutoSchadenakte] = useState(
    Boolean(objekt.automatische_schadenakte)
  );
  const [versEditOpen, setVersEditOpen] = useState(false);
  const [editVersicherer, setEditVersicherer] = useState("");
  const [editVersNr, setEditVersNr] = useState("");
  const [editSelbstbehalt, setEditSelbstbehalt] = useState("");
  const [editAutoSchadenakte, setEditAutoSchadenakte] = useState(false);
  const [versSaving, setVersSaving] = useState(false);

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

  function openKontaktEdit() {
    setEditKontaktName(kontaktName);
    setEditKontaktTel(kontaktTel);
    setEditKontaktEmail(kontaktEmail);
    setKontaktEditOpen(true);
  }

  function closeKontaktEdit() {
    if (kontaktSaving) return;
    setKontaktEditOpen(false);
  }

  async function saveKontaktEdit() {
    setKontaktSaving(true);
    try {
      const next = {
        kontakt: editKontaktName.trim(),
        tel: editKontaktTel.trim(),
        email: editKontaktEmail.trim(),
      };
      const notizen_intern = encodeObjektMeta(
        {
          typ: meta.typ,
          kontakt: next.kontakt || undefined,
          tel: next.tel || undefined,
          email: next.email || undefined,
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
      setKontaktName(next.kontakt);
      setKontaktTel(next.tel);
      setKontaktEmail(next.email);
      setKontaktEditOpen(false);
      orgPortalToast.objektAktualisiert();
      onRefresh();
    } catch {
      portalToastError("Ansprechpartner nicht gespeichert");
    } finally {
      setKontaktSaving(false);
    }
  }

  function openVersEdit() {
    setEditVersicherer(versicherer);
    setEditVersNr(objVersNr);
    setEditSelbstbehalt(selbstbehalt);
    setEditAutoSchadenakte(autoSchadenakte);
    setVersEditOpen(true);
  }

  function closeVersEdit() {
    if (versSaving) return;
    setVersEditOpen(false);
  }

  async function saveVersEdit() {
    setVersSaving(true);
    try {
      const sb = editSelbstbehalt.trim()
        ? Number(editSelbstbehalt.replace(",", "."))
        : null;
      const res = await fetch("/api/org/objekte", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: objekt.id,
          versicherer: editVersicherer.trim() || null,
          versicherungs_nr: editVersNr.trim() || null,
          selbstbehalt_eur: Number.isFinite(sb as number) ? sb : null,
          automatische_schadenakte: editAutoSchadenakte,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError("Versicherung nicht gespeichert", json.error);
        return;
      }
      setVersicherer(editVersicherer.trim());
      setObjVersNr(editVersNr.trim());
      setSelbstbehalt(
        Number.isFinite(sb as number) && sb != null ? String(sb) : ""
      );
      setAutoSchadenakte(editAutoSchadenakte);
      setVersEditOpen(false);
      orgPortalToast.objektAktualisiert();
      onRefresh();
    } catch {
      portalToastError("Versicherung nicht gespeichert");
    } finally {
      setVersSaving(false);
    }
  }

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

  let body: React.ReactNode = null;

  if (tab === "stamm") {
    body = (
      <div className="space-y-6">
        <div className="space-y-3">
          <EinstellungenSectionHeader title="Objektdaten" onEdit={onEdit} />
          <EinstellungenPfList>
            <EinstellungenPfRow label="Bezeichnung" value={dash(objekt.titel)} />
            <EinstellungenPfRow label="Typ" value={dash(typLine)} />
            <EinstellungenPfRow
              label="Adresse"
              value={
                [strasse, plzOrt].filter((x) => x && x !== "—").join(", ") || "—"
              }
            />
            <EinstellungenPfRow
              label="Einheiten"
              value={we === 1 ? "1 Einheit" : `${we} Einheiten`}
            />
          </EinstellungenPfList>
        </div>

        <div className="space-y-3">
          <EinstellungenSectionHeader
            title="Ansprechpartner"
            onEdit={openKontaktEdit}
          />
          <EinstellungenPfList>
            <EinstellungenPfRow label="Name" value={dash(kontaktName)} />
            <EinstellungenPfRow label="Telefon" value={dash(kontaktTel)} />
            <EinstellungenPfRow label="E-Mail" value={dash(kontaktEmail)} />
          </EinstellungenPfList>
          <EinstellungenEditModal
            open={kontaktEditOpen}
            title="Ansprechpartner bearbeiten"
            onClose={closeKontaktEdit}
            onSave={() => void saveKontaktEdit()}
            saving={kontaktSaving}
          >
            <EinstellungenEdField
              label="Name"
              value={editKontaktName}
              onChange={setEditKontaktName}
              placeholder="Max Mustermann"
              autoComplete="name"
            />
            <EinstellungenEdField
              label="Telefon"
              type="tel"
              value={editKontaktTel}
              onChange={setEditKontaktTel}
              placeholder="089 / …"
              autoComplete="tel"
            />
            <EinstellungenEdField
              label="E-Mail"
              type="email"
              value={editKontaktEmail}
              onChange={setEditKontaktEmail}
              placeholder="name@firma.de"
              autoComplete="email"
            />
          </EinstellungenEditModal>
        </div>

        <div className="space-y-3">
          <EinstellungenSectionHeader
            title="Gebäudeversicherung"
            onEdit={openVersEdit}
          />
          <EinstellungenPfList>
            <EinstellungenPfRow label="Versicherer" value={dash(versicherer)} />
            <EinstellungenPfRow label="Policen-Nr." value={dash(objVersNr)} />
            <EinstellungenPfRow
              label="Selbstbehalt"
              value={
                selbstbehalt.trim()
                  ? `${selbstbehalt.trim().replace(".", ",")} €`
                  : "—"
              }
            />
            <EinstellungenPfRow
              label="Automatische Schadenakte"
              value={autoSchadenakte ? "Ein" : "Aus"}
            />
          </EinstellungenPfList>
          <EinstellungenEditModal
            open={versEditOpen}
            title="Gebäudeversicherung bearbeiten"
            onClose={closeVersEdit}
            onSave={() => void saveVersEdit()}
            saving={versSaving}
          >
            <EinstellungenEdField
              label="Versicherer"
              value={editVersicherer}
              onChange={setEditVersicherer}
              placeholder="z. B. Allianz"
            />
            <EinstellungenEdField
              label="Policen-Nr."
              value={editVersNr}
              onChange={setEditVersNr}
              placeholder="Police / Vertragsnummer"
            />
            <EinstellungenEdField
              label="Selbstbehalt (€)"
              value={editSelbstbehalt}
              onChange={setEditSelbstbehalt}
              placeholder="0"
            />
            <EinstellungenToggle
              checked={editAutoSchadenakte}
              onChange={setEditAutoSchadenakte}
              title="Automatische Schadenakte"
              description={
                editAutoSchadenakte
                  ? "Ein: Bei jeder Schadenmeldung an diesem Objekt wird die Akte erzeugt und unter Dokumente abgelegt."
                  : "Aus: Keine automatische Schadenakte."
              }
            />
          </EinstellungenEditModal>
        </div>
      </div>
    );
  } else if (tab === "einheiten") {
    body = (
      <OrganisationObjektEinheitenTab
        objektId={objekt.id}
        orgAnzeigename={undefined}
        onGotoVorgaenge={() => setTab("vorgaenge")}
        onEinheitenChange={onRefresh}
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
            const weLabel = l.melder_einheit?.trim()
              ? /^(WE|Whg)/i.test(l.melder_einheit.trim())
                ? l.melder_einheit.trim()
                : `WE ${l.melder_einheit.trim()}`
              : undefined;
            const person = l.melder_name?.trim() || undefined;
            const subtitle = [
              adresse || objekt.titel || "Objekt",
              weLabel,
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
        <EinstellungenPfList>
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
        </EinstellungenPfList>

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
