"use client";

import { useEffect, useMemo, useState } from "react";

import { VorgangDetailBlocks } from "@/components/shared/vorgang-detail";
import { buildKundeHvVorgangDetailVm } from "@/lib/vorgang/build-vorgang-detail-vm";
import { BautagebuchAccordionList } from "@/components/shared/BautagebuchAccordionList";
import { DokumenteTabelle } from "@/components/shared/DokumenteTabelle";
import { PortalDetailCover } from "@/components/shared/PortalDetailCover";
import { PortalDetailHead } from "@/components/shared/PortalDetailUi";
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
  type PortalDetailSectionId,
} from "@/lib/portal2/layout-chrome";
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
  /** Abnahme-Checkliste (Leistungen + Mängel) für Abschluss-Card. */
  abnahmeCheckliste?: {
    leistungen: Array<{ name: string; ok?: boolean }>;
    maengel: Array<{ titel: string; status?: string | null }>;
  } | null;
  verlauf?: HvVerlaufEntry[];
  coverUrl?: string | null;
  onBack?: () => void;
  onUpdated: () => void;
  /** org_freigabe_status für Angebots-Freigabe */
  orgFreigabeStatus?: string | null;
  /** Persistierter Bypass (V2) — Portal rechnet nicht selbst */
  freigabeBypassGrund?: "schwelle" | "akut" | null;
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
  /** Unverbindliche Preisindikation aus Mieter-Meldung (nur HV). */
  meldePreisIndikation?: string | null;
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
    <section
      id={id}
      className={cn(portalDetailSectionClass("responsive"))}
      style={portalDetailSectionBorderStyle("responsive")}
    >
      {title || (badge && badge > 0) ? (
        <div className="mb-3 flex items-center gap-2">
          {title ? <h3 className="portal-text-section">{title}</h3> : null}
          {badge && badge > 0 ? (
            <span
              className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
              style={{
                background: PORTAL_VAR.dangerSoft,
                color: PORTAL_VAR.danger,
              }}
            >
              {badge > 9 ? "9+" : badge}
            </span>
          ) : null}
        </div>
      ) : null}
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
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "portal-action-btn",
        kind === "ghost"
          ? "portal-action-btn--ghost"
          : kind === "danger"
            ? "portal-action-btn--danger"
            : "portal-action-btn--primary",
        className
      )}
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
      <div className="flex flex-col gap-1 bg-[var(--p2-primary-soft,#e7f1e9)]/50 px-3 py-2.5">
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
  abnahmeCheckliste = null,
  verlauf: _verlauf = [],
  coverUrl,
  onBack,
  onUpdated,
  orgFreigabeStatus,
  freigabeBypassGrund = null,
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
  meldePreisIndikation,
  detailRole = "hv",
  statusLabelOverride,
  mieterStatusMode = false,
  wartetAufHwLabel = null,
}: OrganisationHvVorgangDetailProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [btUnread, setBtUnread] = useState(0);
  const [activeSection, setActiveSection] =
    useState<PortalDetailSectionId>("uebersicht");

  const angebotVorgelegt = Boolean(
    !mieterStatusMode &&
      (offers?.length ||
        positionenBrutto?.length ||
        (typeof gesamtBrutto === "number" && gesamtBrutto > 0) ||
        canAcceptAngebot)
  );
  const hasRechnungDoc = Boolean(
    rechnungPdfHref?.trim() ||
      dokumente.some((d) => /rechnung/i.test(d.name ?? ""))
  );
  /** Rechnung gesendet → Hinweis „Rechnung“ statt „Auftrag“. */
  const displayFlowStatus: PortalMockStatusId = (() => {
    if (
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
  const actionKind = hvRoleActionKind(displayFlowStatus, {
    privatkunde,
    angebotVorgelegt,
  });
  const empfohlen = pickEmpfohlenesAngebot(offers);
  const statusLabel =
    statusLabelOverride?.trim() || PORTAL_STATUS[displayFlowStatus].label;

  const abschlussCard = (
    <DetailCard title={HV_DETAIL_COPY.abnahmeTitle}>
      {abnahmeCheckliste &&
      (abnahmeCheckliste.leistungen.length > 0 ||
        abnahmeCheckliste.maengel.length > 0) ? (
        <div className="space-y-3">
          <p className="text-[12.5px] leading-relaxed" style={{ color: PORTAL_VAR.sub }}>
            {HV_DETAIL_COPY.abnahmeNote}
          </p>
          {abnahmeCheckliste.leistungen.length > 0 ? (
            <div>
              <p
                className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wide"
                style={{ color: PORTAL_VAR.faint }}
              >
                {HV_DETAIL_COPY.abnahmeLeistungen}
              </p>
              <ul className="space-y-1.5">
                {abnahmeCheckliste.leistungen.map((l) => (
                  <li
                    key={l.name}
                    className="flex items-start gap-2 text-[13px]"
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
                className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wide"
                style={{ color: PORTAL_VAR.faint }}
              >
                {HV_DETAIL_COPY.abnahmeMaengel}
              </p>
              <ul className="space-y-1.5">
                {abnahmeCheckliste.maengel.map((m) => (
                  <li
                    key={m.titel}
                    className="flex items-start gap-2 rounded-lg px-2.5 py-2 text-[13px]"
                    style={{ background: "#FBF1D6", color: "#8A5A06" }}
                  >
                    <span className="font-semibold">{m.titel}</span>
                    {m.status ? (
                      <span className="ml-auto shrink-0 text-[11px] opacity-80">
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
        <p className="text-[12.5px]" style={{ color: PORTAL_VAR.faint }}>
          {HV_DETAIL_COPY.abnahmeEmpty}
        </p>
      )}
    </DetailCard>
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
        meldePreisIndikation:
          detailRole === "hv" && !mieterStatusMode
            ? meldePreisIndikation
            : null,
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
      meldePreisIndikation,
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
      mieterStatusMode,
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
  const unterSchwelle =
    orgFreigabeStatus === "nicht_noetig" &&
    (freigabeBypassGrund === "schwelle" || freigabeBypassGrund === "akut");

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
                {freigabeBypassGrund === "akut"
                  ? HV_DETAIL_COPY.unterSchwelleAkut
                  : HV_DETAIL_COPY.unterSchwelle(moneyEur(schwelleEur))}
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
                  label={HV_DETAIL_COPY.freigabeBtn}
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
      return abschlussCard;
    }
    if (actionKind === "rechnung") {
      return (
        <div className="flex flex-col gap-3.5">
          {abschlussCard}
          <DetailCard title={HV_DETAIL_COPY.rechnungTitle}>
            <p className="mb-3 text-[13px]" style={{ color: PORTAL_VAR.sub }}>
              {HV_DETAIL_COPY.rechnungNote}
            </p>
            {sum.brutto > 0 ? (
              <div
                className="mb-1 flex justify-between text-lg font-bold"
                style={{
                  color: PORTAL_VAR.ink,
                  fontFamily: "var(--p2-font-head, " + PORTAL_VAR.head + ")",
                }}
              >
                <span>{HV_DETAIL_COPY.rechnungsbetrag}</span>
                <span>{moneyEur(sum.brutto)}</span>
              </div>
            ) : null}
            <p
              className="rounded-lg px-3 py-2 text-[12px] font-semibold"
              style={{ background: "#FBF1D6", color: "#8A5A06" }}
            >
              {HV_DETAIL_COPY.ueberweisungOffen}
            </p>
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
  const angebotSectionLabel =
    actionKind === "abschluss" ||
    actionKind === "rechnung" ||
    actionKind === "bezahlt"
      ? HV_DETAIL_COPY.abnahmeTitle
      : actionKind === "freigabe"
        ? "Freigabe"
        : "Angebot";

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
      setActiveSection("bautagebuch");
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
      {
        id: "angebot" as const,
        hidden: !showAngebotSection,
        label: angebotSectionLabel,
      },
      {
        id: "bautagebuch" as const,
        hidden: !showBautagebuch,
        badge: btUnread > 0 ? btUnread : null,
      },
      { id: "dokumente" as const },
    ],
    [showAngebotSection, showBautagebuch, btUnread, angebotSectionLabel]
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

  return (
    <div className="flex flex-col">
      {onBack ? (
        <PortalDetailCover
          coverUrl={coverUrl}
          onBack={onBack}
          backLabel="← Zurück"
        />
      ) : (
        <div
          className="relative w-full shrink-0 overflow-hidden"
          style={{ height: 150 }}
        >
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, #1A3D2B 0%, #2E7D52 60%, #0f766e 100%)",
              }}
            />
          )}
        </div>
      )}

      <div
        className="bg-white px-4 py-4 sm:px-6"
        style={{ borderBottom: `1px solid ${PORTAL_VAR.line2}` }}
      >
        <PortalDetailHead
          title={titel}
          metaLine={[objekt, kategorie].filter(Boolean).join(" · ") || undefined}
          subtitle={wartetAufHwLabel || undefined}
          titleBadges={
            notfall ? (
              <span className="rounded px-1.5 py-0.5 text-[11px] font-bold portal-danger-soft">
                NOTFALL
              </span>
            ) : null
          }
          actions={
            <PortalFlowStatusChip
              statusId={displayFlowStatus}
              label={statusLabel}
            />
          }
        />

        {actionKind === "freigabe" ||
        (actionKind === "angebot" && showAcceptCta) ? (
          <div
            className={cn(
              "portal-action-row mt-4 flex-col sm:flex-row",
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
                  className="w-full sm:flex-1"
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

      <div className="flex flex-col gap-4 px-4 pb-6 pt-3 sm:px-6 sm:pt-4 lg:flex-row lg:items-start lg:gap-6 lg:pt-5">
        <div className="lg:sticky lg:top-3 lg:w-[11rem] lg:shrink-0">
          <VorgangDetailSectionNav
            items={navItems}
            mode="tabs"
            activeId={activeSection}
            onActiveChange={onSectionChange}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3.5 lg:gap-5">
          {activeSection === "uebersicht" ? (
            <section
              id="vorgang-panel-uebersicht"
              role="tabpanel"
              className="space-y-3.5"
            >
              {(actionKind === "abschluss" ||
                actionKind === "rechnung" ||
                actionKind === "bezahlt") &&
              !showAngebotSection
                ? abschlussCard
                : null}
              <VorgangDetailBlocks vm={detailVm} />
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
                <p className="text-sm font-semibold text-red-700" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          ) : null}

          {activeSection !== "angebot" && error ? (
            <p className="text-sm font-semibold text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          {activeSection === "bautagebuch" && showBautagebuch ? (
            <DetailCard id="vorgang-panel-bautagebuch" title={HV_DETAIL_COPY.bautagebuchTitle}>
              <div onFocus={onBautagebuchViewed} onClick={onBautagebuchViewed}>
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

          {activeSection === "dokumente" ? (
            <DetailCard id="vorgang-panel-dokumente" title={HV_DETAIL_COPY.dokumenteTitle}>
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
          ) : null}
        </div>
      </div>
    </div>
  );
}
