"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { usePortalBusy } from "@/components/shared/PortalBusyContext";
import { VorgangDetailBlocks } from "@/components/shared/vorgang-detail";
import { buildKundeHvVorgangDetailVm } from "@/lib/vorgang/build-vorgang-detail-vm";
import { BautagebuchAccordionList } from "@/components/shared/BautagebuchAccordionList";
import { DokumenteTabelle } from "@/components/shared/DokumenteTabelle";
import { PortalDocInlinePreview } from "@/components/shared/PortalDocInlinePreview";
import { PortalDocOpenButton } from "@/components/shared/PortalDocOpenButton";
import { PortalDetailCover } from "@/components/shared/PortalDetailCover";
import { PortalDetailCard } from "@/components/shared/PortalDetailCard";
import { PortalFlowTimeline } from "@/components/shared/PortalFlowTimeline";
import {
  PortalDetailHead,
  PortalDetailInfoBox,
  PortalDetailLayout,
  PortalDetailStickyActions,
} from "@/components/shared/PortalDetailUi";
import { VorgangDetailSectionNav } from "@/components/shared/VorgangDetailSectionNav";
import { HvFreigabeInfoBanner } from "@/components/org/HvFreigabeInfoBanner";
import { OrganisationVersicherungBlock } from "@/components/org/OrganisationVersicherungBlock";
import { KostentraegerSelector } from "@/components/org/KostentraegerSelector";
import { OrgHmBefundPanel } from "@/components/org/OrgHmBefundPanel";
import {
  hvFreigabeEntfaellt,
  resolveAngebotZugestelltForHvFreigabe,
} from "@/lib/org/freigabe-bypass";
import { fetchObjektHmDelegierbar } from "@/lib/org/fetch-objekt-hm-delegierbar";
import { acceptKundeAngebot, rejectKundeAngebot } from "@/app/actions/portal-angebot";
import {
  countUnreadBautagebuch,
  getBautagebuchLastSeenAt,
  markBautagebuchSeen,
} from "@/lib/portal2/bautagebuch-attention";
import {
  normalizePortalDeepLinkTab,
  portalDeepLinkTabForHvNav,
  PORTAL_DETAIL_TAB_QUERY,
} from "@/lib/portal2/portal-detail-deep-link";
import {
  HV_DEFAULT_SCHWELLE_EUR,
  HV_DETAIL_COPY,
  angebotSummeFromBruttoTotal,
  angebotSummeFromPositionen,
  hvRoleActionKind,
  moneyEur,
  pickEmpfohlenesAngebot,
  type HvDetailPosition,
  type HvOfferCard,
  type HvVerlaufEntry,
} from "@/lib/portal2/hv-detail";
import {
  type PortalDetailSectionId,
} from "@/lib/portal2/layout-chrome";
import { PORTAL_STATUS, type PortalMockStatusId } from "@/lib/portal2/status";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { kundePortalToast, orgPortalToast } from "@/lib/shared/portal-toast";
import type { PortalBautagebuchEntry } from "@/lib/portal/portal-detail-item";
import type { PortalAngebotPositionDisplay } from "@/lib/portal/portal-angebot-display";
import type { PortalAuftragPositionDisplay } from "@/lib/portal/kunde-auftrag-aenderung";
import {
  excludeMeldeFunnelFotosFromDokumente,
  isAbnahmePortalDokument,
  type PortalDokument,
} from "@/lib/portal/portal-dokumente";
import { cn } from "@/lib/utils";

export type OrganisationHvVorgangDetailProps = {
  idLabel: string;
  titel: string;
  objekt: string;
  kategorie?: string;
  beschreibung?: string | null;
  notfall?: boolean;
  flowStatus: PortalMockStatusId;
  privatkunde?: boolean;
  melder?: string;
  prioritaet?: string;
  handwerkerName?: string | null;
  leadId: string;
  /** Für Abnahme */
  auftragId?: string;
  hvAbnahme?: {
    art: "ohne_vorbehalt" | "mit_anmerkung" | "zurueckgewiesen";
    anmerkung?: string | null;
    signiert_name: string;
    signiert_am: string;
  } | null;
  hwErledigt?: boolean;
  schwelleEur?: number;
  /** Mehrfachfähig; UI zeigt 1 empfohlen (ENTSCHEIDUNG 10). */
  offers?: HvOfferCard[];
  positionen?: HvDetailPosition[];
  /** Alternative: Portal-Display-Positionen (Brutto-Zeilen). */
  positionenBrutto?: PortalAngebotPositionDisplay[];
  /** Auftrags-Leistungen aus CRM (bevorzugt ab Auftrag/Abschluss). */
  auftragPositionen?: PortalAuftragPositionDisplay[];
  gesamtBrutto?: number;
  /** @deprecated Abschlagsplan entfernt — Rechnungen nur unter Dokumente. */
  rechnungen?: unknown[];
  rechnungPdfHref?: string | null;
  bautagebuch?: PortalBautagebuchEntry[];
  /** CRM-/Portal-Unterlagen (bereits rollen-gefiltert). */
  dokumente?: PortalDokument[];
  /** Abnahme-Checkliste (Leistungen + Mängel) für Abschluss-Card. */
  abnahmeCheckliste?: {
    leistungen: Array<{ name: string; ok?: boolean }>;
    maengel: Array<{ titel: string; status?: string | null }>;
  } | null;
  verlauf?: HvVerlaufEntry[];
  coverUrl?: string | null;
  onBack?: () => void;
  onUpdated: () => void | Promise<void>;
  /** org_freigabe_status für Angebots-Freigabe */
  orgFreigabeStatus?: string | null;
  /** Persistierter Bypass (V2) — Portal rechnet nicht selbst */
  freigabeBypassGrund?: "schwelle" | "akut" | null;
  /** Funnel Sofortmaßnahme — unabhängig von org_freigabe_status */
  funnelDirektauftrag?: boolean | null;
  hvMeldungStatus?: string | null;
  /** Für HM-CTA: Objekt-Kontakt rolle=hausmeister */
  kundeObjektId?: string | null;
  /** Gesendetes Angebot — Annahme legt Auftrag an */
  angebotId?: string | null;
  canAcceptAngebot?: boolean;
  /** Einheitliche Detail-Blöcke */
  melderEinheit?: string | null;
  melderTelefon?: string | null;
  melderEmail?: string | null;
  kostentraeger?: string | null;
  kostentraegerVorgeschlagen?: boolean;
  versicherungsNr?: string | null;
  schadenNr?: string | null;
  versicherungsaktePdfUrl?: string | null;
  versicherungsakteErstelltAm?: string | null;
  schadenNrGeaendertAm?: string | null;
  versicherungsNrGeaendertAm?: string | null;
  objektPolicenNr?: string | null;
  meldeFotos?: string[];
  meldeStrasse?: string | null;
  meldePlz?: string | null;
  meldeOrt?: string | null;
  meldeSituation?: string | null;
  meldeBereich?: string | null;
  meldeZeitraum?: string | null;
  meldeFachdetails?: Array<{ label: string; value: string }>;
  detailRole?: "hv" | "kunde" | "mieter" | "hausmeister";
  /** Hausmeister-Portal: Befund im Tab editierbar, ohne HV-only CTAs. */
  hausmeisterActor?: boolean;
  /**
   * Optionaler Status-Chip-/VM-Text (z. B. Mieter: „In Bearbeitung“
   * statt „Angebot“).
   */
  statusLabelOverride?: string | null;
  /** Mieter: Timeline ohne Angebot, „Auftrag“ → „Bestätigung“. */
  mieterStatusMode?: boolean;
  /** @deprecated Nicht mehr im Detail-Head (nur Titel + eine Subline). */
  wartetAufHwLabel?: string | null;
  /** Unverbindliche Preisindikation aus Mieter-Meldung (nur HV). */
  meldePreisIndikation?: string | null;
  /** Auftrag-Start/-Ende für Ausführung · Termin */
  terminVon?: string | null;
  terminBis?: string | null;
  /**
   * D2 (leicht): `detailRole` + `mieterStatusMode` steuern Copy/Sections.
   * Kein BW-Freigabe-/Angebot-Wording bei Mieter (`mieterStatusMode`).
   */
};

