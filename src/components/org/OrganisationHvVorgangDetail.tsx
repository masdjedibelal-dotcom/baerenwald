"use client";

import { useMemo, useState } from "react";

import { OrgVorgangAbnahmeSection } from "@/components/org/OrgVorgangAbnahmeSection";
import { BautagebuchAccordionList } from "@/components/shared/BautagebuchAccordionList";
import { PortalFlowStatusChip } from "@/components/shared/PortalFlowStatusChip";
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
import { portalFlowTimeline } from "@/lib/portal2/status-mapping";
import { PORTAL_STATUS, type PortalMockStatusId } from "@/lib/portal2/status";
import { PORTAL_C } from "@/lib/portal2/tokens";
import { orgPortalToast } from "@/lib/shared/portal-toast";
import { track } from "@/lib/analytics";
import type { PortalBautagebuchEntry } from "@/lib/portal/portal-detail-item";
import type { PortalAngebotPositionDisplay } from "@/lib/portal/portal-angebot-display";

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
  verlauf?: HvVerlaufEntry[];
  coverUrl?: string | null;
  onBack?: () => void;
  onUpdated: () => void;
  /** org_freigabe_status für Angebots-Freigabe */
  orgFreigabeStatus?: string | null;
  hvMeldungStatus?: string | null;
};

function DetailCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl bg-white p-4"
      style={{ border: `1px solid ${PORTAL_C.line}` }}
    >
      <h3
        className="mb-3 text-[14px] font-bold"
        style={{
          color: PORTAL_C.ink,
          fontFamily: "var(--p2-font-head, " + PORTAL_C.head + ")",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function ActionBtn({
  label,
  onClick,
  kind = "primary",
  disabled,
}: {
  label: string;
  onClick: () => void;
  kind?: "primary" | "ghost" | "danger";
  disabled?: boolean;
}) {
  const style =
    kind === "ghost"
      ? {
          border: `1px solid ${PORTAL_C.line}`,
          background: "#fff",
          color: PORTAL_C.sub,
        }
      : kind === "danger"
        ? { border: "none", background: "#FCE3E3", color: "#A1242A" }
        : {
            border: "none",
            background: "var(--org-primary, " + PORTAL_C.primary + ")",
            color: "#fff",
          };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-[9px] px-[18px] py-[11px] text-[13.5px] font-semibold disabled:opacity-60"
      style={style}
    >
      {label}
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
      style={{ border: `1px solid ${PORTAL_C.line}` }}
    >
      {positionen.map((p, i) => (
        <div
          key={i}
          className="flex justify-between px-3 py-2.5 text-[12.5px]"
          style={{ borderBottom: `1px solid ${PORTAL_C.line2}` }}
        >
          <div>
            <div className="font-medium" style={{ color: PORTAL_C.ink }}>
              {p.pos}
            </div>
            <div className="text-[11px]" style={{ color: PORTAL_C.faint }}>
              {p.menge} · {p.gewerk}
            </div>
          </div>
          <span className="font-semibold" style={{ color: PORTAL_C.ink }}>
            {moneyEur(p.einzel)}
          </span>
        </div>
      ))}
      <div className="flex flex-col gap-1 bg-[#f7f8fa] px-3 py-2.5">
        <div
          className="flex justify-between text-xs"
          style={{ color: PORTAL_C.sub }}
        >
          <span>Netto</span>
          <span>{moneyEur(sum.net)}</span>
        </div>
        <div
          className="flex justify-between text-xs"
          style={{ color: PORTAL_C.sub }}
        >
          <span>MwSt. 19%</span>
          <span>{moneyEur(sum.mwst)}</span>
        </div>
        <div
          className="mt-0.5 flex justify-between text-[15px] font-bold"
          style={{
            color: PORTAL_C.ink,
            fontFamily: "var(--p2-font-head, " + PORTAL_C.head + ")",
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
  prioritaet,
  handwerkerName,
  leadId,
  auftragId,
  hvAbnahme,
  hwErledigt,
  schwelleEur = HV_DEFAULT_SCHWELLE_EUR,
  offers = [],
  positionen = [],
  positionenBrutto = [],
  gesamtBrutto,
  rechnungPdfHref,
  bautagebuch = [],
  verlauf = [],
  coverUrl,
  onBack,
  onUpdated,
  orgFreigabeStatus,
}: OrganisationHvVorgangDetailProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAbnahme, setShowAbnahme] = useState(false);

  const timeline = portalFlowTimeline(flowStatus);
  const actionKind = hvRoleActionKind(flowStatus, { privatkunde });
  const empfohlen = pickEmpfohlenesAngebot(offers);

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

  const rolePanel = (() => {
    if (actionKind === "privat_auto") {
      return (
        <DetailCard title="Status">
          <p className="text-[13px]" style={{ color: PORTAL_C.sub }}>
            {HV_DETAIL_COPY.privatAuto}
          </p>
        </DetailCard>
      );
    }
    if (actionKind === "freigabe") {
      return (
        <DetailCard title={HV_DETAIL_COPY.freigabeTitle}>
          <p className="mb-3 text-[13px] leading-relaxed" style={{ color: PORTAL_C.sub }}>
            {HV_DETAIL_COPY.freigabeNote}
          </p>
          <div className="flex flex-wrap gap-2">
            <ActionBtn
              label={HV_DETAIL_COPY.freigabeBtn}
              disabled={busy}
              onClick={() => void meldungAct("angebot_einfordern")}
            />
            <ActionBtn
              label={HV_DETAIL_COPY.ablehnen}
              kind="ghost"
              disabled={busy}
              onClick={() => void meldungAct("ablehnen")}
            />
          </div>
        </DetailCard>
      );
    }
    if (actionKind === "angebot") {
      return (
        <div className="flex flex-col gap-3.5">
          <DetailCard title={HV_DETAIL_COPY.angeboteVergleichen}>
            <p className="mb-3 text-[12.5px]" style={{ color: PORTAL_C.sub }}>
              {offers.length > 0
                ? `${offers.length} Handwerker haben ein Angebot abgegeben. Bärenwald empfiehlt das markierte Angebot.`
                : HV_DETAIL_COPY.angeboteVergleichNote}
            </p>
            {empfohlen ? (
              <div
                className="relative rounded-xl p-3.5"
                style={{
                  border: `1.5px solid ${PORTAL_C.primary}`,
                  background: "#fff",
                }}
              >
                <span
                  className="absolute -top-2 left-3 rounded-full px-2 py-0.5 text-[10.5px] font-bold text-white"
                  style={{ background: PORTAL_C.primary }}
                >
                  {HV_DETAIL_COPY.empfohlenBadge}
                </span>
                <p
                  className="mt-1 text-[13.5px] font-bold"
                  style={{
                    color: PORTAL_C.ink,
                    fontFamily: "var(--p2-font-head, " + PORTAL_C.head + ")",
                  }}
                >
                  {empfohlen.name}
                </p>
                <p className="text-[11.5px]" style={{ color: PORTAL_C.faint }}>
                  {empfohlen.trade}
                  {empfohlen.dauer ? ` · ${empfohlen.dauer}` : ""}
                </p>
                <p
                  className="mt-2 text-xl font-extrabold"
                  style={{
                    color: PORTAL_C.ink,
                    fontFamily: "var(--p2-font-head, " + PORTAL_C.head + ")",
                  }}
                >
                  {moneyEur(empfohlen.betrag)}
                </p>
              </div>
            ) : (
              <p className="text-[12.5px]" style={{ color: PORTAL_C.faint }}>
                Noch kein Angebot hinterlegt.
              </p>
            )}
          </DetailCard>

          <DetailCard title={HV_DETAIL_COPY.empfohlenDetail}>
            {derivedPositionen.length ? (
              <PositionenTable positionen={derivedPositionen} sum={sum} />
            ) : (
              <p className="mb-3 text-[13px]" style={{ color: PORTAL_C.sub }}>
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
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <ActionBtn
                  label={HV_DETAIL_COPY.empfohlenAnnehmen}
                  disabled={busy || orgFreigabeStatus !== "ausstehend"}
                  onClick={() => void freigabeAct("freigegeben")}
                />
                <ActionBtn
                  label={HV_DETAIL_COPY.ablehnen}
                  kind="danger"
                  disabled={busy}
                  onClick={() => void freigabeAct("abgelehnt")}
                />
              </div>
            )}
          </DetailCard>
        </div>
      );
    }
    if (actionKind === "auftrag") {
      return (
        <DetailCard title={HV_DETAIL_COPY.inAusfuehrung}>
          <p className="text-[13px] leading-relaxed" style={{ color: PORTAL_C.sub }}>
            {HV_DETAIL_COPY.inAusfuehrungNoteHv}
          </p>
        </DetailCard>
      );
    }
    if (actionKind === "abschluss") {
      return (
        <DetailCard title={HV_DETAIL_COPY.abnahmeTitle}>
          <p className="mb-3 text-[13px] leading-relaxed" style={{ color: PORTAL_C.sub }}>
            {HV_DETAIL_COPY.abnahmeNote}
          </p>
          <ActionBtn
            label={HV_DETAIL_COPY.abnahmeBtn}
            onClick={() => setShowAbnahme(true)}
          />
          {showAbnahme && auftragId ? (
            <div className="mt-4">
              <OrgVorgangAbnahmeSection
                leadId={leadId}
                auftragId={auftragId}
                existing={hvAbnahme ?? null}
                onSubmitted={onUpdated}
              />
            </div>
          ) : null}
          {!showAbnahme && hwErledigt && auftragId ? (
            <div className="mt-4">
              <OrgVorgangAbnahmeSection
                leadId={leadId}
                auftragId={auftragId}
                existing={hvAbnahme ?? null}
                onSubmitted={onUpdated}
              />
            </div>
          ) : null}
        </DetailCard>
      );
    }
    if (actionKind === "rechnung") {
      return (
        <div className="flex flex-col gap-3.5">
          <DetailCard title={HV_DETAIL_COPY.rechnungTitle}>
            <p className="mb-3 text-[13px]" style={{ color: PORTAL_C.sub }}>
              {HV_DETAIL_COPY.rechnungNote}
            </p>
            <div
              className="mb-3 flex justify-between text-lg font-bold"
              style={{
                color: PORTAL_C.ink,
                fontFamily: "var(--p2-font-head, " + PORTAL_C.head + ")",
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
                  style={{ borderColor: PORTAL_C.line, color: PORTAL_C.sub }}
                >
                  {HV_DETAIL_COPY.paketOeffnen}
                </a>
              ) : (
                <span
                  className="rounded-[9px] border px-[18px] py-[11px] text-[13.5px] font-semibold opacity-50"
                  style={{ borderColor: PORTAL_C.line, color: PORTAL_C.sub }}
                >
                  {HV_DETAIL_COPY.paketOeffnen}
                </span>
              )}
            </div>
          </DetailCard>
          <DetailCard title={HV_DETAIL_COPY.abschlagsplanTitle}>
            <p className="mb-2 text-[12.5px]" style={{ color: PORTAL_C.sub }}>
              {HV_DETAIL_COPY.abschlagsplanNote}
            </p>
            <div className="flex flex-col gap-2">
              {abschlaege.map((r) => (
                <div
                  key={r.title}
                  className="flex items-center gap-2.5 rounded-[9px] px-3 py-2.5"
                  style={{ border: `1px solid ${PORTAL_C.line}` }}
                >
                  <div className="flex-1">
                    <p className="text-[13.5px] font-semibold" style={{ color: PORTAL_C.ink }}>
                      {r.title}
                    </p>
                    <p className="text-[11.5px]" style={{ color: PORTAL_C.faint }}>
                      {r.sub}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13.5px] font-bold" style={{ color: PORTAL_C.ink }}>
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
          <p className="text-[13px]" style={{ color: PORTAL_C.sub }}>
            {HV_DETAIL_COPY.abgeschlossenNote}
          </p>
        </DetailCard>
      );
    }
    return null;
  })();

  const showBautagebuch = ["auftrag", "abschluss", "rechnung", "bezahlt"].includes(
    flowStatus
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
        style={{ borderBottom: `1px solid ${PORTAL_C.line2}` }}
      >
        <div className="flex items-start gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: PORTAL_C.faint }}>
                {idLabel}
              </span>
              {notfall ? (
                <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-[#A1242A] bg-[#FCE3E3]">
                  ⚡ NOTFALL
                </span>
              ) : null}
            </div>
            <h1
              className="text-[20px] font-bold sm:text-[23px]"
              style={{
                color: PORTAL_C.ink,
                fontFamily: "var(--p2-font-head, " + PORTAL_C.head + ")",
              }}
            >
              {titel}
            </h1>
            <p className="mt-1 text-[13px]" style={{ color: PORTAL_C.sub }}>
              {objekt}
              {kategorie ? ` · ${kategorie}` : ""}
            </p>
          </div>
          <PortalFlowStatusChip
            statusId={flowStatus}
            label={PORTAL_STATUS[flowStatus].label}
          />
        </div>
      </div>

      <div
        className="flex gap-0 overflow-x-auto bg-white px-4 py-3 sm:px-6"
        style={{ borderBottom: `1px solid ${PORTAL_C.line2}` }}
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
                      ? "var(--org-primary, " + PORTAL_C.primary + ")"
                      : act
                        ? "#fff"
                        : "#f1f3f5",
                    color: done
                      ? "#fff"
                      : act
                        ? "var(--org-primary, " + PORTAL_C.primary + ")"
                        : PORTAL_C.faint,
                    border:
                      "2px solid " +
                      (done || act
                        ? "var(--org-primary, " + PORTAL_C.primary + ")"
                        : "#e3e6ea"),
                  }}
                >
                  {done ? "✓" : i + 1}
                </div>
                <p
                  className="max-w-[72px] text-center text-[9.5px] font-semibold leading-tight"
                  style={{
                    color: act ? PORTAL_C.ink : PORTAL_C.faint,
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

      <div className="flex flex-col gap-4 px-4 pb-6 sm:flex-row sm:px-6">
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          <DetailCard title={HV_DETAIL_COPY.beschreibungTitle}>
            <p className="text-[13.5px] leading-relaxed" style={{ color: PORTAL_C.sub }}>
              {beschreibung?.trim() || "Keine Beschreibung."}
            </p>
          </DetailCard>

          {rolePanel}
          {error ? (
            <p className="text-sm font-semibold text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          {showBautagebuch ? (
            <DetailCard title={HV_DETAIL_COPY.bautagebuchTitle}>
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
                <p className="text-[12.5px]" style={{ color: PORTAL_C.faint }}>
                  {HV_DETAIL_COPY.bautagebuchEmpty}
                </p>
              )}
            </DetailCard>
          ) : null}
        </div>

        <div className="flex w-full flex-col gap-3.5 sm:w-[260px] sm:shrink-0">
          <DetailCard title={HV_DETAIL_COPY.metaTitle}>
            {(
              [
                ["Melder", melder || "—"],
                ["Kategorie", kategorie || "—"],
                ["Priorität", notfall ? "Notfall" : prioritaet || "Normal"],
                ["Handwerker", handwerkerName || "—"],
                derivedPositionen.length || sum.brutto > 0
                  ? ["Angebot", moneyEur(sum.brutto)]
                  : null,
              ] as Array<[string, string] | null>
            )
              .filter(Boolean)
              .map((row) => {
                const [k, val] = row as [string, string];
                return (
                  <div
                    key={k}
                    className="flex justify-between border-b py-1.5 text-[12.5px] last:border-0"
                    style={{ borderColor: PORTAL_C.line2 }}
                  >
                    <span style={{ color: PORTAL_C.faint }}>{k}</span>
                    <span
                      className="max-w-[150px] text-right font-semibold"
                      style={{ color: PORTAL_C.ink }}
                    >
                      {val}
                    </span>
                  </div>
                );
              })}
          </DetailCard>

          <DetailCard title={HV_DETAIL_COPY.verlaufTitle}>
            {verlauf.length === 0 ? (
              <p className="text-[12.5px]" style={{ color: PORTAL_C.faint }}>
                Noch keine Einträge.
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {verlauf.map((e, i) => (
                  <div key={i} className="flex gap-2.5">
                    <div
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{
                        background: i === 0 ? PORTAL_C.primary : "#cfd4da",
                      }}
                    />
                    <div>
                      <p className="text-[12.5px]" style={{ color: PORTAL_C.ink }}>
                        {formatHvVerlaufLine(e)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DetailCard>
        </div>
      </div>
    </div>
  );
}
