"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { respondPartnerAnfrage } from "@/app/actions/partner-anfragen";
import { PartnerLeistungenKonditionenCard } from "@/components/partner/PartnerLeistungenKonditionenCard";
import { DokumenteTabelle } from "@/components/shared/DokumenteTabelle";
import {
  PartnerConfirmDialog,
  PartnerDetailError,
  PartnerDetailHero,
  PartnerDetailInfoBox,
  PartnerDetailLayout,
  PartnerDetailSection,
  PartnerDetailStickyActions,
} from "@/components/partner/PartnerDetailUi";
import { PartnerPortalDetailSections } from "@/components/partner/PartnerPortalDetailSections";
import {
  HANDWERKER_ABLEHNUNG_GRUND_LABELS,
  HANDWERKER_ABLEHNUNG_GRUND_VALUES,
} from "@/lib/partner/handwerker-ablehnung";
import type { PartnerAnfrageItem } from "@/lib/partner/get-partner-data";
import {
  isPartnerAnfrageAntwortAbgelaufen,
  isPartnerAnfrageOffen,
  partnerAnfrageStatusLabel,
} from "@/lib/partner/partner-anfrage-status";
import {
  buildPartnerAnfragePortalSections,
  PARTNER_LEISTUNGEN_GESAMT_LABEL,
  partnerDetailDateMetaLine,
  resolvePartnerKonditionZeilen,
} from "@/lib/partner/partner-portal-display";
import {
  fmtPartnerDate,
  partnerDetailStatusPillClass,
} from "@/lib/partner/partner-detail-format";
import { partnerAngebotPortalPath } from "@/lib/partner/partner-site-url";
import { cn } from "@/lib/utils";

function anfrageStatusPillClass(item: PartnerAnfrageItem, offen: boolean): string {
  if (isPartnerAnfrageAntwortAbgelaufen(item)) return "tag bg-red-100 text-red-700";
  if (offen) return "tag bg-amber-100 text-amber-700";
  return partnerDetailStatusPillClass(item.status);
}

export function PartnerAnfrageDetail({
  item,
  onAccepted,
}: {
  item: PartnerAnfrageItem;
  onAccepted?: (anfrageId: string) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [confirmAccept, setConfirmAccept] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [grund, setGrund] = useState<string>(HANDWERKER_ABLEHNUNG_GRUND_VALUES[0]);
  const [notiz, setNotiz] = useState("");

  const offen = isPartnerAnfrageOffen(item);
  const abgelaufen = isPartnerAnfrageAntwortAbgelaufen(item);
  const beantwortet = Boolean(item.antwort_at);
  const kannAntworten = offen;
  const statusLabel = partnerAnfrageStatusLabel(item);

  const sections = useMemo(
    () =>
      buildPartnerAnfragePortalSections(item.lead, {
        crm_leistungsumfang: item.crm_leistungsumfang,
      }),
    [item.lead, item.crm_leistungsumfang]
  );

  const konditionZeilen = useMemo(
    () =>
      resolvePartnerKonditionZeilen(item.crm_positionen_raw, {
        gewerkId: item.gewerk_id,
      }),
    [item.crm_positionen_raw, item.gewerk_id]
  );

  async function sendAntwort(antwort: "akzeptiert" | "abgelehnt") {
    setLoading(true);
    setError(null);
    const res = await respondPartnerAnfrage({
      anfrageId: item.id,
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
      if (onAccepted) {
        onAccepted(item.id);
      } else {
        router.replace(partnerAngebotPortalPath(item.id));
        router.refresh();
      }
      return;
    }
    router.refresh();
  }

  const actionFooter =
    kannAntworten && !showReject ? (
      <PartnerDetailStickyActions
        primaryLabel="Anfrage annehmen"
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
    ) : null;

  const footer = actionFooter ?? undefined;

  return (
    <PartnerDetailLayout footer={footer}>
      <PartnerDetailHero
        title={item.listen_titel}
        metaLine={partnerDetailDateMetaLine(item.gesendet_at)}
        statusLabel={statusLabel}
        statusPillClass={anfrageStatusPillClass(item, offen)}
      />

      {kannAntworten ? (
        <PartnerDetailInfoBox>
          Deine Antwort geht an Bärenwald. Bei Zusage bestätigst du unter „Angebote“ die
          vorgeschlagenen Konditionen je Leistung — oder sendest einen Gegenvorschlag.
        </PartnerDetailInfoBox>
      ) : abgelaufen ? (
        <PartnerDetailInfoBox>
          Die Antwortfrist ist abgelaufen, weil der geplante Projektstart erreicht ist. Eine
          Annahme oder Ablehnung ist nicht mehr möglich.
        </PartnerDetailInfoBox>
      ) : null}

      <PartnerPortalDetailSections sections={sections} />

      {konditionZeilen.length > 0 ? (
        <PartnerDetailSection title="Leistungen & Vergütung">
          <PartnerLeistungenKonditionenCard
            zeilen={konditionZeilen}
            mode="vorschlag"
            gesamtLabel={PARTNER_LEISTUNGEN_GESAMT_LABEL}
          />
        </PartnerDetailSection>
      ) : null}

      <DokumenteTabelle
        dokumente={[]}
        heading="Dokumente"
        emptyText="Noch keine Dokumente."
        className="!border-t-0 !pt-0"
      />

      {beantwortet ? (
        <p className="portal-text-body text-text-secondary">
          Beantwortet am {fmtPartnerDate(item.antwort_at)}
          {item.antwort_notiz ? ` — ${item.antwort_notiz}` : ""}
        </p>
      ) : null}

      {error ? <PartnerDetailError message={error} /> : null}

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
          <label className="block space-y-1">
            <span className="portal-form-label">Notiz (optional)</span>
            <textarea
              value={notiz}
              onChange={(e) => setNotiz(e.target.value)}
              rows={2}
              className="portal-input w-full rounded-xl border border-border-default bg-surface-card px-3 py-3"
            />
          </label>
        </div>
      ) : null}

      {item.status === "akzeptiert" && !item.hw_eingereicht_at ? (
        <p className={cn("rounded-lg bg-accent-light/50 px-3 py-2 portal-text-body text-accent")}>
          Bitte bestätige die Konditionen unter dem Menüpunkt „Angebote“.
        </p>
      ) : null}

      <PartnerConfirmDialog
        open={confirmAccept}
        title="Anfrage annehmen?"
        description="Bärenwald erhält eine E-Mail mit deiner Zusage. Du wirst zu „Angebote“ weitergeleitet, um die Konditionen je Leistung zu bestätigen oder anzupassen."
        confirmLabel="Ja, annehmen und senden"
        loading={loading}
        onConfirm={() => sendAntwort("akzeptiert")}
        onCancel={() => setConfirmAccept(false)}
      />

      <PartnerConfirmDialog
        open={confirmReject}
        title="Anfrage ablehnen?"
        description="Bärenwald erhält eine E-Mail mit deiner Ablehnung. Die Antwort wird im CRM gespeichert."
        confirmLabel="Ja, ablehnen und senden"
        confirmVariant="danger"
        loading={loading}
        onConfirm={() => sendAntwort("abgelehnt")}
        onCancel={() => setConfirmReject(false)}
      />
    </PartnerDetailLayout>
  );
}