/** C1: Border-Card mobil, flach ab lg. Title optional (Tab = Pill sagt schon den Namen). */
function DetailCard({
  title,
  children,
  id,
  badge,
}: {
  title?: string;
  children: React.ReactNode;
  id?: string;
  badge?: number | null;
}) {
  return (
    <PortalDetailCard
      id={id}
      title={title}
      chrome="responsive"
      headerAction={
        badge && badge > 0 ? (
          <span
            className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
            style={{
              background: PORTAL_VAR.dangerSoft,
              color: PORTAL_VAR.danger,
            }}
          >
            {badge > 9 ? "9+" : badge}
          </span>
        ) : undefined
      }
    >
      {children}
    </PortalDetailCard>
  );
}

function ActionBtn({
  label,
  mobileLabel,
  onClick,
  kind = "primary",
  disabled,
  loading,
  className,
}: {
  label: string;
  /** Optional kürzerer Text nur auf Mobil (&lt; sm). */
  mobileLabel?: string;
  onClick: () => void;
  kind?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) {
  const shown = loading ? "Wird geladen…" : label;
  const shownMobile = loading ? "…" : mobileLabel;
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      aria-busy={loading || undefined}
      className={cn(
        "portal-action-btn",
        kind === "ghost"
          ? "portal-action-btn--ghost"
          : kind === "secondary"
            ? "portal-action-btn--secondary"
            : kind === "danger"
              ? "portal-action-btn--danger"
              : "portal-action-btn--primary",
        className
      )}
    >
      {shownMobile ? (
        <>
          <span className="sm:hidden">{shownMobile}</span>
          <span className="hidden sm:inline">{shown}</span>
        </>
      ) : (
        shown
      )}
    </button>
  );
}

