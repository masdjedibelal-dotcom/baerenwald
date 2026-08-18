"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Filter, X } from "lucide-react";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import {
  paintPortalBusyNow,
  PORTAL_BUSY_MIN_MS,
  usePortalBusy,
} from "@/components/shared/PortalBusyContext";
import { PortalContentBusy } from "@/components/shared/PortalContentBusy";

import { OrgFreigabeBanner } from "@/components/org/OrgFreigabeBanner";
import { OrgMeldungAktionBanner } from "@/components/org/OrgMeldungAktionBanner";
import { HvFreigabeInfoBanner } from "@/components/org/HvFreigabeInfoBanner";
import { HvMeldungListActions } from "@/components/org/HvMeldungListActions";
import { BautagebuchAccordionList } from "@/components/shared/BautagebuchAccordionList";
import { DokumenteTabelle } from "@/components/shared/DokumenteTabelle";
import { VorgangDetailBlocks } from "@/components/shared/vorgang-detail";
import {
  excludeMeldeFunnelFotosFromDokumente,
  isAbnahmePortalDokument,
  type PortalDokument,
} from "@/lib/portal/portal-dokumente";
import { orgPortalToast } from "@/lib/shared/portal-toast";
import { PortalListCard } from "@/components/shared/PortalListCard";
import { meldeKategorieLabel } from "@/lib/org/melde-kategorien";
import { meldeFotosFromLead, meldeKategorieFromLead } from "@/lib/org/org-eingang-utils";
import { isHvDirektauftragInfoOnly } from "@/lib/org/org-direktauftrag";
import {
  funnelDirektauftragFromDaten,
  hvFreigabeEntfaellt,
  resolveAngebotZugestelltForHvFreigabe,
} from "@/lib/org/freigabe-bypass";
import { leadBelongsToObjekt } from "@/lib/org/match-lead-objekt";
import type {
  OrganisationKunde,
  OrganisationLead,
  OrganisationObjekt,
} from "@/lib/org/types";
import {
  plattformStatusLabel,
  plattformStatusPillClass,
  resolvePlattformStatus,
} from "@/lib/vorgang/plattform-status";
import { buildOrgEingangVorgangDetailVm } from "@/lib/vorgang/build-org-lead-detail-vm";
import {
  formatMockVorgangListSubtitle,
  resolveAnfrageMelder,
} from "@/lib/portal/portal-anfrage-display";
import type { PortalObjekt } from "@/lib/portal/portal-objekt";
import { cn } from "@/lib/utils";
import { OrgVorgangFeedbackSection } from "@/components/org/OrgVorgangFeedbackSection";
import { OrganisationVorgangNotizenPanel } from "@/components/org/OrganisationObjektNotizenPanel";
import {
  OrgAngebotFreigabeInhalt,
  orgAngebotPdfZeilen,
  type OrgFreigabeAngebot,
} from "@/components/org/OrgAngebotFreigabeInhalt";
import { VersicherungsakteButton } from "@/components/org/VersicherungsakteButton";
import { VorgangKommentareThread } from "@/components/org/VorgangKommentareThread";
import { VorgangStornoDialog } from "@/components/org/VorgangStornoDialog";
import { KostentraegerSelector } from "@/components/org/KostentraegerSelector";
type Props = {
  kunde: OrganisationKunde;
  eingang: OrganisationLead[];
  objekte: OrganisationObjekt[];
  angebote?: OrgFreigabeAngebot[];
  initialSelectedId?: string | null;
  onRefresh: () => void;
  /** Mock D2: Aktionen unter jeder Listenzeile */
  listActions?: boolean;
  auftragByLeadId?: Record<string, string>;
  auftragKontextByLeadId?: Record<
    string,
    import("@/lib/portal/vorgang-erledigt").PortalAuftragKontext
  >;
  bautagebuchByLeadId?: Record<
    string,
    Array<{
      id?: string;
      datum?: string;
      created_at?: string;
      titel?: string;
      notiz?: string;
      fotos_urls?: string[];
    }>
  >;
  hwErledigtByLeadId?: Record<string, boolean>;
  feedbackBereitByLeadId?: Record<string, boolean>;
  dokumenteByLeadId?: Record<
    string,
    Array<{
      id: string;
      name: string;
      subtitle?: string;
      datum?: string;
      href: string;
      art?: string;
    }>
  >;
  hvFeedbackByLeadId?: Record<
    string,
    {
      bewertung?: { sterne: number; freitext?: string | null } | null;
      maengel?: Array<{ freitext?: string | null; created_at?: string }>;
    }
  >;
  hvAbnahmeByLeadId?: Record<
    string,
    {
      art: "ohne_vorbehalt" | "mit_anmerkung" | "zurueckgewiesen";
      anmerkung?: string | null;
      signiert_name: string;
      signiert_am: string;
    }
  >;
};

