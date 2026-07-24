"use client";

import { useEffect, useMemo, useState } from "react";

import { VorgangDetailBlocks } from "@/components/shared/vorgang-detail";
import { buildKundeHvVorgangDetailVm } from "@/lib/vorgang/build-vorgang-detail-vm";
import { BautagebuchAccordionList } from "@/components/shared/BautagebuchAccordionList";
import { DokumenteTabelle } from "@/components/shared/DokumenteTabelle";
import { PortalFlowStatusChip } from "@/components/shared/PortalFlowStatusChip";
import { VorgangDetailSectionNav } from "@/components/shared/VorgangDetailSectionNav";
import { acceptKundeAngebot } from "@/app/actions/portal-angebot";
import {
  countUnreadBautagebuch,
  getBautagebuchLastSeenAt,
  markBautagebuchSeen,
} from "@/lib/portal2/bautagebuch-attention";
import {
  HV_DEFAULT_SCHWELLE_EUR,
  HV_DETAIL_COPY,
  angebotSummeFromBruttoTotal,
  angebotSummeFromPositionen,
  buildAbschlagsplan,
  formatHvVerlaufLine,
  hvRoleActionKind,
  moneyEur,
  pickEmpfohlenesAngebot,
  type HvDetailPosition,
  type HvOfferCard,
  type HvVerlaufEntry,
} from "@/lib/portal2/hv-detail";
import {
  portalDetailSectionBorderStyle,
  portalDetailSectionClass,
} from "@/lib/portal2/layout-chrome";
import { portalFlowTimeline, portalMieterFlowTimeline } from "@/lib/portal2/status-mapping";
import { PORTAL_STATUS, type PortalMockStatusId } from "@/lib/portal2/status";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { kundePortalToast, orgPortalToast } from "@/lib/shared/portal-toast";
import { track } from "@/lib/analytics";
import type { PortalBautagebuchEntry } from "@/lib/portal/portal-detail-item";
import type { PortalAngebotPositionDisplay } from "@/lib/portal/portal-angebot-display";
import type { PortalDokument } from "@/lib/portal/portal-dokumente";
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
  gesamtBrutto?: number;
  rechnungPdfHref?: string | null;
  bautagebuch?: PortalBautagebuchEntry[];
  /** CRM-/Portal-Unterlagen (bereits rollen-gefiltert). */
  dokumente?: PortalDokument[];
  verlauf?: HvVerlaufEntry[];
  coverUrl?: string | null;
  onBack?: () => void;
  onUpdated: () => void;
  /** org_freigabe_status für Angebots-Freigabe */
  orgFreigabeStatus?: string | null;
  hvMeldungStatus?: string | null;
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
  meldeFotos?: string[];
  meldeStrasse?: string | null;
  meldePlz?: string | null;
  meldeOrt?: string | null;
  meldeSituation?: string | null;
  meldeBereich?: string | null;
  meldeZeitraum?: string | null;
  meldeFachdetails?: Array<{ label: string; value: string }>;
  detailRole?: "hv" | "kunde";
  /**
   * Optionaler Status-Chip-/VM-Text (z. B. Mieter: „In Bearbeitung“
   * statt „Angebot angefragt“).
   */
  statusLabelOverride?: string | null;
  /** Mieter: Timeline ohne Angebot, „Auftrag“ → „Bestätigung“. */
  mieterStatusMode?: boolean;
  /** C4 — Meta-Zeile „Wartet auf HW · …“ */
  wartetAufHwLabel?: string | null;
  /**
   * D2 (leicht): `detailRole` + `mieterStatusMode` steuern Copy/Sections.
   * Kein BW-Freigabe-/Angebot-Wording bei Mieter (`mieterStatusMode`).
   */
};

