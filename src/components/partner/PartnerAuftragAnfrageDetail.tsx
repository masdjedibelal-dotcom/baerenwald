"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { respondPartnerAuftragZuweisung } from "@/app/actions/partner-auftrag-anfragen";
import {
  PartnerConfirmDialog,
  PartnerDetailError,
  PartnerDetailHero,
  PartnerDetailInfoBox,
  PartnerDetailLayout,
  PartnerDetailLeistungenList,
  PartnerDetailSection,
  PartnerDetailStickyActions,
  PartnerJobFieldActions,
} from "@/components/partner/PartnerDetailUi";
import { partnerMapsHref } from "@/lib/partner/partner-maps-href";
import { PartnerPortalDetailSections } from "@/components/partner/PartnerPortalDetailSections";
import {
  HANDWERKER_ABLEHNUNG_GRUND_LABELS,
  HANDWERKER_ABLEHNUNG_GRUND_VALUES,
} from "@/lib/partner/handwerker-ablehnung";
import type { PartnerAuftragItem } from "@/lib/partner/get-partner-data";
import { partnerDetailStatusPillClass } from "@/lib/partner/partner-detail-format";
import {
  buildPartnerAuftragPortalSections,
  partnerAuftragDetailMetaLine,
} from "@/lib/partner/partner-portal-display";
import { auftragHwStatusLabel } from "@/lib/partner/partner-portal-phase";
import {
  partnerAngebotPortalUrl,
  partnerDashboardUrl,
} from "@/lib/partner/partner-site-url";

const PENDING_HW = new Set(["angefragt", "ausstehend", "warten", "offen", "zugewiesen"]);