type StatusFilter = "alle" | "neu" | "wartet_melder" | "in_bearbeitung";

function MeldungDetail({
  lead,
  kunde,
  objekte,
  angebot,
  onRefresh,
  onClose,
  showClose,
  auftragId,
  bautagebuchEintraege,
  hwErledigt,
  feedbackBereit,
  hvFeedback,
  hvAbnahme: _hvAbnahme,
  vorgangUnterlagen,
}: {
  lead: OrganisationLead;
  kunde: OrganisationKunde;
  objekte: OrganisationObjekt[];
  angebot?: OrgFreigabeAngebot | null;
  onRefresh: () => void;
  onClose?: () => void;
  showClose?: boolean;
  auftragId?: string;
  bautagebuchEintraege?: Array<{
    id?: string;
    datum?: string;
    created_at?: string;
    titel?: string;
    notiz?: string;
    fotos_urls?: string[];
  }>;
  hwErledigt?: boolean;
  feedbackBereit?: boolean;
  hvFeedback?: {
    bewertung?: { sterne: number; freitext?: string | null } | null;
    maengel?: Array<{ freitext?: string | null; created_at?: string }>;
  };
  hvAbnahme?: {
    art: "ohne_vorbehalt" | "mit_anmerkung" | "zurueckgewiesen";
    anmerkung?: string | null;
    signiert_name: string;
    signiert_am: string;
  } | null;
  vorgangUnterlagen?: Array<{
    id: string;
    name: string;
    subtitle?: string;
    datum?: string;
    href: string;
  }>;
}) {
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  const kategorie = meldeKategorieFromLead(lead);

  const resendEinladung = async () => {
    setResendBusy(true);
    setResendMsg(null);
    try {
      const res = await fetch("/api/org/meldung-einladung-erneut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      });
      const json = (await res.json()) as { error?: string; link?: string };
      if (!res.ok) {
        setResendMsg(json.error ?? "Fehler.");
        return;
      }
      if (json.link) {
        const url = json.link.startsWith("http")
          ? json.link
          : `${window.location.origin}${json.link.startsWith("/") ? json.link : `/${json.link}`}`;
        await navigator.clipboard.writeText(url);
        orgPortalToast.linkKopiert();
        setResendMsg("Einladungs-Link kopiert — bitte an Mieter weitergeben.");
      }
    } finally {
      setResendBusy(false);
    }
  };

  const hatAngebotsdaten = Boolean(
    angebot &&
      ((angebot.positionenDisplay?.length ?? 0) > 0 ||
        (typeof angebot.gesamtBrutto === "number" && angebot.gesamtBrutto > 0) ||
        angebot.pdf_url?.trim() ||
        angebot.dokumente?.some((d) => d.href?.trim()))
  );
  const wartetOrgFreigabe = lead.org_freigabe_status === "ausstehend";
  const freigabeInfoKind = hvFreigabeEntfaellt({
    orgFreigabeStatus: lead.org_freigabe_status,
    bypassGrund: lead.freigabe_bypass_grund,
    funnelDirektauftrag: funnelDirektauftragFromDaten(lead.funnel_daten),
    hvMeldungStatus: lead.hv_meldung_status,
    angebotZugestellt: resolveAngebotZugestelltForHvFreigabe({
      orgFreigabeStatus: lead.org_freigabe_status,
      bypassGrund: lead.freigabe_bypass_grund,
      hasAngebot: hatAngebotsdaten,
    }),
  });
  const angebotPdfZeilen =
    (wartetOrgFreigabe || freigabeInfoKind === "schwelle") && angebot
      ? orgAngebotPdfZeilen(angebot)
      : [];

  const detailVm = useMemo(() => {
    const vm = buildOrgEingangVorgangDetailVm(lead);
    const showAngebotBlock =
      hatAngebotsdaten &&
      angebot &&
      (wartetOrgFreigabe || freigabeInfoKind === "schwelle");
    if (!showAngebotBlock) {
      return vm;
    }
    const positionen = angebot.positionenDisplay ?? [];
    const leistungen = positionen.map((p) => ({
      id: p.id,
      title: p.title,
      beschreibung: p.beschreibung,
      gewerk: p.gewerk,
      menge: p.mengeLabel ?? (p.menge != null ? String(p.menge) : undefined),
      einheit: p.mengeLabel ? undefined : p.einheit,
      preisBrutto: p.preisBrutto > 0 ? p.preisBrutto : null,
    }));
    return {
      ...vm,
      objektMelder: { ...vm.objektMelder, preisIndikation: null },
      leistungen,
      detailsLeistungen:
        leistungen.length > 0
          ? { title: "Angebot", mode: "vk" as const }
          : null,
      auftraggeber: {
        ...vm.auftraggeber,
        summeBrutto:
          typeof angebot.gesamtBrutto === "number" && angebot.gesamtBrutto > 0
            ? angebot.gesamtBrutto
            : vm.auftraggeber.summeBrutto,
      },
    };
  }, [lead, wartetOrgFreigabe, hatAngebotsdaten, angebot, freigabeInfoKind]);

  return (
    <>
      {showClose && onClose ? (
        <div className="mb-2 flex justify-start lg:hidden">
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted"
            aria-label="Schließen"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : null}

      {!wartetOrgFreigabe && freigabeInfoKind === "schwelle" ? (
        <div className="mb-4">
          <HvFreigabeInfoBanner
            kind="schwelle"
            schwelleLabel={
              kunde.freigabe_schwelle_eur != null
                ? new Intl.NumberFormat("de-DE", {
                    style: "currency",
                    currency: "EUR",
                    maximumFractionDigits: 0,
                  }).format(Number(kunde.freigabe_schwelle_eur))
                : null
            }
          />
        </div>
      ) : null}

      {!wartetOrgFreigabe ? (
        <OrgMeldungAktionBanner
          lead={lead}
          kunde={kunde}
          objekte={objekte}
          onUpdated={onRefresh}
        />
      ) : null}

      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">
            {meldeKategorieLabel(kategorie ?? undefined)}
          </p>
          <p className="text-sm text-text-secondary">
            {lead.objekt?.titel ?? "Objekt"}
          </p>
        </div>
      </div>

      {wartetOrgFreigabe || freigabeInfoKind === "schwelle" ? (
        angebot ? <OrgAngebotFreigabeInhalt angebot={angebot} /> : null
      ) : null}

      <VorgangDetailBlocks vm={detailVm} />

      {lead.einladung_status === "offen" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <p>Wartet auf Ergänzung durch Melder.</p>
          {lead.melder_email ? (
            <button
              type="button"
              className={cn(
                "btn-pill-outline mt-2 text-xs",
                resendBusy && "opacity-60"
              )}
              disabled={resendBusy}
              onClick={resendEinladung}
            >
              Einladung erneut senden
            </button>
          ) : null}
          {resendMsg ? (
            <p className="text-xs mt-2 text-text-secondary">{resendMsg}</p>
          ) : null}
        </div>
      ) : null}

      {angebotPdfZeilen.length > 0 ? (
        <DokumenteTabelle
          heading="Angebot (PDF)"
          dokumente={angebotPdfZeilen}
          emptyText="Noch kein Angebots-PDF verfügbar."
        />
      ) : null}

      {wartetOrgFreigabe ? (
        <OrgFreigabeBanner
          leadId={lead.id}
          status={lead.org_freigabe_status ?? ""}
          bypassGrund={lead.freigabe_bypass_grund}
          hvMeldungStatus={lead.hv_meldung_status}
          funnelDirektauftrag={funnelDirektauftragFromDaten(lead.funnel_daten)}
          schwelleLabel={
            kunde.freigabe_schwelle_eur != null
              ? new Intl.NumberFormat("de-DE", {
                  style: "currency",
                  currency: "EUR",
                  maximumFractionDigits: 0,
                }).format(Number(kunde.freigabe_schwelle_eur))
              : undefined
          }
          onUpdated={onRefresh}
        />
      ) : null}

      {bautagebuchEintraege && bautagebuchEintraege.length > 0 ? (
        <BautagebuchAccordionList
          heading="Updates"
          className="!border-t-0 !pt-0"
          headerAction={
            auftragId && lead.kostentraeger === "versicherung" ? (
              <a
                href={`/api/org/bautagebuch-versicherung?auftragId=${encodeURIComponent(auftragId)}`}
                className="btn-pill-outline portal-btn-compact"
                target="_blank"
                rel="noopener noreferrer"
              >
                Für Versicherung exportieren
              </a>
            ) : null
          }
          eintraege={bautagebuchEintraege.map((b) => ({
            id: b.id ?? `${b.datum}-${b.titel}`,
            datum: b.datum ?? b.created_at,
            titel: b.titel ?? "Eintrag",
            beschreibung: b.notiz,
            fotos: b.fotos_urls,
          }))}
        />
      ) : null}

      {(() => {
        const unterlagen = excludeMeldeFunnelFotosFromDokumente(
          (vorgangUnterlagen ?? [])
            .filter((d) => !isAbnahmePortalDokument(d as PortalDokument))
            .map(
              (d): PortalDokument => ({
                id: d.id,
                name: d.name,
                subtitle: d.subtitle,
                datum: d.datum,
                href: d.href,
                art: (d as PortalDokument).art ?? "dokument",
              })
            ),
          meldeFotosFromLead(lead)
        );
        if (!unterlagen.length) return null;
        return (
          <DokumenteTabelle
            heading="Anhänge"
            dokumente={unterlagen.map((d) => ({
              id: d.id,
              name: d.subtitle ? `${d.name} — ${d.subtitle}` : d.name,
              datum: d.datum,
              href: d.href,
            }))}
          />
        );
      })()}

      <OrgVorgangFeedbackSection
        leadId={lead.id}
        feedbackBereit={feedbackBereit}
        handwerkerErledigt={hwErledigt}
        hvFeedback={hvFeedback}
        onSubmitted={onRefresh}
      />

      <KostentraegerSelector
        leadId={lead.id}
        value={lead.kostentraeger}
        vorgeschlagen={lead.kostentraeger_vorgeschlagen ?? false}
        versicherungsNr={lead.versicherungs_nr}
        onSaved={onRefresh}
      />

      {auftragId &&
      (lead.kostentraeger === "versicherung") ? (
        <VersicherungsakteButton auftragId={auftragId} />
      ) : null}

      <VorgangKommentareThread leadId={lead.id} />

      <OrganisationVorgangNotizenPanel leadId={lead.id} />

      <div className="flex flex-wrap gap-2 pt-2">
        <VorgangStornoDialog
          leadId={lead.id}
          inAusfuehrung={
            lead.hv_meldung_status === "notmassnahme" ||
            lead.vorgang_phase === "beauftragt" ||
            lead.vorgang_phase === "in_bearbeitung"
          }
          onDone={onRefresh}
        />
      </div>

      {lead.created_at ? (
        <p className="text-xs text-text-tertiary">
          Eingegangen: {new Date(lead.created_at).toLocaleString("de-DE")}
        </p>
      ) : null}
    </>
  );
}

export function OrganisationEingangPanel({
  kunde,
  eingang,
  objekte,
  angebote = [],
  initialSelectedId,
  onRefresh,
  listActions = false,
  auftragByLeadId = {},
  auftragKontextByLeadId = {},
  bautagebuchByLeadId = {},
  hwErledigtByLeadId = {},
  feedbackBereitByLeadId = {},
  hvFeedbackByLeadId = {},
  dokumenteByLeadId = {},
  hvAbnahmeByLeadId = {},
}: Props) {
  const angebotByLeadId = useMemo(() => {
    const map = new Map<string, OrgFreigabeAngebot>();
    for (const a of angebote) {
      const leadId = a.lead_id?.trim();
      if (leadId) map.set(leadId, a);
    }
    return map;
  }, [angebote]);

  const [objektFilter, setObjektFilter] = useState<string>("alle");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("alle");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId ?? null
  );
  const [detailOpening, setDetailOpening] = useState(() =>
    Boolean(initialSelectedId)
  );
  const detailOpeningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  /** Nach Zurück: stale URL-id nicht sofort wieder öffnen. */
  const closingRef = useRef(false);
  const pendingOpenIdRef = useRef<string | null>(null);
  const { hold, release } = usePortalBusy();
  const detailHoldRef = useRef(false);

  function beginDetailOpening() {
    if (!detailHoldRef.current) {
      detailHoldRef.current = true;
      hold();
    }
    paintPortalBusyNow(setDetailOpening);
    if (detailOpeningTimerRef.current) {
      clearTimeout(detailOpeningTimerRef.current);
      detailOpeningTimerRef.current = null;
    }
  }

  function endDetailOpening() {
    setDetailOpening(false);
    if (detailHoldRef.current) {
      detailHoldRef.current = false;
      release();
    }
  }

  useEffect(() => {
    if (!initialSelectedId) {
      if (closingRef.current) {
        closingRef.current = false;
        pendingOpenIdRef.current = null;
        setSelectedId(null);
        endDetailOpening();
      }
      return;
    }
    if (closingRef.current) return;
    if (pendingOpenIdRef.current === initialSelectedId) {
      flushSync(() => {
        setSelectedId(initialSelectedId);
      });
      return;
    }
    pendingOpenIdRef.current = initialSelectedId;
    beginDetailOpening();
    flushSync(() => {
      setSelectedId(initialSelectedId);
    });
  }, [initialSelectedId]);

  const filtered = useMemo(() => {
    return eingang.filter((lead) => {
      if (objektFilter !== "alle") {
        const obj = objekte.find((o) => o.id === objektFilter);
        if (!obj || !leadBelongsToObjekt(lead, obj)) return false;
      }
      const hv = lead.hv_meldung_status ?? "neu";
      if (statusFilter === "neu") return hv === "neu";
      if (statusFilter === "wartet_melder") {
        return lead.einladung_status === "offen";
      }
      if (statusFilter === "in_bearbeitung") {
        return hv !== "neu" && hv !== "abgelehnt" && hv !== "abgeschlossen";
      }
      return true;
    });
  }, [eingang, objektFilter, objekte, statusFilter]);

  const selected =
    filtered.find((l) => l.id === selectedId) ??
    eingang.find((l) => l.id === selectedId) ??
    null;

  useEffect(() => {
    if (!detailOpening || !selectedId || !selected) return;
    const t = window.setTimeout(() => {
      endDetailOpening();
    }, PORTAL_BUSY_MIN_MS);
    return () => window.clearTimeout(t);
  }, [detailOpening, selectedId, selected]);

  const router = useRouter();

  const openDetail = (id: string) => {
    closingRef.current = false;
    pendingOpenIdRef.current = id;
    beginDetailOpening();
    flushSync(() => {
      setSelectedId(id);
    });
    router.replace(
      `/portal?section=vorgaenge&filter=offen&id=${encodeURIComponent(id)}`,
      { scroll: false }
    );
  };

  const closeDetail = () => {
    closingRef.current = true;
    pendingOpenIdRef.current = null;
    endDetailOpening();
    flushSync(() => {
      setSelectedId(null);
    });
    router.replace(`/portal?section=vorgaenge&filter=offen`, { scroll: false });
  };

  if (selectedId && (detailOpening || !selected)) {
    return (
      <PortalContentBusy
        title="Vorgang wird geladen…"
        body="Einen Moment — wir öffnen die Details."
      />
    );
  }

  if (selected) {
    return (
      <div className="-mx-4 -mt-2 min-w-0 space-y-3 lg:-mx-6">
        <button
          type="button"
          onClick={closeDetail}
          className="rounded-full border border-[var(--p2-line,rgba(0,0,0,0.08))] px-3 py-1.5 text-[12.5px] font-semibold"
          style={{
            background: "var(--p2-selected, #f0f2f0)",
            color: PORTAL_VAR.sub,
          }}
        >
          ‹ Zurück
        </button>
        <MeldungDetail
          lead={selected}
          kunde={kunde}
          objekte={objekte}
          angebot={angebotByLeadId.get(selected.id) ?? null}
          onRefresh={onRefresh}
          auftragId={auftragByLeadId[selected.id]}
          bautagebuchEintraege={bautagebuchByLeadId[selected.id]}
          hwErledigt={hwErledigtByLeadId[selected.id]}
          feedbackBereit={feedbackBereitByLeadId[selected.id]}
          hvFeedback={hvFeedbackByLeadId[selected.id]}
          hvAbnahme={hvAbnahmeByLeadId[selected.id] ?? null}
          vorgangUnterlagen={dokumenteByLeadId[selected.id]}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!listActions ? (
        <>
          <div>
            <h2 className="portal-text-section">Meldungen</h2>
            <p className="portal-text-meta text-text-secondary">
              Mieter-Meldungen und Direkterfassungen — Aktionen für neue Vorgänge.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border-default bg-surface-card p-3">
            <span className="portal-text-label inline-flex items-center gap-1 normal-case tracking-normal text-text-tertiary">
              <Filter className="h-3.5 w-3.5" />
              Filter
            </span>
            <select
              className="portal-text-meta rounded-lg border border-border-default px-2 py-1.5"
              value={objektFilter}
              onChange={(e) => setObjektFilter(e.target.value)}
            >
              <option value="alle">Alle Objekte</option>
              {objekte.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.titel}
                </option>
              ))}
            </select>
            <select
              className="portal-text-meta rounded-lg border border-border-default px-2 py-1.5"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="alle">Alle Status</option>
              <option value="neu">Neu</option>
              <option value="wartet_melder">Wartet auf Melder</option>
              <option value="in_bearbeitung">In Bearbeitung</option>
            </select>
          </div>
        </>
      ) : null}

      <div className="flex flex-col gap-2.5">
        {filtered.length === 0 ? (
          <p className="portal-text-body rounded-[12px] border border-border-default bg-white px-4 py-8 text-center text-text-secondary">
            Keine Meldungen für die gewählten Filter.
          </p>
        ) : (
          filtered.map((lead) => {
            const kat = meldeKategorieLabel(
              meldeKategorieFromLead(lead) ?? undefined
            );
            const infoOnly = isHvDirektauftragInfoOnly(lead, kunde, objekte);
            const rawObj = lead.objekt;
            const objekt: PortalObjekt | null = rawObj
              ? {
                  name: rawObj.name?.trim() || rawObj.titel?.trim() || "Objekt",
                  strasse: rawObj.strasse ?? rawObj.adresseZeile ?? null,
                  plz: rawObj.plz ?? null,
                  ort: rawObj.ort ?? null,
                  cover_url: rawObj.cover_url ?? null,
                }
              : null;
            const source = {
              strasse: lead.strasse,
              hausnummer: lead.hausnummer,
              plz: lead.plz,
              funnel_daten: lead.funnel_daten,
              melder_name: lead.melder_name,
              melder_einheit: lead.melder_einheit,
              melder_telefon: lead.melder_telefon,
              melder_email: lead.melder_email,
              kontakt_name: lead.kontakt_name,
              objekt,
            };
            const melder = resolveAnfrageMelder(source);
            const we = melder.einheit?.trim()
              ? /^(WE|Whg)/i.test(melder.einheit.trim())
                ? melder.einheit.trim()
                : `WE ${melder.einheit.trim()}`
              : undefined;
            const person = melder.name?.trim() || undefined;
            const subtitle = [
              formatMockVorgangListSubtitle(source) ||
                objekt?.name ||
                "Objekt",
              we,
              person,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <div key={lead.id} className="space-y-2">
                <PortalListCard
                  variant="responsive"
                  selected={false}
                  onClick={() => openDetail(lead.id)}
                  title={kat}
                  subtitle={subtitle}
                  statusLabel={plattformStatusLabel(
                    resolvePlattformStatus(lead, auftragKontextByLeadId[lead.id])
                  )}
                  statusPillClass={plattformStatusPillClass(
                    resolvePlattformStatus(lead, auftragKontextByLeadId[lead.id])
                  )}
                  accent="anfrage"
                  meta={
                    infoOnly
                      ? [{ icon: "hammer", text: "Sofortmaßnahme — Info" }]
                      : []
                  }
                  showChevron
                />
                {listActions && !infoOnly ? (
                  <div className="px-1">
                    <HvMeldungListActions
                      lead={lead}
                      kunde={kunde}
                      objekte={objekte}
                      onUpdated={onRefresh}
                    />
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
