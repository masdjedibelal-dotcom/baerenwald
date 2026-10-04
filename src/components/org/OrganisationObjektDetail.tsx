"use client";

import { useEffect,useMemo,useState } from "react";

import { OrganisationObjektDokumentePanel } from "@/components/org/OrganisationObjektDokumentePanel";
import { OrganisationObjektKontaktePanel } from "@/components/org/OrganisationObjektKontaktePanel";
import {
  PortalDetailLayout,
  PortalDetailStickyActions
} from "@/components/shared/PortalDetailUi";
import {
  PortalInviteMailtoSheet,
  type PortalInviteMailtoReady,
} from "@/components/shared/PortalInviteMailtoSheet";
import { PortalEntityDetailLayout } from "@/components/shared/PortalEntityDetailLayout";
import { PortalInboxEmpty } from "@/components/shared/PortalEmptyState";
import {
  EinstellungenEdField,
  EinstellungenEditModal,EinstellungenPfList,
  EinstellungenPfRow,
  EinstellungenSectionCard,EinstellungenToggle
} from "@/components/shared/PortalEinstellungenUi";
import { PortalListCard } from "@/components/shared/PortalListCard";
import { leadBelongsToObjekt } from "@/lib/org/match-lead-objekt";
import { meldeKategorieLabel } from "@/lib/org/melde-kategorien";
import { meldeKategorieFromLead } from "@/lib/org/org-eingang-utils";
import type { OrganisationLead,OrganisationObjekt } from "@/lib/org/types";
import { portalListStackClass } from "@/lib/portal2/layout-chrome";
import {
  formatObjektPlzOrt,
  formatObjektStrasse,
  formatObjektTypLine,
  OBJ_DETAIL_TABS,type ObjDetailTabId
} from "@/lib/portal2/objekte";
import type { PortalDetailTab } from "@/components/shared/PortalDetailTabs";
import { orgPortalToast,portalToastError } from "@/lib/shared/portal-toast";
import {
  plattformStatusLabel,
  plattformStatusPillClass,
  resolvePlattformStatus,
} from "@/lib/vorgang/plattform-status";
import { TOAST } from '@/lib/portal-copy';