/** C1: Border-Card mobil, flach ab lg. */
function DetailCard({
  title,
  children,
  id,
  badge,
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
  badge?: number | null;
}) {
  return (
    <section
      id={id}
      className={cn(
        portalDetailSectionClass("responsive"),
        id && "scroll-mt-16 lg:scroll-mt-4"
      )}
      style={portalDetailSectionBorderStyle("responsive")}
    >
      <div className="mb-3 flex items-center gap-2">
        <h3
          className="text-[14px] font-bold"
          style={{
            color: PORTAL_VAR.ink,
            fontFamily: "var(--p2-font-head, " + PORTAL_VAR.head + ")",
          }}
        >
          {title}
        </h3>
        {badge && badge > 0 ? (
          <span
            className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
            style={{ background: PORTAL_VAR.dangerSoft, color: PORTAL_VAR.danger }}
          >
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function ActionBtn({
  label,
  mobileLabel,
  onClick,
  kind = "primary",
  disabled,
  className,
}: {
  label: string;
  /** Optional kürzerer Text nur auf Mobil (&lt; sm). */
  mobileLabel?: string;
  onClick: () => void;
  kind?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  className?: string;
}) {
  const style =
    kind === "ghost"
      ? {
          border: `1px solid ${PORTAL_VAR.line}`,
          background: "#fff",
          color: PORTAL_VAR.sub,
        }
      : kind === "danger"
        ? { border: "none", background: PORTAL_VAR.dangerSoft, color: PORTAL_VAR.danger }
        : {
            border: "none",
            background: PORTAL_VAR.primary,
            color: "#fff",
          };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-[9px] px-[18px] py-[11px] text-[13.5px] font-semibold disabled:opacity-60",
        className
      )}
      style={style}
    >
      {mobileLabel ? (
        <>
          <span className="sm:hidden">{mobileLabel}</span>
          <span className="hidden sm:inline">{label}</span>
        </>
      ) : (
        label
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
          className="flex justify-between px-3 py-2.5 text-[12.5px]"
          style={{ borderBottom: `1px solid ${PORTAL_VAR.line2}` }}
        >
          <div>
            <div className="font-medium" style={{ color: PORTAL_VAR.ink }}>
              {p.pos}
            </div>
            <div className="text-[11px]" style={{ color: PORTAL_VAR.faint }}>
              {p.menge} · {p.gewerk}
            </div>
          </div>
          <span className="font-semibold" style={{ color: PORTAL_VAR.ink }}>
            {moneyEur(p.einzel)}
          </span>
        </div>
      ))}
      <div className="flex flex-col gap-1 bg-[#f7f8fa] px-3 py-2.5">
        <div
          className="flex justify-between text-xs"
          style={{ color: PORTAL_VAR.sub }}
        >
          <span>Netto</span>
          <span>{moneyEur(sum.net)}</span>
        </div>
        <div
          className="flex justify-between text-xs"
          style={{ color: PORTAL_VAR.sub }}
        >
          <span>MwSt. 19%</span>
          <span>{moneyEur(sum.mwst)}</span>
        </div>
        <div
          className="mt-0.5 flex justify-between text-[15px] font-bold"
          style={{
            color: PORTAL_VAR.ink,
            fontFamily: "var(--p2-font-head, " + PORTAL_VAR.head + ")",
          }}
        >
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
  auftragId: _auftragId,
  hvAbnahme: _hvAbnahme,
  hwErledigt: _hwErledigt,
  schwelleEur = HV_DEFAULT_SCHWELLE_EUR,
  offers = [],
  positionen = [],
  positionenBrutto = [],
  gesamtBrutto,
  rechnungPdfHref,
  bautagebuch = [],
  dokumente = [],
  verlauf = [],
  coverUrl,
  onBack,
  onUpdated,
  orgFreigabeStatus,
  hvMeldungStatus,
  angebotId,
  canAcceptAngebot = false,
  melderEinheit,
  melderTelefon,
  melderEmail,
  kostentraeger,
  kostentraegerVorgeschlagen,
  versicherungsNr,
  meldeFotos,
  meldeStrasse,
  meldePlz,
  meldeOrt,
  meldeSituation,
  meldeBereich,
  meldeZeitraum,
  meldeFachdetails,
  detailRole = "hv",
  statusLabelOverride,
  mieterStatusMode = false,
  wartetAufHwLabel = null,
}: OrganisationHvVorgangDetailProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [btUnread, setBtUnread] = useState(0);

  const angebotVorgelegt = Boolean(
    !mieterStatusMode &&
      (offers?.length ||
        positionenBrutto?.length ||
        (typeof gesamtBrutto === "number" && gesamtBrutto > 0) ||
        canAcceptAngebot)
  );
  const displayFlowStatus: PortalMockStatusId =
    angebotVorgelegt &&
    (flowStatus === "angefragt" || flowStatus === "freigegeben")
      ? "angebot"
      : flowStatus;
  const timeline = mieterStatusMode
    ? portalMieterFlowTimeline(displayFlowStatus)
    : portalFlowTimeline(displayFlowStatus);
  const actionKind = hvRoleActionKind(displayFlowStatus, {
    privatkunde,
    angebotVorgelegt,
  });
  const empfohlen = pickEmpfohlenesAngebot(offers);
  const statusLabel =
    statusLabelOverride?.trim() || PORTAL_STATUS[displayFlowStatus].label;

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
        melderName: melder,
        einheit: melderEinheit,
        fotos:
          detailRole === "kunde" || privatkunde ? [] : meldeFotos,
        meldeStrasse,
        meldePlz,
        meldeOrt,
        meldeSituation,
        meldeBereich,
        meldeZeitraum,
        meldeFachdetails,
        angebotPositionen: positionenBrutto,
        gesamtBrutto:
          typeof gesamtBrutto === "number"
            ? gesamtBrutto
            : empfohlen?.betrag ?? null,
        handwerkerName,
        rechnungsempfaengerHint: null,
        lead: {
          melder_name: melder,
          melder_einheit: melderEinheit,
          melder_telefon: melderTelefon,
          melder_email: melderEmail,
          strasse: meldeStrasse,
          plz: meldePlz,
          ort: meldeOrt,
          kostentraeger,
          kostentraeger_vorgeschlagen: kostentraegerVorgeschlagen,
          versicherungs_nr: versicherungsNr,
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
      positionenBrutto,
      gesamtBrutto,
      empfohlen?.betrag,
      handwerkerName,
      melderTelefon,
      melderEmail,
      kostentraeger,
      kostentraegerVorgeschlagen,
      versicherungsNr,
      orgFreigabeStatus,
      hvMeldungStatus,
    ]
  );

  const derivedPositionen: HvDetailPosition[] = useMemo(() => {
    if (positionen.length) return positionen;
    return positionenBrutto.map((p) => ({
      pos: p.title,
      menge: "1",
      gewerk: p.beschreibung?.slice(0, 40) || "Leistung",
      einzel: p.preisBrutto / 1.19,
    }));
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

  const gewerke = Array.from(
    new Set(derivedPositionen.map((p) => p.gewerk).filter(Boolean))
  ).join(", ");
  const abschlaege = buildAbschlagsplan(sum.brutto, gewerke);
  const unterSchwelle = sum.brutto > 0 && sum.brutto <= schwelleEur;

  const meldungAct = async (
    aktion: "angebot_einfordern" | "ablehnen"
  ) => {
    setBusy(true);
    setError(null);
    try {
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
      if (aktion === "angebot_einfordern") orgPortalToast.angebotEingefordert();
      else orgPortalToast.meldungAbgelehnt();
      onUpdated();
    } finally {
      setBusy(false);
    }
  };

  const freigabeAct = async (aktion: "freigegeben" | "abgelehnt") => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/org/freigabe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, aktion }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Aktion fehlgeschlagen.");
        return;
      }
      track.orgFreigabe(aktion);
      if (aktion === "freigegeben") orgPortalToast.freigegeben();
      else orgPortalToast.freigabeAbgelehnt();
      onUpdated();
    } finally {
      setBusy(false);
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
      const res = await acceptKundeAngebot(id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setAccepted(true);
      kundePortalToast.angebotAngenommen();
      onUpdated();
    } finally {
      setBusy(false);
    }
  };

  const showAcceptCta = Boolean(canAcceptAngebot && !accepted);

  const rolePanel = (() => {
    if (actionKind === "privat_auto") {
      // Privatkunde: kein Freigabe-/Auftraggeber-Hinweis
      return null;
    }
    if (actionKind === "freigabe") {
      // CTAs unter dem Kopf (mobil gestapelt) — keine Card hier.
      return null;
    }
    if (actionKind === "angebot") {
      return (
        <div className="flex flex-col gap-3.5">
          <DetailCard title={HV_DETAIL_COPY.angeboteVergleichen}>
            <p className="mb-3 text-[12.5px]" style={{ color: PORTAL_VAR.sub }}>
              {HV_DETAIL_COPY.angeboteVergleichNote}
            </p>
            {empfohlen ? (
              <div
                className="relative rounded-xl p-3.5"
                style={{
                  border: `1.5px solid ${PORTAL_VAR.primary}`,
                  background: "#fff",
                }}
              >
                <span
                  className="absolute -top-2 left-3 rounded-full px-2 py-0.5 text-[10.5px] font-bold text-white"
                  style={{ background: PORTAL_VAR.primary }}
                >
                  {HV_DETAIL_COPY.empfohlenBadge}
                </span>
                <p
                  className="mt-1 text-[13.5px] font-bold"
                  style={{
                    color: PORTAL_VAR.ink,
                    fontFamily: "var(--p2-font-head, " + PORTAL_VAR.head + ")",
                  }}
                >
                  {empfohlen.name}
                </p>
                <p className="text-[11.5px]" style={{ color: PORTAL_VAR.faint }}>
                  {empfohlen.trade}
                  {empfohlen.dauer ? ` · ${empfohlen.dauer}` : ""}
                </p>
                <p
                  className="mt-2 text-xl font-extrabold"
                  style={{
                    color: PORTAL_VAR.ink,
                    fontFamily: "var(--p2-font-head, " + PORTAL_VAR.head + ")",
                  }}
                >
                  {moneyEur(empfohlen.betrag || sum.brutto)}
                </p>
              </div>
            ) : sum.brutto > 0 ? (
              <p
                className="text-xl font-extrabold"
                style={{
                  color: PORTAL_VAR.ink,
                  fontFamily: "var(--p2-font-head, " + PORTAL_VAR.head + ")",
                }}
              >
                {moneyEur(sum.brutto)}
              </p>
            ) : (
              <p className="text-[12.5px]" style={{ color: PORTAL_VAR.faint }}>
                Noch kein Angebot hinterlegt.
              </p>
            )}
          </DetailCard>

          <DetailCard title={HV_DETAIL_COPY.empfohlenDetail}>
            {derivedPositionen.length ? (
              <PositionenTable positionen={derivedPositionen} sum={sum} />
            ) : (
              <p className="mb-3 text-[13px]" style={{ color: PORTAL_VAR.sub }}>
                Gesamt: {moneyEur(sum.brutto)}
              </p>
            )}
            {unterSchwelle ? (
              <div
                className="mt-3 rounded-lg px-3 py-2.5 text-[12.5px] font-semibold"
                style={{ background: "#DDEEDF", color: "#1F6A3F" }}
              >
                {HV_DETAIL_COPY.unterSchwelle(moneyEur(schwelleEur))}
              </div>
            ) : null}
            {showAcceptCta ? (
              <div className="mt-3 space-y-2">
                <p className="text-[12px]" style={{ color: PORTAL_VAR.sub }}>
                  {HV_DETAIL_COPY.angebotAnnehmenNote}
                </p>
                <div className="flex flex-wrap gap-2">
                  <ActionBtn
                    label={HV_DETAIL_COPY.empfohlenAnnehmen}
                    disabled={busy}
                    onClick={() => void acceptAngebotAct()}
                  />
                </div>
              </div>
            ) : accepted ? (
              <p
                className="mt-3 text-[12.5px] font-semibold"
                style={{ color: PORTAL_VAR.primary }}
              >
                Angebot angenommen — Auftrag wird vorbereitet.
              </p>
            ) : orgFreigabeStatus === "ausstehend" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <ActionBtn
                  label="Freigabe erteilen"
                  disabled={busy}
                  onClick={() => void freigabeAct("freigegeben")}
                />
                <ActionBtn
                  label={HV_DETAIL_COPY.ablehnen}
                  kind="danger"
                  disabled={busy}
                  onClick={() => void freigabeAct("abgelehnt")}
                />
              </div>
            ) : null}
          </DetailCard>
        </div>
      );
    }
    if (actionKind === "auftrag") {
      return null;
    }
    if (actionKind === "abschluss") {
      return (
        <DetailCard title={HV_DETAIL_COPY.abnahmeTitle}>
          <p className="text-[13px] leading-relaxed" style={{ color: PORTAL_VAR.sub }}>
            {HV_DETAIL_COPY.abnahmeNote}
          </p>
        </DetailCard>
      );
    }
    if (actionKind === "rechnung") {
      return (
        <div className="flex flex-col gap-3.5">
          <DetailCard title={HV_DETAIL_COPY.rechnungTitle}>
            <p className="mb-3 text-[13px]" style={{ color: PORTAL_VAR.sub }}>
              {HV_DETAIL_COPY.rechnungNote}
            </p>
            <div
              className="mb-3 flex justify-between text-lg font-bold"
              style={{
                color: PORTAL_VAR.ink,
                fontFamily: "var(--p2-font-head, " + PORTAL_VAR.head + ")",
              }}
            >
              <span>{HV_DETAIL_COPY.rechnungsbetrag}</span>
              <span>{moneyEur(sum.brutto)}</span>
            </div>
            <p
              className="mb-3 rounded-lg px-3 py-2 text-[12px] font-semibold"
              style={{ background: "#FBF1D6", color: "#8A5A06" }}
            >
              {HV_DETAIL_COPY.ueberweisungOffen}
            </p>
            <div className="flex flex-wrap gap-2">
              {rechnungPdfHref ? (
                <a
                  href={rechnungPdfHref}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[9px] border px-[18px] py-[11px] text-[13.5px] font-semibold"
                  style={{ borderColor: PORTAL_VAR.line, color: PORTAL_VAR.sub }}
                >
                  {HV_DETAIL_COPY.paketOeffnen}
                </a>
              ) : (
                <span
                  className="rounded-[9px] border px-[18px] py-[11px] text-[13.5px] font-semibold opacity-50"
                  style={{ borderColor: PORTAL_VAR.line, color: PORTAL_VAR.sub }}
                >
                  {HV_DETAIL_COPY.paketOeffnen}
                </span>
              )}
            </div>
          </DetailCard>
          <DetailCard title={HV_DETAIL_COPY.abschlagsplanTitle}>
            <p className="mb-2 text-[12.5px]" style={{ color: PORTAL_VAR.sub }}>
              {HV_DETAIL_COPY.abschlagsplanNote}
            </p>
            <div className="flex flex-col gap-2">
              {abschlaege.map((r) => (
                <div
                  key={r.title}
                  className="flex items-center gap-2.5 rounded-[9px] px-3 py-2.5"
                  style={{ border: `1px solid ${PORTAL_VAR.line}` }}
                >
                  <div className="flex-1">
                    <p className="text-[13.5px] font-semibold" style={{ color: PORTAL_VAR.ink }}>
                      {r.title}
                    </p>
                    <p className="text-[11.5px]" style={{ color: PORTAL_VAR.faint }}>
                      {r.sub}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13.5px] font-bold" style={{ color: PORTAL_VAR.ink }}>
                      {moneyEur(r.amount)}
                    </p>
                    <span
                      className="text-[10.5px] font-semibold"
                      style={{
                        color: r.status === "bezahlt" ? "#1F6A3F" : "#8A5A06",
                      }}
                    >
                      {r.status === "bezahlt" ? "✓ bezahlt" : "offen"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </DetailCard>
        </div>
      );
    }
    if (actionKind === "bezahlt") {
      return (
        <DetailCard title={HV_DETAIL_COPY.abgeschlossenTitle}>
          <p className="text-[13px]" style={{ color: PORTAL_VAR.sub }}>
            {HV_DETAIL_COPY.abgeschlossenNote}
          </p>
        </DetailCard>
      );
    }
    return null;
  })();

  const showBautagebuch =
    !mieterStatusMode &&
    (["auftrag", "abschluss", "rechnung", "bezahlt"].includes(
      displayFlowStatus
    ) ||
      bautagebuch.length > 0);

  const showAngebotSection = !mieterStatusMode && Boolean(rolePanel);

  const showVerlauf = !privatkunde && detailRole !== "kunde";

  useEffect(() => {
    if (mieterStatusMode || !showBautagebuch) {
      setBtUnread(0);
      return;
    }
    const seen = getBautagebuchLastSeenAt(leadId);
    setBtUnread(countUnreadBautagebuch(bautagebuch, seen));
  }, [leadId, bautagebuch, mieterStatusMode, showBautagebuch]);

  useEffect(() => {
    if (mieterStatusMode || !showBautagebuch) return;
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (hash === "bautagebuch") {
      markBautagebuchSeen(leadId);
      setBtUnread(0);
    }
  }, [leadId, mieterStatusMode, showBautagebuch]);

  function onBautagebuchViewed() {
    markBautagebuchSeen(leadId);
    setBtUnread(0);
  }

  const navItems = useMemo(
    () => [
      { id: "uebersicht" as const },
      { id: "angebot" as const, hidden: !showAngebotSection },
      {
        id: "bautagebuch" as const,
        hidden: !showBautagebuch,
        badge: btUnread > 0 ? btUnread : null,
      },
      { id: "dokumente" as const },
      { id: "verlauf" as const, hidden: !showVerlauf },
    ],
    [showAngebotSection, showBautagebuch, showVerlauf, btUnread]
  );

  return (
    <div className="flex flex-col">
      <div className="relative w-full shrink-0 overflow-hidden" style={{ height: 150 }}>
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, #1A3D2B 0%, #2E7D52 60%, #0f766e 100%)",
            }}
          />
        )}
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="absolute left-3.5 top-3 z-10 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-semibold text-white shadow-md"
            style={{ background: "rgba(0,0,0,.55)" }}
          >
            ← Zurück zur Liste
          </button>
        ) : null}
      </div>

      <div
        className="bg-white px-4 py-4 sm:px-6"
        style={{ borderBottom: `1px solid ${PORTAL_VAR.line2}` }}
      >
        <div className="flex items-start gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              {idLabel.trim() ? (
                <span className="text-xs font-semibold" style={{ color: PORTAL_VAR.faint }}>
                  {idLabel}
                </span>
              ) : null}
              {notfall ? (
                <span className="rounded px-1.5 py-0.5 text-[11px] font-bold portal-danger-soft">
                  NOTFALL
                </span>
              ) : null}
            </div>
            <h1
              className="text-[20px] font-bold sm:text-[23px]"
              style={{
                color: PORTAL_VAR.ink,
                fontFamily: "var(--p2-font-head, " + PORTAL_VAR.head + ")",
              }}
            >
              {titel}
            </h1>
            <p className="mt-1 text-[13px]" style={{ color: PORTAL_VAR.sub }}>
              {objekt}
              {kategorie ? ` · ${kategorie}` : ""}
            </p>
            {wartetAufHwLabel ? (
              <p
                className="mt-1.5 text-[12px] font-semibold"
                style={{ color: "#8A5A06" }}
              >
                {wartetAufHwLabel}
              </p>
            ) : null}
          </div>
          <PortalFlowStatusChip
            statusId={displayFlowStatus}
            label={statusLabel}
          />
        </div>

        {actionKind === "freigabe" ||
        (actionKind === "angebot" && showAcceptCta) ? (
          <div
            className={cn(
              "mt-4 flex flex-col gap-2 sm:flex-row sm:items-stretch",
              "rounded-[12px] p-3 sm:p-0 sm:bg-transparent",
              "bg-[#F6F7F6] sm:shadow-none"
            )}
          >
            {actionKind === "freigabe" ? (
              <>
                <div className="mb-1 w-full sm:hidden">
                  <p className="text-[12px] font-semibold" style={{ color: PORTAL_VAR.ink }}>
                    {HV_DETAIL_COPY.freigabeTitle}
                  </p>
                  <p className="text-[11.5px]" style={{ color: PORTAL_VAR.sub }}>
                    {HV_DETAIL_COPY.freigabeNote}
                  </p>
                </div>
                <ActionBtn
                  className="w-full sm:flex-1"
                  label={HV_DETAIL_COPY.freigabeBtn}
                  mobileLabel={HV_DETAIL_COPY.freigabeBtnMobile}
                  disabled={busy}
                  onClick={() => void meldungAct("angebot_einfordern")}
                />
                <ActionBtn
                  className="w-full sm:w-auto sm:min-w-[7.5rem]"
                  label={HV_DETAIL_COPY.ablehnen}
                  kind="ghost"
                  disabled={busy}
                  onClick={() => void meldungAct("ablehnen")}
                />
              </>
            ) : (
              <>
                <div className="mb-1 w-full sm:hidden">
                  <p className="text-[12px] font-semibold" style={{ color: PORTAL_VAR.ink }}>
                    {HV_DETAIL_COPY.angebotAnnehmenTitle}
                  </p>
                  <p className="text-[11.5px]" style={{ color: PORTAL_VAR.sub }}>
                    {HV_DETAIL_COPY.angebotAnnehmenNote}
                  </p>
                </div>
                <ActionBtn
                  className="w-full sm:w-auto"
                  label={HV_DETAIL_COPY.empfohlenAnnehmen}
                  disabled={busy}
                  onClick={() => void acceptAngebotAct()}
                />
              </>
            )}
          </div>
        ) : null}
      </div>

      <div
        className="flex gap-0 overflow-x-auto bg-white px-4 py-3 sm:px-6"
        style={{ borderBottom: `1px solid ${PORTAL_VAR.line2}` }}
      >
        {timeline.map((step, i) => {
          const done = step.done;
          const act = step.active;
          return (
            <div key={step.id} className="flex shrink-0 items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className="grid h-[22px] w-[22px] place-items-center rounded-full text-[11px] font-bold"
                  style={{
                    background: done
                      ? PORTAL_VAR.primary
                      : act
                        ? "#fff"
                        : "#f1f3f5",
                    color: done
                      ? "#fff"
                      : act
                        ? PORTAL_VAR.primary
                        : PORTAL_VAR.faint,
                    border:
                      "2px solid " +
                      (done || act
                        ? PORTAL_VAR.primary
                        : "#e3e6ea"),
                  }}
                >
                  {done ? "✓" : i + 1}
                </div>
                <p
                  className="max-w-[72px] text-center text-[9.5px] font-semibold leading-tight"
                  style={{
                    color: act ? PORTAL_VAR.ink : PORTAL_VAR.faint,
                    whiteSpace: "nowrap",
                  }}
                >
                  {step.label}
                </p>
              </div>
              {i < timeline.length - 1 ? (
                <div
                  className="mx-1 mb-4 h-px w-4 shrink-0 sm:w-6"
                  style={{ background: "#e3e6ea" }}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-4 px-4 pb-6 pt-3 sm:px-6 sm:pt-4 lg:flex-row lg:items-start lg:gap-6 lg:pt-5">
        <div className="lg:sticky lg:top-3 lg:w-[11rem] lg:shrink-0">
          <VorgangDetailSectionNav items={navItems} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3.5 lg:gap-5">
          <section id="uebersicht" className="scroll-mt-16 lg:scroll-mt-4">
            <VorgangDetailBlocks vm={detailVm} />
          </section>

          {showAngebotSection ? (
            <div id="angebot" className="scroll-mt-16 space-y-3.5 lg:scroll-mt-4">
              {rolePanel}
              {error ? (
                <p className="text-sm font-semibold text-red-700" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          ) : error ? (
            <p className="text-sm font-semibold text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          {showBautagebuch ? (
            <DetailCard
              id="bautagebuch"
              title={HV_DETAIL_COPY.bautagebuchTitle}
              badge={btUnread > 0 ? btUnread : null}
            >
              <div
                className="scroll-mt-16 lg:scroll-mt-4"
                onFocus={onBautagebuchViewed}
                onClick={onBautagebuchViewed}
              >
                {bautagebuch.length ? (
                  <BautagebuchAccordionList
                    heading=""
                    eintraege={bautagebuch.map((e, i) => ({
                      id: e.id ?? `tb-${i}`,
                      datum: e.datum ?? e.created_at,
                      titel: e.titel ?? "Eintrag",
                      beschreibung: e.notiz,
                      fotos: e.fotos_urls,
                    }))}
                  />
                ) : (
                  <p className="text-[12.5px]" style={{ color: PORTAL_VAR.faint }}>
                    {HV_DETAIL_COPY.bautagebuchEmpty}
                  </p>
                )}
              </div>
            </DetailCard>
          ) : null}

          <DetailCard id="dokumente" title={HV_DETAIL_COPY.dokumenteTitle}>
            <DokumenteTabelle
              heading=""
              className="!border-0 !pt-0"
              emptyText={HV_DETAIL_COPY.dokumenteEmpty}
              dokumente={dokumente.map((d) => ({
                id: d.id,
                name: d.name,
                datum: d.datum,
                href: d.href,
              }))}
            />
          </DetailCard>

          {showVerlauf ? (
            <DetailCard id="verlauf" title={HV_DETAIL_COPY.verlaufTitle}>
              {verlauf.length === 0 ? (
                <p className="text-[12.5px]" style={{ color: PORTAL_VAR.faint }}>
                  Noch keine Einträge.
                </p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {verlauf.map((e, i) => (
                    <div key={i} className="flex gap-2.5">
                      <div
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{
                          background: i === 0 ? PORTAL_VAR.primary : "#cfd4da",
                        }}
                      />
                      <div>
                        <p className="text-[12.5px]" style={{ color: PORTAL_VAR.ink }}>
                          {formatHvVerlaufLine(e)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DetailCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
