"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { respondPartnerAnfrage } from "@/app/actions/partner-anfragen";
import { DokumenteTabelle } from "@/components/shared/DokumenteTabelle";
import {
  PartnerConfirmDialog,
  PartnerDetailError,
  PartnerDetailHero,
  PartnerDetailInfoBox,
  PartnerDetailKeyValues,
  PartnerDetailLayout,
  PartnerDetailLeistungenList,
  PartnerDetailSection,
  PartnerDetailStickyActions,
} from "@/components/partner/PartnerDetailUi";
import {
  HANDWERKER_ABLEHNUNG_GRUND_LABELS,
  HANDWERKER_ABLEHNUNG_GRUND_VALUES,
} from "@/lib/partner/handwerker-ablehnung";
import type { PartnerAnfrageItem } from "@/lib/partner/get-partner-data";
import {
  isPartnerAnfrageOffen,
  partnerAnfrageStatusLabel,
} from "@/lib/partner/partner-anfrage-status";
import {
  fmtPartnerDate,
  fmtPartnerMetaLine,
  partnerDetailStatusPillClass,
} from "@/lib/partner/partner-detail-format";
import { partnerAngebotPortalUrl } from "@/lib/partner/partner-site-url";
import { cn } from "@/lib/utils";

function anfrageStatusPillClass(item: PartnerAnfrageItem, offen: boolean): string {
  if (offen) return "tag bg-amber-100 text-amber-700";
  return partnerDetailStatusPillClass(item.status);
}

export function PartnerAnfrageDetail({ item }: { item: PartnerAnfrageItem }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [confirmAccept, setConfirmAccept] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [grund, setGrund] = useState<string>(HANDWERKER_ABLEHNUNG_GRUND_VALUES[0]);
  const [notiz, setNotiz] = useState("");

  const offen = isPartnerAnfrageOffen(item);
  const beantwortet = Boolean(item.antwort_at);
  const kannAntworten = offen;
  const heroTitle = item.angebot_titel || item.gewerk_name;
  const statusLabel = partnerAnfrageStatusLabel(item);

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
      router.push(partnerAngebotPortalUrl(item.id));
      return;
    }
    router.refresh();
  }

  const leistungen = item.positionen.map((p, i) => ({
    id: String(i),
    title: p.beschreibung,
    meta:
      p.menge > 1
        ? `${p.menge} ${p.einheit || "Stk."}`
        : p.einheit
          ? p.einheit
          : undefined,
  }));

  const footer =
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
    ) : undefined;

  return (
    <PartnerDetailLayout footer={footer}>
      <PartnerDetailHero
        title={heroTitle}
        metaLine={fmtPartnerMetaLine({
          plz: item.plz,
          ort: item.ort,
          date: item.gesendet_at,
        })}
        statusLabel={statusLabel}
        statusPillClass={anfrageStatusPillClass(item, offen)}
        subtitle={
          item.angebot_titel && item.gewerk_name !== item.angebot_titel
            ? item.gewerk_name
            : undefined
        }
      />

      {kannAntworten ? (
        <PartnerDetailInfoBox>
          Deine Antwort geht an Bärenwald. Bei Zusage wirst du zu „Angebote“ weitergeleitet,
          um Netto-Preis und Angebots-PDF einzureichen.
        </PartnerDetailInfoBox>
      ) : null}

      <PartnerDetailSection title="Beschreibung">
        <PartnerDetailKeyValues
          rows={[
            { label: "Gewerk", value: item.gewerk_name },
            { label: "Zeitraum", value: item.zeitraum },
            { label: "Hinweis von Bärenwald", value: item.aufgabe_notiz },
          ]}
        />
      </PartnerDetailSection>

      {leistungen.length > 0 ? (
        <PartnerDetailSection title="Leistungen">
          <PartnerDetailLeistungenList items={leistungen} />
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
          Bitte reiche dein Angebot (Preis + PDF) unter dem Menüpunkt „Angebote“ ein.
        </p>
      ) : null}

      <PartnerConfirmDialog
        open={confirmAccept}
        title="Anfrage annehmen?"
        description="Bärenwald erhält eine E-Mail mit deiner Zusage. Du wirst zu „Angebote“ weitergeleitet, um Netto-Preis und Angebots-PDF einzureichen."
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