type Props = {
  objekt: OrganisationObjekt;
  leads: OrganisationLead[];
  offenCount: number;
  onBack: () => void;
  onEdit: () => void;
  onRefresh: () => void;
  /** Öffnet den Vorgang in der Listenansicht (Vorgänge). */
  onOpenVorgang?: (leadId: string) => void;
  orgAnzeigename?: string | null;
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
  orgAnzeigename,
  dokumenteByLeadId = {},
}: Props) {
  const [inviteMailtoReady, setInviteMailtoReady] =
    useState<PortalInviteMailtoReady | null>(null);
  const [tab, setTab] = useState<ObjDetailTabId>("stamm");
  const detailTabs = useMemo((): readonly PortalDetailTab[] => {
    return OBJ_DETAIL_TABS.map((t) => ({ ...t }));
  }, []);

  const [versicherer, setVersicherer] = useState(objekt.versicherer ?? "");
  const [objVersNr, setObjVersNr] = useState(objekt.versicherungs_nr ?? "");
  const [autoSchadenakte, setAutoSchadenakte] = useState(
    Boolean(objekt.automatische_schadenakte)
  );
  const [versEditOpen, setVersEditOpen] = useState(false);
  const [editVersicherer, setEditVersicherer] = useState("");
  const [editVersNr, setEditVersNr] = useState("");
  const [editAutoSchadenakte, setEditAutoSchadenakte] = useState(false);
  const [versSaving, setVersSaving] = useState(false);

  useEffect(() => {
    setVersicherer(objekt.versicherer ?? "");
    setObjVersNr(objekt.versicherungs_nr ?? "");
    setAutoSchadenakte(Boolean(objekt.automatische_schadenakte));
  }, [
    objekt.versicherer,
    objekt.versicherungs_nr,
    objekt.automatische_schadenakte,
    objekt.id,
  ]);

  const typLine = formatObjektTypLine(objekt);
  const plzOrt = formatObjektPlzOrt(objekt) || "—";
  const strasse = formatObjektStrasse(objekt) || "—";
  const adresseLine = [strasse, plzOrt]
    .filter((x) => x && x !== "—")
    .join(", ");

  const objektLeads = useMemo(
    () => leads.filter((l) => leadBelongsToObjekt(l, objekt)),
    [leads, objekt]
  );


  function openVersEdit() {
    setEditVersicherer(versicherer);
    setEditVersNr(objVersNr);
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
      const res = await fetch("/api/org/objekte", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: objekt.id,
          versicherer: editVersicherer.trim() || null,
          versicherungs_nr: editVersNr.trim() || null,
          automatische_schadenakte: editAutoSchadenakte,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError(TOAST.versicherung_nicht_gespeichert, json.error);
        return;
      }
      setVersicherer(editVersicherer.trim());
      setObjVersNr(editVersNr.trim());
      setAutoSchadenakte(editAutoSchadenakte);
      setVersEditOpen(false);
      orgPortalToast.objektAktualisiert();
      onRefresh();
    } catch {
      portalToastError(TOAST.versicherung_nicht_gespeichert);
    } finally {
      setVersSaving(false);
    }
  }

  let body: React.ReactNode = null;

  if (tab === "stamm") {
    body = (
      <div className="flex flex-col gap-3">
        <EinstellungenSectionCard title="Objektdaten" onEdit={onEdit}>
          <EinstellungenPfList>
            <EinstellungenPfRow label="Bezeichnung" value={dash(objekt.titel)} />
            <EinstellungenPfRow label="Typ" value={dash(typLine)} />
            <EinstellungenPfRow
              label="Adresse"
              value={
                [strasse, plzOrt].filter((x) => x && x !== "—").join(", ") || "—"
              }
            />
          </EinstellungenPfList>
        </EinstellungenSectionCard>

        <OrganisationObjektKontaktePanel
          objektId={objekt.id}
        />

        <EinstellungenSectionCard
          title="Gebäudeversicherung"
          onEdit={openVersEdit}
        >
          <EinstellungenPfList>
            <EinstellungenPfRow label="Versicherer" value={dash(versicherer)} />
            <EinstellungenPfRow label="Policen-Nr." value={dash(objVersNr)} />
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
            <EinstellungenToggle
              checked={editAutoSchadenakte}
              onChange={setEditAutoSchadenakte}
              title="Automatische Schadenakte"
              description={
                editAutoSchadenakte
                  ? "Ein: Bei Schadenmeldung wird der Kostenträger Versicherung gesetzt und die Schadenmeldung-PDF erzeugt."
                  : "Aus: Keine automatische Schadenmeldung-PDF."
              }
            />
          </EinstellungenEditModal>
        </EinstellungenSectionCard>
      </div>
    );
  } else if (tab === "vorgaenge") {
    body = (
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-2 px-0.5">
          <p className="portal-text-section">
            Vorgänge ({objektLeads.length})
          </p>
          <p className="portal-text-meta text-text-tertiary">{offenCount} offen</p>
        </div>
        {objektLeads.length === 0 ? (
          <PortalInboxEmpty title="Noch keine Daten" compact />
        ) : (
          <div className={portalListStackClass("card")}>
            {objektLeads.map((l) => {
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
            })}
          </div>
        )}
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
    <>
      <PortalInviteMailtoSheet
        open={Boolean(inviteMailtoReady)}
        payload={inviteMailtoReady}
        onClose={() => setInviteMailtoReady(null)}
      />
      <PortalDetailLayout
        footer={
          <PortalDetailStickyActions
            primaryLabel="Bearbeiten"
            onPrimary={onEdit}
          />
        }
      >
        <PortalEntityDetailLayout
          coverUrl={objekt.cover_url}
          onBack={onBack}
          backLabel="← Objekte"
          onEdit={onEdit}
          title={objekt.titel}
          metaLine={adresseLine || undefined}
          tabs={detailTabs}
          activeTab={tab}
          onTabChange={(id) => setTab(id as ObjDetailTabId)}
          tabsNavLabel="Objekt-Abschnitte"
        >
          {body}
        </PortalEntityDetailLayout>
      </PortalDetailLayout>
    </>
  );
}