function PositionenTable({
  positionen,
  sum,
}: {
  positionen: HvDetailPosition[];
  sum: { net: number; mwst: number; brutto: number };
}) {
  return (
    <div
      className="overflow-hidden rounded-[9px]"
      style={{ border: `1px solid ${PORTAL_VAR.line}` }}
    >
      {positionen.map((p, i) => (
        <div
          key={i}
          className="portal-text-meta flex justify-between px-3 py-2.5"
          style={{ borderBottom: `1px solid ${PORTAL_VAR.line2}` }}
        >
          <div>
            <div className="font-semibold" style={{ color: PORTAL_VAR.ink }}>
              {p.pos}
            </div>
            <div className="portal-text-label normal-case tracking-normal" style={{ color: PORTAL_VAR.faint }}>
              {p.menge} · {p.gewerk}
            </div>
          </div>
          <span className="font-semibold" style={{ color: PORTAL_VAR.ink }}>
            {moneyEur(p.einzel)}
          </span>
        </div>
      ))}
      <div className="flex flex-col gap-1 bg-[var(--p2-primary-soft,#e7f1e9)]/50 px-3 py-2.5">
        <div
          className="portal-text-meta flex justify-between"
          style={{ color: PORTAL_VAR.sub }}
        >
          <span>Netto</span>
          <span>{moneyEur(sum.net)}</span>
        </div>
        <div
          className="portal-text-meta flex justify-between"
          style={{ color: PORTAL_VAR.sub }}
        >
          <span>MwSt. 19%</span>
          <span>{moneyEur(sum.mwst)}</span>
        </div>
        <div className="portal-text-section mt-0.5 flex justify-between">
          <span>Gesamt</span>
          <span>{moneyEur(sum.brutto)}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Mock `screenDetail` für Kunde-HV — Reihenfolge:
 * cover → header → timeline → Beschreibung → roleActionPanel → bautagebuch
 * | metaCard + verlaufCard
 */
export function OrganisationHvVorgangDetail({
  idLabel,
  titel,
  objekt,
  kategorie,
  beschreibung,
  notfall,
  flowStatus,
  privatkunde,
  melder,
  prioritaet: _prioritaet,
  handwerkerName,
  leadId,
  auftragId,
  hvAbnahme: _hvAbnahme,
  hwErledigt: _hwErledigt,
  schwelleEur = HV_DEFAULT_SCHWELLE_EUR,
  offers = [],
  positionen = [],
  positionenBrutto = [],
  auftragPositionen = [],
  gesamtBrutto,
  rechnungen: _rechnungen = [],
  rechnungPdfHref,
  bautagebuch = [],
  dokumente = [],
  abnahmeCheckliste = null,
  verlauf: _verlauf = [],
  coverUrl,
  onBack,
  onUpdated,
  orgFreigabeStatus,
  freigabeBypassGrund = null,
  funnelDirektauftrag = null,
  hvMeldungStatus,
  kundeObjektId = null,
  angebotId,
  canAcceptAngebot = false,
  melderEinheit,
  melderTelefon,
  melderEmail,
  kostentraeger,
  kostentraegerVorgeschlagen,
  versicherungsNr,
  schadenNr,
  versicherungsaktePdfUrl,
  versicherungsakteErstelltAm,
  schadenNrGeaendertAm,
  versicherungsNrGeaendertAm,
  objektPolicenNr,
  meldeFotos,
  meldeStrasse,
  meldePlz,
  meldeOrt,
  meldeSituation,
  meldeBereich,
  meldeZeitraum,
  meldeFachdetails,
  meldePreisIndikation,
  terminVon,
  terminBis,
  detailRole = "hv",
  hausmeisterActor = false,
  statusLabelOverride,
  mieterStatusMode = false,
}: OrganisationHvVorgangDetailProps) {
  const searchParams = useSearchParams();
  const { runBusy } = usePortalBusy();
  const deepLinkAppliedRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [busyAktion, setBusyAktion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [btUnread, setBtUnread] = useState(0);
  const [hasHmKontakt, setHasHmKontakt] = useState(false);
  const [hmPortalZugang, setHmPortalZugang] = useState(false);
  const [hasBefund, setHasBefund] = useState(false);
  /** Nach HM-Delegation sofort Tab/UI, bevor Refresh ankommt. */
  const [hvStatusOptimistic, setHvStatusOptimistic] = useState<string | null>(
    null
  );
  const [hmStickyActions, setHmStickyActions] = useState<{
    editable: boolean;
    openAbschluss: () => void;
    ablehnenAnHv: () => void;
  } | null>(null);
  const [activeSection, setActiveSection] =
    useState<PortalDetailSectionId>("uebersicht");

  const hvStatusNorm = (
    hvStatusOptimistic ??
    hvMeldungStatus ??
    ""
  )
    .trim()
    .toLowerCase();
  const showHmTab =
    !mieterStatusMode &&
    (hvStatusNorm === "hm_pruefung" ||
      hvStatusNorm === "hm_erledigt" ||
      hasBefund);

  useEffect(() => {
    if (!hausmeisterActor || !showHmTab) return;
    setActiveSection("hm_pruefung");
  }, [hausmeisterActor, showHmTab, leadId]);

  useEffect(() => {
    setHvStatusOptimistic(null);
  }, [leadId, hvMeldungStatus]);

  useEffect(() => {
    if (mieterStatusMode) {
      setHasBefund(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { getLeadBefundAction } = await import("@/app/actions/lead-befund");
      const res = await getLeadBefundAction({ leadId });
      if (cancelled) return;
      setHasBefund(Boolean(res.ok && res.befund?.id));
    })();
    return () => {
      cancelled = true;
    };
  }, [leadId, mieterStatusMode, hvMeldungStatus]);

  useEffect(() => {
    if (mieterStatusMode) {
      setHasHmKontakt(false);
      setHmPortalZugang(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      let oid = String(kundeObjektId ?? "").trim();
      if (!oid && leadId) {
        const { getLeadHausmeisterMetaAction } = await import(
          "@/app/actions/lead-befund"
        );
        const meta = await getLeadHausmeisterMetaAction({ leadId });
        if (cancelled) return;
        if (meta.ok) {
          oid = String(meta.kundeObjektId ?? "").trim();
          // hasHausmeister = zugewiesen; Delegation braucht zusätzlich Portal-Aktivierung
        }
      }
      if (!oid) {
        if (!cancelled) {
          setHasHmKontakt(false);
          setHmPortalZugang(false);
        }
        return;
      }
      const st = await fetchObjektHmDelegierbar(oid);
      if (cancelled) return;
      setHasHmKontakt(st.canDelegate);
      setHmPortalZugang(st.portalAktiv);
    })();
    return () => {
      cancelled = true;
    };
  }, [leadId, mieterStatusMode, kundeObjektId]);

  const angebotVorgelegt = Boolean(
    !mieterStatusMode &&
      !rejected &&
      flowStatus !== "abgelehnt" &&
      (offers?.length ||
        positionenBrutto?.length ||
        (typeof gesamtBrutto === "number" && gesamtBrutto > 0) ||
        canAcceptAngebot ||
        dokumente.some((d) => d.art === "angebot"))
  );
  const hasRechnungDoc = Boolean(
    rechnungPdfHref?.trim() ||
      dokumente.some((d) => /rechnung/i.test(d.name ?? ""))
  );
  /** Rechnung gesendet → Hinweis „Rechnung“ statt „Auftrag“ (nur Kunden-/Privat-Portal).
   * HV: Abschlags-/Kundenrechnung ist CRM — Status bleibt Abschluss/Auftrag. */
  const displayFlowStatus: PortalMockStatusId = (() => {
    if (rejected || flowStatus === "abgelehnt") {
      return "abgelehnt";
    }
    if (detailRole === "hv") {
      if (flowStatus === "rechnung") return "abschluss";
      if (flowStatus === "bezahlt") return "bezahlt";
    } else if (
      hasRechnungDoc &&
      (flowStatus === "auftrag" ||
        flowStatus === "abschluss" ||
        flowStatus === "rechnung" ||
        flowStatus === "bezahlt")
    ) {
      return flowStatus === "bezahlt" ? "bezahlt" : "rechnung";
    }
    if (
      angebotVorgelegt &&
      (flowStatus === "angefragt" || flowStatus === "freigegeben")
    ) {
      return "angebot";
    }
    return flowStatus;
  })();
  /** Freigabe entfällt bei Akut / unter Schwelle — erst nach echtem Angebot, nie Preisindikation. */
  const freigabeEntfaelltKind =
    !mieterStatusMode && !privatkunde
      ? hvFreigabeEntfaellt({
          orgFreigabeStatus,
          bypassGrund: freigabeBypassGrund,
          funnelDirektauftrag,
          hvMeldungStatus,
          // Bypass „schwelle“ zählt (CRM setzt nur nach Angebot; Status oft nicht_noetig)
          angebotZugestellt: resolveAngebotZugestelltForHvFreigabe({
            orgFreigabeStatus,
            bypassGrund: freigabeBypassGrund,
            hasAngebot: angebotVorgelegt,
          }),
        })
      : null;
  const freigabeNichtNoetig = freigabeEntfaelltKind != null;

  const actionKindRaw = hvRoleActionKind(displayFlowStatus, {
    privatkunde,
    angebotVorgelegt,
  });
  const actionKind =
    freigabeNichtNoetig && actionKindRaw === "freigabe"
      ? "none"
      : actionKindRaw;
  /** Nie Freigeben/Ablehnen (Kostenfreigabe), wenn Bypass greift — auch bei Angebots-Tab. */
  const showFreigabeButtons =
    !freigabeNichtNoetig &&
    actionKindRaw === "freigabe" &&
    hvStatusNorm !== "hm_pruefung" &&
    hvStatusNorm !== "hm_erledigt";
  const showVersicherungTab =
    detailRole === "hv" &&
    !mieterStatusMode &&
    !hausmeisterActor &&
    Boolean(leadId) &&
    String(kostentraeger ?? "").trim().toLowerCase() === "versicherung";
  const showKostentraegerEdit =
    detailRole === "hv" && !mieterStatusMode && !hausmeisterActor && Boolean(leadId);
  const versicherungBlock = showVersicherungTab ? (
    <OrganisationVersicherungBlock leadId={leadId} onSaved={onUpdated} />
  ) : null;
  const empfohlen = pickEmpfohlenesAngebot(offers);
  const statusLabel =
    statusLabelOverride?.trim() || PORTAL_STATUS[displayFlowStatus].label;

  const abnahmeProtokolle = useMemo(
    () => dokumente.filter((d) => isAbnahmePortalDokument(d) && Boolean(d.href?.trim())),
    [dokumente]
  );
  const dokumenteOhneAbnahme = useMemo(
    () =>
      excludeMeldeFunnelFotosFromDokumente(
        dokumente.filter((d) => !isAbnahmePortalDokument(d)),
        meldeFotos
      ),
    [dokumente, meldeFotos]
  );

  const abschlussCard = (
    <div className="space-y-3.5">
      <DetailCard title={HV_DETAIL_COPY.abnahmeTitle}>
        {abnahmeProtokolle.length > 0 ? (
          <div className="space-y-3">
            {abnahmeProtokolle.map((doc) => (
              <div key={doc.id} className="space-y-2">
                <PortalDocOpenButton
                  href={doc.href!}
                  name={doc.name}
                  kind="pdf"
                  className="block w-full overflow-hidden bg-white text-left"
                >
                  <p
                    className="px-3 py-4 text-center text-[12.5px] font-semibold"
                    style={{ color: PORTAL_VAR.primary }}
                  >
                    {doc.name} — PDF öffnen
                  </p>
                </PortalDocOpenButton>
                <PortalDocInlinePreview url={doc.href!} title={doc.name} />
              </div>
            ))}
            {abnahmeCheckliste &&
            (abnahmeCheckliste.leistungen.length > 0 ||
              abnahmeCheckliste.maengel.length > 0) ? (
              <div className="space-y-3 pt-1">
                {abnahmeCheckliste.leistungen.length > 0 ? (
                  <div>
                    <p
                      className="portal-text-label mb-1.5"
                      style={{ color: PORTAL_VAR.faint }}
                    >
                      {HV_DETAIL_COPY.abnahmeLeistungen}
                    </p>
                    <ul className="space-y-1.5">
                      {abnahmeCheckliste.leistungen.map((l) => (
                        <li
                          key={l.name}
                          className="portal-text-meta flex items-start gap-2"
                          style={{ color: PORTAL_VAR.ink }}
                        >
                          <span
                            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                            style={{
                              background:
                                l.ok === false ? "#8A5A06" : PORTAL_VAR.primary,
                            }}
                            aria-hidden
                          >
                            {l.ok === false ? "!" : "✓"}
                          </span>
                          <span className="font-semibold">{l.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {abnahmeCheckliste.maengel.length > 0 ? (
                  <div>
                    <p
                      className="portal-text-label mb-1.5"
                      style={{ color: PORTAL_VAR.faint }}
                    >
                      {HV_DETAIL_COPY.abnahmeMaengel}
                    </p>
                    <ul className="space-y-1.5">
                      {abnahmeCheckliste.maengel.map((m) => (
                        <li
                          key={m.titel}
                          className="portal-text-meta flex items-start gap-2 rounded-lg px-2.5 py-2"
                          style={{ background: "#FBF1D6", color: "#8A5A06" }}
                        >
                          <span className="font-semibold">{m.titel}</span>
                          {m.status ? (
                            <span className="portal-text-label ml-auto shrink-0 normal-case tracking-normal opacity-80">
                              {m.status}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : abnahmeCheckliste &&
          (abnahmeCheckliste.leistungen.length > 0 ||
            abnahmeCheckliste.maengel.length > 0) ? (
          <div className="space-y-3">
            {abnahmeCheckliste.leistungen.length > 0 ? (
              <div>
                <p
                  className="portal-text-label mb-1.5"
                  style={{ color: PORTAL_VAR.faint }}
                >
                  {HV_DETAIL_COPY.abnahmeLeistungen}
                </p>
                <ul className="space-y-1.5">
                  {abnahmeCheckliste.leistungen.map((l) => (
                    <li
                      key={l.name}
                      className="portal-text-meta flex items-start gap-2"
                      style={{ color: PORTAL_VAR.ink }}
                    >
                      <span
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                        style={{
                          background:
                            l.ok === false ? "#8A5A06" : PORTAL_VAR.primary,
                        }}
                        aria-hidden
                      >
                        {l.ok === false ? "!" : "✓"}
                      </span>
                      <span className="font-semibold">{l.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {abnahmeCheckliste.maengel.length > 0 ? (
              <div>
                <p
                  className="portal-text-label mb-1.5"
                  style={{ color: PORTAL_VAR.faint }}
                >
                  {HV_DETAIL_COPY.abnahmeMaengel}
                </p>
                <ul className="space-y-1.5">
                  {abnahmeCheckliste.maengel.map((m) => (
                    <li
                      key={m.titel}
                      className="portal-text-meta flex items-start gap-2 rounded-lg px-2.5 py-2"
                      style={{ background: "#FBF1D6", color: "#8A5A06" }}
                    >
                      <span className="font-semibold">{m.titel}</span>
                      {m.status ? (
                        <span className="portal-text-label ml-auto shrink-0 normal-case tracking-normal opacity-80">
                          {m.status}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="portal-text-meta" style={{ color: PORTAL_VAR.faint }}>
            {HV_DETAIL_COPY.abnahmeEmpty}
          </p>
        )}
      </DetailCard>
    </div>
  );

  const detailVm = useMemo(
    () =>
      buildKundeHvVorgangDetailVm({
        role: detailRole,
        idLabel,
        titel,
        statusLabel,
        notfall,
        kategorie,
        beschreibung,
        objektZeile: objekt,
        melderName: mieterStatusMode ? null : melder,
        einheit: melderEinheit,
        fotos: meldeFotos ?? [],
        meldeStrasse,
        meldePlz,
        meldeOrt,
        meldeSituation,
        meldeBereich,
        meldeZeitraum,
        meldeFachdetails,
        meldePreisIndikation:
          detailRole === "hv" && !mieterStatusMode
            ? meldePreisIndikation
            : null,
        portalFlow: displayFlowStatus,
        angebotPositionen: positionenBrutto,
        auftragPositionen:
          auftragPositionen.length > 0
            ? auftragPositionen
            : positionenBrutto.length > 0 &&
                (displayFlowStatus === "auftrag" ||
                  displayFlowStatus === "abschluss" ||
                  displayFlowStatus === "rechnung" ||
                  displayFlowStatus === "bezahlt")
              ? (positionenBrutto as PortalAuftragPositionDisplay[])
              : undefined,
        gesamtBrutto:
          typeof gesamtBrutto === "number"
            ? gesamtBrutto
            : empfohlen?.betrag ?? null,
        handwerkerName,
        terminVon,
        terminBis,
        rechnungsempfaengerHint: null,
        lead: {
          melder_name: melder,
          melder_einheit: melderEinheit,
          melder_telefon: melderTelefon,
          melder_email: melderEmail,
          strasse: meldeStrasse,
          plz: meldePlz,
          ort: meldeOrt,
          kostentraeger: showKostentraegerEdit ? null : kostentraeger,
          kostentraeger_vorgeschlagen: showKostentraegerEdit
            ? false
            : kostentraegerVorgeschlagen,
          versicherungs_nr: showKostentraegerEdit ? null : versicherungsNr,
          org_freigabe_status: orgFreigabeStatus,
          hv_meldung_status: hvMeldungStatus,
        },
      }),
    [
      detailRole,
      idLabel,
      titel,
      statusLabel,
      notfall,
      kategorie,
      beschreibung,
      objekt,
      melder,
      melderEinheit,
      meldeFotos,
      privatkunde,
      meldeStrasse,
      meldePlz,
      meldeOrt,
      meldeSituation,
      meldeBereich,
      meldeZeitraum,
      meldeFachdetails,
      meldePreisIndikation,
      positionenBrutto,
      auftragPositionen,
      gesamtBrutto,
      empfohlen?.betrag,
      handwerkerName,
      terminVon,
      terminBis,
      melderTelefon,
      melderEmail,
      kostentraeger,
      kostentraegerVorgeschlagen,
      versicherungsNr,
      orgFreigabeStatus,
      hvMeldungStatus,
      mieterStatusMode,
      showKostentraegerEdit,
    ]
  );

  const uebersichtVm = useMemo(
    () =>
      actionKind === "angebot"
        ? { ...detailVm, detailsLeistungen: null }
        : detailVm,
    [actionKind, detailVm]
  );

  const derivedPositionen: HvDetailPosition[] = useMemo(() => {
    if (positionen.length) return positionen;
    return positionenBrutto.map((p) => {
      const netto =
        typeof p.preisNetto === "number" && p.preisNetto > 0
          ? p.preisNetto
          : p.preisBrutto > 0
            ? p.preisBrutto / 1.19
            : 0;
      const mengeNum = p.menge != null && p.menge > 0 ? p.menge : 1;
      return {
        pos: p.title,
        menge: p.mengeLabel?.trim() || String(mengeNum).replace(".", ","),
        gewerk: p.gewerk?.trim() || "Leistung",
        einzel: mengeNum > 0 ? netto / mengeNum : netto,
      };
    });
  }, [positionen, positionenBrutto]);

  const sum = useMemo(() => {
    if (derivedPositionen.length) {
      return angebotSummeFromPositionen(derivedPositionen);
    }
    if (typeof gesamtBrutto === "number" && gesamtBrutto > 0) {
      return angebotSummeFromBruttoTotal(gesamtBrutto);
    }
    if (empfohlen) return angebotSummeFromBruttoTotal(empfohlen.betrag);
    return angebotSummeFromBruttoTotal(0);
  }, [derivedPositionen, gesamtBrutto, empfohlen]);

  const meldungAct = async (
    aktion:
      | "angebot_einfordern"
      | "direkt_baerenwald"
      | "hm_begutachten"
      | "ablehnen"
  ) => {
    setBusy(true);
    setBusyAktion(aktion);
    setError(null);
    try {
      await runBusy(async () => {
        const res = await fetch("/api/org/meldung-aktion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId, aktion }),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(json.error ?? "Aktion fehlgeschlagen.");
          return;
        }
        if (aktion === "hm_begutachten") {
          orgPortalToast.hmBegutachten();
          setHvStatusOptimistic("hm_pruefung");
          setActiveSection("hm_pruefung");
        } else if (
          aktion === "angebot_einfordern" ||
          aktion === "direkt_baerenwald"
        ) {
          orgPortalToast.angebotEingefordert();
        } else {
          orgPortalToast.meldungAbgelehnt();
        }
        await onUpdated();
        if (aktion !== "hm_begutachten") onBack?.();
      }, 480);
    } finally {
      setBusy(false);
      setBusyAktion(null);
    }
  };

  const acceptAngebotAct = async () => {
    const id = (angebotId ?? empfohlen?.id ?? "").trim();
    if (!id) {
      setError("Kein Angebot zum Annehmen hinterlegt.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await runBusy(async () => {
        const res = await acceptKundeAngebot(id);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setAccepted(true);
        kundePortalToast.angebotAngenommen();
        await onUpdated();
        onBack?.();
      }, 480);
    } finally {
      setBusy(false);
    }
  };

  const rejectAngebotAct = async () => {
    const id = (angebotId ?? empfohlen?.id ?? "").trim();
    if (!id) {
      setError("Kein Angebot zum Ablehnen hinterlegt.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await runBusy(async () => {
        const res = await rejectKundeAngebot(id);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setRejected(true);
        kundePortalToast.angebotAbgelehnt();
        await onUpdated();
        onBack?.();
      }, 480);
    } finally {
      setBusy(false);
    }
  };

  const resolvedAngebotId = (angebotId ?? empfohlen?.id ?? "").trim();
  /** Unter Schwelle / Akut: nur Info-Banner — kein Annehmen/Ablehnen (CRM macht Direkt Auftrag). */
  const showAcceptCta = Boolean(
    !accepted &&
      !rejected &&
      displayFlowStatus !== "abgelehnt" &&
      !freigabeNichtNoetig &&
      (canAcceptAngebot ||
        (actionKind === "angebot" && Boolean(resolvedAngebotId)))
  );

  const hmSelbstErledigt = hvStatusNorm === "hm_erledigt";

  const rolePanel = (() => {
    if (actionKind === "privat_auto") {
      // Privatkunde: kein Freigabe-/Auftraggeber-Hinweis
      return null;
    }
    if (actionKind === "freigabe") {
      // CTAs inline in Details (Übersicht).
      return null;
    }
    if (actionKind === "angebot") {
      // Nur Leistungen & Preise — kein „Empfohlenes Angebot“ (es gibt nur eins).
      // Annehmen/Ablehnen nur oberhalb der Schwelle (Sticky-Footer + ggf. hier).
      return (
        <DetailCard title={HV_DETAIL_COPY.empfohlenDetail}>
          {derivedPositionen.length ? (
            <PositionenTable positionen={derivedPositionen} sum={sum} />
          ) : sum.brutto > 0 ? (
            <p className="portal-text-meta mb-3" style={{ color: PORTAL_VAR.sub }}>
              Gesamt: {moneyEur(sum.brutto)}
            </p>
          ) : (
            <p className="portal-text-meta" style={{ color: PORTAL_VAR.faint }}>
              Noch kein Angebot hinterlegt.
            </p>
          )}
          {accepted ? (
            <p
              className="portal-text-meta mt-3 font-semibold"
              style={{ color: PORTAL_VAR.primary }}
            >
              Angebot angenommen — Auftrag wird vorbereitet.
            </p>
          ) : rejected || displayFlowStatus === "abgelehnt" ? (
            <p
              className="portal-text-meta mt-3 font-semibold"
              style={{ color: PORTAL_STATUS.abgelehnt.color }}
            >
              Angebot abgelehnt.
            </p>
          ) : null}
        </DetailCard>
      );
    }
    if (actionKind === "auftrag") {
      return null;
    }
    if (actionKind === "abschluss") {
      if (hmSelbstErledigt) return null;
      return mieterStatusMode ? null : abschlussCard;
    }
    if (actionKind === "rechnung") {
      return mieterStatusMode ? null : abschlussCard;
    }
    if (actionKind === "bezahlt") {
      return (
        <DetailCard title={HV_DETAIL_COPY.abgeschlossenTitle}>{null}</DetailCard>
      );
    }
    return null;
  })();

  const showBautagebuch =
    ["auftrag", "abschluss", "rechnung", "bezahlt"].includes(displayFlowStatus) ||
    bautagebuch.length > 0;

  const showAngebotSection = !mieterStatusMode && Boolean(rolePanel);
  const angebotSectionLabel =
    actionKind === "abschluss" ||
    actionKind === "rechnung" ||
    actionKind === "bezahlt"
      ? HV_DETAIL_COPY.abnahmeTitle
      : actionKind === "freigabe"
        ? "Freigabe"
        : "Angebot";

  useEffect(() => {
    if (!showBautagebuch) {
      setBtUnread(0);
      return;
    }
    const seen = getBautagebuchLastSeenAt(leadId);
    setBtUnread(countUnreadBautagebuch(bautagebuch, seen));
  }, [leadId, bautagebuch, showBautagebuch]);

  useEffect(() => {
    deepLinkAppliedRef.current = false;
  }, [leadId]);

  /** Notification / Deep-Link: `?tab=` oder `#…` → passenden Detail-Tab öffnen. */
  useEffect(() => {
    if (deepLinkAppliedRef.current) return;
    const fromQuery = normalizePortalDeepLinkTab(
      searchParams.get(PORTAL_DETAIL_TAB_QUERY)
    );
    const fromHash =
      typeof window !== "undefined"
        ? normalizePortalDeepLinkTab(window.location.hash)
        : null;
    const tab = fromQuery || fromHash;
    if (!tab) return;

    const target = portalDeepLinkTabForHvNav(tab);
    if (target === "bautagebuch" && !showBautagebuch) return;
    if (mieterStatusMode && target === "angebot") {
      setActiveSection("uebersicht");
      deepLinkAppliedRef.current = true;
      if (typeof window !== "undefined") {
        try {
          const u = new URL(window.location.href);
          u.searchParams.delete(PORTAL_DETAIL_TAB_QUERY);
          u.hash = "";
          window.history.replaceState(null, "", `${u.pathname}${u.search}`);
        } catch {
          /* ignore */
        }
      }
      return;
    }
    if (target === "angebot" && !showAngebotSection) {
      setActiveSection("uebersicht");
      deepLinkAppliedRef.current = true;
      if (typeof window !== "undefined") {
        try {
          const u = new URL(window.location.href);
          u.searchParams.delete(PORTAL_DETAIL_TAB_QUERY);
          u.hash = "";
          window.history.replaceState(null, "", `${u.pathname}${u.search}`);
        } catch {
          /* ignore */
        }
      }
      return;
    }

    setActiveSection(target);
    if (target === "bautagebuch") {
      markBautagebuchSeen(leadId);
      setBtUnread(0);
    }
    deepLinkAppliedRef.current = true;

    if (typeof window === "undefined") return;
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete(PORTAL_DETAIL_TAB_QUERY);
      u.hash = "";
      window.history.replaceState(null, "", `${u.pathname}${u.search}`);
    } catch {
      /* ignore */
    }
  }, [
    leadId,
    mieterStatusMode,
    showBautagebuch,
    showAngebotSection,
    searchParams,
  ]);

  function onBautagebuchViewed() {
    markBautagebuchSeen(leadId);
    setBtUnread(0);
  }

  const navItems = useMemo(
    () => [
      { id: "uebersicht" as const },
      {
        id: "angebot" as const,
        hidden: !showAngebotSection,
        label: angebotSectionLabel,
      },
      {
        id: "hm_pruefung" as const,
        hidden: !showHmTab,
      },
      {
        id: "bautagebuch" as const,
        hidden: !showBautagebuch,
        badge: btUnread > 0 ? btUnread : null,
      },
      {
        id: "versicherung" as const,
        hidden: !showVersicherungTab,
      },
      { id: "dokumente" as const },
    ],
    [
      showAngebotSection,
      showBautagebuch,
      showHmTab,
      showVersicherungTab,
      btUnread,
      angebotSectionLabel,
    ]
  );

  useEffect(() => {
    const visible = navItems.filter((i) => !i.hidden);
    if (!visible.some((i) => i.id === activeSection) && visible[0]) {
      setActiveSection(visible[0].id);
    }
  }, [navItems, activeSection]);

  function onSectionChange(id: string) {
    setActiveSection(id as PortalDetailSectionId);
    if (id === "bautagebuch") onBautagebuchViewed();
  }

  const hmErledigtBanner =
    hmSelbstErledigt && !mieterStatusMode ? (
      <PortalDetailInfoBox variant="warning">
        <p className="font-semibold text-amber-950">
          Vom Hausmeister erledigt
        </p>
        <p className="mt-1 text-[13px] text-amber-900/90">
          Die Vor-Ort-Prüfung ist abgeschlossen — Bärenwald muss hier nichts
          mehr tun. Dokumentierte Prüfpunkte finden Sie unter Tab „Checkliste“.
        </p>
        {showHmTab ? (
          <button
            type="button"
            className="portal-action-btn portal-action-btn--secondary mt-3"
            onClick={() => setActiveSection("hm_pruefung")}
          >
            Zur Checkliste
          </button>
        ) : null}
      </PortalDetailInfoBox>
    ) : null;

  const hmPruefungBanner =
    hvStatusNorm === "hm_pruefung" && !mieterStatusMode ? (
      <PortalDetailInfoBox variant="warning">
        <p className="font-semibold text-amber-950">
          {hausmeisterActor ? "Hausmeister-Prüfung" : "Hausmeister-Prüfung läuft"}
        </p>
        <p className="mt-1 text-[13px] text-amber-900/90">
          {hausmeisterActor
            ? "Unter Tab „Checkliste“ Punkte prüfen — danach selbst erledigen oder an Bärenwald weitergeben."
            : "Der Vorgang liegt beim Hausmeister. Ergebnis erscheint unter Tab „Checkliste“, sobald die Prüfung abgeschlossen ist."}
        </p>
        {hausmeisterActor ? (
          <button
            type="button"
            className="portal-action-btn portal-action-btn--primary mt-3"
            onClick={() => setActiveSection("hm_pruefung")}
          >
            Zur Checkliste
          </button>
        ) : showHmTab ? (
          <button
            type="button"
            className="portal-action-btn portal-action-btn--secondary mt-3"
            onClick={() => setActiveSection("hm_pruefung")}
          >
            Zum Tab Checkliste
          </button>
        ) : null}
      </PortalDetailInfoBox>
    ) : null;

  const actionFooter =
    hausmeisterActor &&
    hvStatusNorm === "hm_pruefung" &&
    hmStickyActions?.editable ? (
      <PortalDetailStickyActions
        primaryLabel="Prüfung abschließen"
        onPrimary={() => hmStickyActions.openAbschluss()}
        secondaryLabel="Ablehnen"
        onSecondary={() => hmStickyActions.ablehnenAnHv()}
      />
    ) : actionKind === "angebot" && showAcceptCta ? (
      <PortalDetailStickyActions
        primaryLabel={HV_DETAIL_COPY.empfohlenAnnehmen}
        onPrimary={() => void acceptAngebotAct()}
        primaryDisabled={busy}
        primaryLoading={busy}
        secondaryLabel={HV_DETAIL_COPY.ablehnen}
        onSecondary={() => void rejectAngebotAct()}
        secondaryDisabled={busy}
      />
    ) : showFreigabeButtons ? (
      <div className="portal-action-row flex-wrap">
        <ActionBtn
          label={HV_DETAIL_COPY.ablehnen}
          kind="secondary"
          disabled={busy}
          loading={busyAktion === "ablehnen"}
          onClick={() => void meldungAct("ablehnen")}
        />
        {hasHmKontakt ? (
          <ActionBtn
            label="Hausmeister"
            kind="secondary"
            disabled={busy}
            loading={busyAktion === "hm_begutachten"}
            onClick={() => void meldungAct("hm_begutachten")}
          />
        ) : null}
        <ActionBtn
          label="Direkt Bärenwald"
          mobileLabel="Bärenwald"
          disabled={busy}
          loading={busyAktion === "direkt_baerenwald"}
          onClick={() => void meldungAct("direkt_baerenwald")}
        />
      </div>
    ) : undefined;

  return (
    <PortalDetailLayout footer={actionFooter}>
      <div className="flex flex-col">
      <PortalDetailCover
        coverUrl={coverUrl}
        onBack={onBack}
        backLabel={onBack ? "← Vorgänge" : undefined}
        className={cn(
          "portal-detail-cover--bleed",
          !onBack && "h-[150px] sm:h-[150px]"
        )}
        statusLabel={statusLabel}
        statusColor={PORTAL_STATUS[displayFlowStatus].color}
        title={titel}
      />

      <div className="portal-detail-kopfkarte">
        <PortalDetailHead
          title={titel}
          hideTitle
          metaLine={objekt?.trim() || undefined}
          timeline={
            <PortalFlowTimeline flowStatus={displayFlowStatus} />
          }
        />

        {freigabeEntfaelltKind ? (
          <div className="mt-3">
            <HvFreigabeInfoBanner
              kind={freigabeEntfaelltKind}
              schwelleLabel={
                freigabeEntfaelltKind === "schwelle"
                  ? moneyEur(schwelleEur)
                  : null
              }
            />
          </div>
        ) : null}

        {hmErledigtBanner ?? hmPruefungBanner ? (
          <div className="mt-3">{hmErledigtBanner ?? hmPruefungBanner}</div>
        ) : null}

      </div>

      <div className="flex flex-col gap-4 px-1 pb-6 pt-4 sm:px-0 sm:pt-5">
        <VorgangDetailSectionNav
          items={navItems}
          mode="tabs"
          activeId={activeSection}
          onActiveChange={onSectionChange}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-3.5 lg:gap-5">
          {activeSection === "uebersicht" ? (
            <section
              id="vorgang-panel-uebersicht"
              role="tabpanel"
              className="space-y-3.5"
            >
              {!mieterStatusMode &&
              (actionKind === "abschluss" ||
                actionKind === "rechnung" ||
                actionKind === "bezahlt") &&
              !showAngebotSection
                ? abschlussCard
                : null}
              <VorgangDetailBlocks vm={uebersichtVm} />
              {showKostentraegerEdit ? (
                <DetailCard title="Kostenträger">
                  <KostentraegerSelector
                    leadId={leadId}
                    value={kostentraeger}
                    vorgeschlagen={kostentraegerVorgeschlagen}
                    versicherungsNr={versicherungsNr ?? objektPolicenNr}
                    onSaved={onUpdated}
                  />
                </DetailCard>
              ) : null}
            </section>
          ) : null}

          {activeSection === "versicherung" && showVersicherungTab ? (
            <section
              id="vorgang-panel-versicherung"
              role="tabpanel"
              className="space-y-3.5"
            >
              {versicherungBlock}
            </section>
          ) : null}

          {activeSection === "angebot" && showAngebotSection ? (
            <div
              id="vorgang-panel-angebot"
              className="space-y-3.5"
              role="tabpanel"
            >
              {rolePanel}
              {error ? (
                <p className="portal-text-meta font-semibold text-red-700" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          ) : null}

          {activeSection === "hm_pruefung" && showHmTab ? (
            <DetailCard id="vorgang-panel-hm" title="Checkliste">
              <OrgHmBefundPanel
                leadId={leadId}
                hvMeldungStatus={hvStatusOptimistic ?? hvMeldungStatus}
                viewerRole={hausmeisterActor ? "hm" : "hv"}
                readOnly={
                  hausmeisterActor
                    ? hvStatusNorm !== "hm_pruefung"
                    : true
                }
                onBefundPresence={setHasBefund}
                onUpdated={onUpdated}
                onCompleted={
                  hausmeisterActor
                    ? () => {
                        onBack?.();
                        onUpdated();
                      }
                    : undefined
                }
                onActionsReady={
                  hausmeisterActor ? setHmStickyActions : undefined
                }
                hideInlineActions
              />
            </DetailCard>
          ) : null}

          {activeSection !== "angebot" && error ? (
            <p className="portal-text-meta font-semibold text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          {activeSection === "bautagebuch" && showBautagebuch ? (
            <DetailCard id="vorgang-panel-bautagebuch" title={HV_DETAIL_COPY.bautagebuchTitle}>
              <div onFocus={onBautagebuchViewed} onClick={onBautagebuchViewed}>
                {bautagebuch.length ? (
                  <BautagebuchAccordionList
                    heading=""
                    className="!border-t-0 !pt-0"
                    eintraege={bautagebuch.map((e, i) => ({
                      id: e.id ?? `tb-${i}`,
                      datum: e.datum ?? e.created_at,
                      titel: e.titel ?? "Eintrag",
                      beschreibung: e.notiz,
                      fotos: e.fotos_urls,
                    }))}
                  />
                ) : (
                  <p className="portal-text-meta" style={{ color: PORTAL_VAR.faint }}>
                    {HV_DETAIL_COPY.bautagebuchEmpty}
                  </p>
                )}
              </div>
            </DetailCard>
          ) : null}

          {activeSection === "dokumente" ? (
            <DetailCard id="vorgang-panel-dokumente" title={HV_DETAIL_COPY.dokumenteTitle}>
              {abnahmeProtokolle.length > 0 ? (
                <div className="mb-4 space-y-2">
                  {abnahmeProtokolle.map((doc) => (
                    <PortalDocOpenButton
                      key={`dok-abnahme-${doc.id}`}
                      href={doc.href!}
                      name={doc.name}
                      kind="pdf"
                      className="block w-full overflow-hidden rounded-xl border border-[var(--portal-primary,#2E7D52)]/30 bg-[var(--portal-primary,#2E7D52)]/5 text-left"
                    >
                      <p
                        className="px-3 py-4 text-center text-[13px] font-semibold"
                        style={{ color: PORTAL_VAR.primary }}
                      >
                        {doc.name} — PDF öffnen
                      </p>
                    </PortalDocOpenButton>
                  ))}
                </div>
              ) : null}
              <DokumenteTabelle
                heading=""
                className="!border-0 !pt-0"
                emptyText={
                  abnahmeProtokolle.length > 0
                    ? "Keine weiteren Dokumente."
                    : HV_DETAIL_COPY.dokumenteEmpty
                }
                dokumente={dokumenteOhneAbnahme.map((d) => ({
                  id: d.id,
                  name: d.name,
                  datum: d.datum,
                  href: d.href,
                }))}
              />
            </DetailCard>
          ) : null}

        </div>
      </div>
      </div>
    </PortalDetailLayout>
  );
}
