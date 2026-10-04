"use client";

import { useEffect, useMemo, useState } from "react";

import { PortalCheckbox, PortalSelect } from "@/components/shared/PortalFormControls";
import { OrganisationObjektFinanzPanel } from "@/components/org/OrganisationObjektFinanzPanel";
import { OrganisationObjektPruefpflichtenPanel } from "@/components/org/OrganisationObjektPruefpflichtenPanel";
import { OrganisationObjektAnlagenPanel } from "@/components/org/OrganisationObjektAnlagenPanel";
import { OrganisationObjektDokumentePanel } from "@/components/org/OrganisationObjektDokumentePanel";
import { OrganisationObjektHistoriePanel } from "@/components/org/OrganisationObjektHistoriePanel";
import { OrganisationObjektKontaktePanel } from "@/components/org/OrganisationObjektKontaktePanel";
import {
  PortalConfirmDialog,
  PortalDetailLayout,
  PortalDetailStickyActions,
} from "@/components/shared/PortalDetailUi";
import {
  PortalInviteMailtoSheet,
  type PortalInviteMailtoReady,
} from "@/components/shared/PortalInviteMailtoSheet";
import { PortalEntityDetailLayout } from "@/components/shared/PortalEntityDetailLayout";
import { PortalEntityList } from "@/components/shared/PortalEntityList";
import { PortalInboxEmpty } from "@/components/shared/PortalEmptyState";
import { PortalInlineLoading } from "@/components/shared/PortalInlineLoading";
import { usePortalBusy } from "@/components/shared/PortalBusyContext";
import {
  EinstellungenEdField,
  EinstellungenEditModal,
  EinstellungenEuroSlider,
  EinstellungenInstantToggle,
  EinstellungenPfList,
  EinstellungenPfRow,
  EinstellungenSectionCard,
  EinstellungenSheetCard,
  EinstellungenToggle,
} from "@/components/shared/PortalEinstellungenUi";
import {
  SofortmassnahmeAkutTitle,
  SofortmassnahmeFaelleEinstellungenLink,
} from "@/components/org/SofortmassnahmeFaelleLink";
import { PortalListCard } from "@/components/shared/PortalListCard";
import { leadBelongsToObjekt } from "@/lib/org/match-lead-objekt";
import { meldeKategorieLabel } from "@/lib/org/melde-kategorien";
import { meldeKategorieFromLead } from "@/lib/org/org-eingang-utils";
import type { ObjektAktePortalPayload } from "@/lib/org/objektakte/types";
import type { OrganisationLead, OrganisationObjekt } from "@/lib/org/types";
import { portalListStackClass } from "@/lib/portal2/layout-chrome";
import type { PortalEinladungHvBlock } from "@/lib/portal2/portal-einladungen";
import {
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
  formatObjektPlzOrt,
  formatObjektStrasse,
  formatObjektTypLine,
  OBJ_DETAIL_TABS,
  parseEinheitenCount,
  type ObjDetailTabId,
} from "@/lib/portal2/objekte";
import type { PortalDetailTab } from "@/components/shared/PortalDetailTabs";
import { orgPortalToast, portalToastError } from "@/lib/shared/portal-toast";
import {
  plattformStatusLabel,
  plattformStatusPillClass,
  resolvePlattformStatus,
} from "@/lib/vorgang/plattform-status";
import { TOAST } from '@/lib/portal-copy'

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
  hv?: PortalEinladungHvBlock | null;
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
  hv,
  dokumenteByLeadId = {},
}: Props) {
  const { runBusy } = usePortalBusy();
  const [inviteMailtoReady, setInviteMailtoReady] =
    useState<PortalInviteMailtoReady | null>(null);
  const [tab, setTab] = useState<ObjDetailTabId>("stamm");
  const [pruefpflichtBadge, setPruefpflichtBadge] = useState(0);
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
  const [freigabeSaving, setFreigabeSaving] = useState(false);

  const meta = useMemo(
    () => decodeObjektMeta(objekt.notizen_intern),
    [objekt.notizen_intern]
  );

  const detailTabs = useMemo((): readonly PortalDetailTab[] => {
    return OBJ_DETAIL_TABS.map((t) => ({ ...t }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch(
      `/api/org/objekte/pruefpflichten-summary`
    )
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as { byObjektId?: Record<string, number> };
      })
      .then((json) => {
        if (!cancelled) {
          setPruefpflichtBadge(json?.byObjektId?.[objekt.id] ?? 0);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [objekt.id]);

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

  const [akte, setAkte] = useState<ObjektAktePortalPayload | null>(null);
  const [akteLoading, setAkteLoading] = useState(true);


  useEffect(() => {
    let cancelled = false;
    setAkteLoading(true);
    void fetch(`/api/org/objekte/akte?objektId=${encodeURIComponent(objekt.id)}`)
      .then((r) => r.json())
      .then((j: ObjektAktePortalPayload & { error?: string }) => {
        if (cancelled) return;
        if ("error" in j && j.error) {
          setAkte({ anlagen: [], historie: [], kpis: {
            vorgaengeGesamt: 0,
            offenInArbeit: 0,
            kostenLaufendesJahr: 0,
            kostenOhneAngabeImJahr: 0,
            anlagenAnzahl: 0,
            nachGewerk: [],
          }});
          return;
        }
        setAkte({
          anlagen: j.anlagen ?? [],
          historie: j.historie ?? [],
          kpis: j.kpis ?? {
            vorgaengeGesamt: 0,
            offenInArbeit: 0,
            kostenLaufendesJahr: 0,
            kostenOhneAngabeImJahr: 0,
            anlagenAnzahl: 0,
            nachGewerk: [],
          },
        });
      })
      .catch(() => {
        if (!cancelled) {
          setAkte({
            anlagen: [],
            historie: [],
            kpis: {
              vorgaengeGesamt: 0,
              offenInArbeit: 0,
              kostenLaufendesJahr: 0,
              kostenOhneAngabeImJahr: 0,
              anlagenAnzahl: 0,
              nachGewerk: [],
            },
          });
        }
      })
      .finally(() => {
        if (!cancelled) setAkteLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [objekt.id]);

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
    setAutoSchadenakte(Boolean(objekt.automatische_schadenakte));
  }, [
    objekt.freigabe_schwelle_eur,
    objekt.notfall_direkt,
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
  const we =
    typeof objekt.einheitenCount === "number" && objekt.einheitenCount > 0
      ? objekt.einheitenCount
      : parseEinheitenCount(objekt.einheiten_hinweis);

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

  function openFreigabeEdit() {
    setEditSchwelle(schwelle);
    setFreigabeEditOpen(true);
  }

  function closeFreigabeEdit() {
    if (freigabeSaving) return;
    setFreigabeEditOpen(false);
  }

  async function patchObjektFreigabe(body: Record<string, unknown>) {
    const res = await fetch("/api/org/objekte", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: objekt.id, ...body }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      portalToastError(TOAST.freigabe_regeln_nicht_gespeichert, json.error);
      throw new Error(json.error || "save");
    }
    orgPortalToast.objektAktualisiert();
    onRefresh();
  }

  async function saveToggleAkutObjekt(next: boolean) {
    await patchObjektFreigabe({ notfall_direkt: next });
    setAkutDirekt(next);
  }

  async function saveToggleSchwelleObjekt(next: boolean) {
    const eur = next
      ? snapEinstellungenSchwelle(Math.max(schwelle, 500))
      : null;
    await patchObjektFreigabe({ freigabe_schwelle_eur: eur });
    setSchwelleAktiv(next);
    if (next && schwelle <= 0) setSchwelle(500);
  }

  async function saveFreigabeEdit() {
    setFreigabeSaving(true);
    try {
      const nextSchwelle = schwelleAktiv
        ? snapEinstellungenSchwelle(Math.max(editSchwelle, 500))
        : null;
      await patchObjektFreigabe({
        freigabe_schwelle_eur: nextSchwelle,
        notfall_direkt: akutDirekt,
      });
      if (schwelleAktiv && nextSchwelle != null) setSchwelle(nextSchwelle);
      setFreigabeEditOpen(false);
    } catch {
      /* toast */
    } finally {
      setFreigabeSaving(false);
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
            <EinstellungenPfRow
              label="Einheiten"
              value={we === 1 ? "1 Einheit" : `${we} Einheiten`}
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