export function PartnerAuftragAnfrageDetail({ item }: { item: PartnerAuftragItem }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [confirmAccept, setConfirmAccept] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [grund, setGrund] = useState<string>(HANDWERKER_ABLEHNUNG_GRUND_VALUES[0]);
  const [notiz, setNotiz] = useState("");

  const hwSt = item.hwStatus.toLowerCase();
  const hwBeantwortet = hwSt === "akzeptiert" || hwSt === "abgelehnt";
  const kannAntworten =
    !hwBeantwortet &&
    (PENDING_HW.has(hwSt) || hwSt === "zugewiesen" || item.status.toLowerCase() === "offen");

  async function sendAntwort(antwort: "akzeptiert" | "abgelehnt") {
    setLoading(true);
    setError(null);
    const res = await respondPartnerAuftragZuweisung({
      auftragId: item.id,
      antwort,
      grund: antwort === "abgelehnt" ? grund : undefined,
      notiz: notiz.trim() || undefined,
    });
    setLoading(false);
    setConfirmAccept(false);
    setConfirmReject(false);
    setShowReject(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (antwort === "akzeptiert") {
      router.refresh();
      if (res.angebotAnfrageId) {
        router.push(partnerAngebotPortalUrl(res.angebotAnfrageId));
      } else {
        router.push(`${partnerDashboardUrl()}?section=angebote`);
      }
      return;
    }
    router.refresh();
  }

  const statusLabel = auftragHwStatusLabel(item.hwStatus);

  const infoText = hwBeantwortet
    ? hwSt === "akzeptiert"
      ? "Du hast zugesagt. Als Nächstes reichst du dein Angebot (Preis und PDF) unter „Angebote“ ein."
      : "Du hast diese Zuweisung abgelehnt."
    : "Bärenwald hat dir Leistungen an diesem Projekt zugewiesen. Bitte bestätige oder lehne die Anfrage ab.";

  const leistungen = item.positionen.map((p) => ({
    id: p.id,
    title: [p.gewerk_name, p.leistung_name].filter(Boolean).join(" — "),
    beschreibung: p.beschreibung,
  }));

  const actionFooter =
    kannAntworten && !showReject ? (
      <PartnerDetailStickyActions
        primaryLabel="Annehmen"
        onPrimary={() => setConfirmAccept(true)}
        primaryLoading={loading}
        secondaryLabel="Ablehnen"
        onSecondary={() => setShowReject(true)}
        secondaryDisabled={loading}
      />
    ) : kannAntworten && showReject ? (
      <PartnerDetailStickyActions
        primaryLabel="Ablehnung senden"
        onPrimary={() => setConfirmReject(true)}
        primaryLoading={loading}
        secondaryLabel="Zurück"
        onSecondary={() => setShowReject(false)}
        secondaryDisabled={loading}
      />
    ) : undefined;
  const hasMaps = Boolean(
    partnerMapsHref({ lead: item.lead, plz: item.plz, ort: item.ort })
  );
  const footer =
    actionFooter || hasMaps ? (
      <div className="space-y-2">
        {hasMaps ? (
          <PartnerJobFieldActions lead={item.lead} plz={item.plz} ort={item.ort} />
        ) : null}
        {actionFooter}
      </div>
    ) : undefined;

  return (
    <PartnerDetailLayout footer={footer}>
      <PartnerDetailHero
        title={item.titel}
        metaLine={partnerAuftragDetailMetaLine(item.start_datum, item.end_datum)}
        statusLabel={statusLabel}
        statusPillClass={partnerDetailStatusPillClass(item.hwStatus)}
      />

      <PartnerDetailInfoBox>{infoText}</PartnerDetailInfoBox>

      <PartnerPortalDetailSections
        sections={buildPartnerAuftragPortalSections(item.lead)}
      />

      {leistungen.length > 0 ? (
        <PartnerDetailSection title="Leistungen">
          <PartnerDetailLeistungenList items={leistungen} />
        </PartnerDetailSection>
      ) : null}

      {error ? <PartnerDetailError message={error} /> : null}

      {hwSt === "akzeptiert" && item.angebotHandwerkerId ? (
        <a
          href={partnerAngebotPortalUrl(item.angebotHandwerkerId)}
          className="btn-pill-primary portal-btn inline-flex !px-4 !py-2.5"
        >
          Zum Angebot einreichen
        </a>
      ) : hwSt === "akzeptiert" ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 portal-text-body text-amber-900">
          Dein Angebot kann hier noch nicht eingereicht werden — Bärenwald muss dich zuerst am
          Angebot anbinden. Bei Fragen melde dich bei uns.
        </p>
      ) : null}

      {showReject && kannAntworten ? (
        <div className="space-y-3 rounded-xl border border-border-light bg-muted/30 p-4">
          <label className="block space-y-1">
            <span className="portal-form-label">Ablehnungsgrund</span>
            <select
              value={grund}
              onChange={(e) => setGrund(e.target.value)}
              className="portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-3"
            >
              {HANDWERKER_ABLEHNUNG_GRUND_VALUES.map((v) => (
                <option key={v} value={v}>
                  {HANDWERKER_ABLEHNUNG_GRUND_LABELS[v]}
                </option>
              ))}
            </select>
          </label>
          <textarea
            value={notiz}
            onChange={(e) => setNotiz(e.target.value)}
            placeholder="Optionale Notiz"
            rows={3}
            className="portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-3"
          />
        </div>
      ) : null}

      <PartnerConfirmDialog
        open={confirmAccept}
        title="Leistung annehmen?"
        description="Du bestätigst die Zuweisung. Als Nächstes gibst du unter „Angebote“ deinen Preis ein und lädst dein Angebot (PDF) hoch."
        confirmLabel="Ja, annehmen"
        loading={loading}
        onConfirm={() => sendAntwort("akzeptiert")}
        onCancel={() => setConfirmAccept(false)}
      />
      <PartnerConfirmDialog
        open={confirmReject}
        title="Leistung ablehnen?"
        description="Bärenwald wird informiert. Bitte wähle einen Grund."
        confirmLabel="Ablehnen"
        confirmVariant="danger"
        loading={loading}
        onConfirm={() => sendAntwort("abgelehnt")}
        onCancel={() => setConfirmReject(false)}
      />
    </PartnerDetailLayout>
  );
}
