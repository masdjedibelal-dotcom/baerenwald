"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
  initialHwNettoInputs,
  parseHwNettoInput,
} from "@/lib/partner/partner-konditionen";
import {
  isPartnerAnfrageAntwortAbgelaufen,
  isPartnerAnfrageKonditionenBearbeitbar,
  isPartnerAnfrageWartetAufPreiseinigung,
  partnerAnfrageStatusLabel,
} from "@/lib/partner/partner-anfrage-status";
import {
  buildPartnerAnfragePortalSections,
  PARTNER_LEISTUNGEN_GESAMT_LABEL,
  PARTNER_LEISTUNGEN_SECTION_TITLE,
  partnerDetailDateMetaLine,
  resolvePartnerKonditionZeilen,
} from "@/lib/partner/partner-portal-display";
import {
  fmtPartnerDate,
  partnerDetailStatusPillClass,
} from "@/lib/partner/partner-detail-format";

function anfrageStatusPillClass(item: PartnerAnfrageItem, bearbeitbar: boolean): string {
  if (isPartnerAnfrageAntwortAbgelaufen(item)) return "tag bg-red-100 text-red-700";
  if (isPartnerAnfrageWartetAufPreiseinigung(item)) return "tag bg-blue-100 text-blue-800";
  if (bearbeitbar) return "tag bg-amber-100 text-amber-700";
  return partnerDetailStatusPillClass(item.status);
}

function zeilenGeaendert(
  zeilen: ReturnType<typeof resolvePartnerKonditionZeilen>,
  hwValues: Record<string, string>
): boolean {
  return zeilen.some((z) => {
    const hw = parseHwNettoInput(hwValues[z.id] ?? "");
    if (hw == null) return false;
    if (z.vorschlagNetto == null || z.vorschlagNetto <= 0) return hw > 0;
    return Math.abs(hw - z.vorschlagNetto) > 0.009;
  });
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
  const [confirmSend, setConfirmSend] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [grund, setGrund] = useState<string>(HANDWERKER_ABLEHNUNG_GRUND_VALUES[0]);
  const [notiz, setNotiz] = useState("");

  const bearbeitbar = isPartnerAnfrageKonditionenBearbeitbar(item);
  const wartetAufPreis = isPartnerAnfrageWartetAufPreiseinigung(item);
  const abgelaufen = isPartnerAnfrageAntwortAbgelaufen(item);
  const statusLabel = partnerAnfrageStatusLabel(item);
  const hwSt = (item.hw_status ?? "").toLowerCase();

  const konditionZeilen = useMemo(
    () =>
      resolvePartnerKonditionZeilen(
        item.crm_positionen_raw,
        { gewerkId: item.gewerk_id },
        item.hw_konditionen
      ),
    [item.crm_positionen_raw, item.gewerk_id, item.hw_konditionen]
  );

  const [hwValues, setHwValues] = useState<Record<string, string>>({});

  useEffect(() => {
    setHwValues(initialHwNettoInputs(konditionZeilen, item.hw_konditionen));
  }, [konditionZeilen, item.hw_konditionen]);

  const geaendert = useMemo(
    () => zeilenGeaendert(konditionZeilen, hwValues),
    [konditionZeilen, hwValues]
  );

  const sections = useMemo(
    () =>
      buildPartnerAnfragePortalSections(item.lead, {
        crm_leistungsumfang: item.crm_leistungsumfang,
      }),
    [item.lead, item.crm_leistungsumfang]
  );

  function buildKonditionenJson(): string | null {
    const rows: Array<{ position_id: string; hw_netto: number }> = [];
    for (const z of konditionZeilen) {
      const hw = parseHwNettoInput(hwValues[z.id] ?? "");
      if (hw == null) return null;
      rows.push({ position_id: z.id, hw_netto: hw });
    }
    return JSON.stringify(rows);
  }

  async function sendZusage() {
    const json = buildKonditionenJson();
    if (!json) {
      setError("Bitte für jede Leistung einen gültigen Netto-Preis angeben.");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await respondPartnerAnfrage({
      anfrageId: item.id,
      antwort: "akzeptiert",
      konditionenJson: json,
      notiz: notiz.trim() || undefined,
    });
    setLoading(false);
    setConfirmSend(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (onAccepted) onAccepted(item.id);
    else router.refresh();
  }

  async function sendAblehnung() {
    setLoading(true);
    setError(null);
    const res = await respondPartnerAnfrage({
      anfrageId: item.id,
      antwort: "abgelehnt",
      grund,
      notiz: notiz.trim() || undefined,
    });
    setLoading(false);
    setConfirmReject(false);
    setShowReject(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  const primaryLabel = geaendert ? "Gegenvorschlag senden" : "Konditionen bestätigen";

  const actionFooter =
    bearbeitbar && !showReject ? (
      <PartnerDetailStickyActions
        primaryLabel={primaryLabel}
        onPrimary={() => setConfirmSend(true)}
        primaryLoading={loading}
        secondaryLabel="Ablehnen"
        onSecondary={() => setShowReject(true)}
        secondaryDisabled={loading}
      />
    ) : bearbeitbar && showReject ? (
      <PartnerDetailStickyActions
        primaryLabel="Ablehnung senden"
        onPrimary={() => setConfirmReject(true)}
        primaryLoading={loading}
        secondaryLabel="Zurück"
        onSecondary={() => setShowReject(false)}
        secondaryDisabled={loading}
      />
    ) : null;

  return (
    <PartnerDetailLayout footer={actionFooter ?? undefined}>
      <PartnerDetailHero
        title={item.listen_titel}
        metaLine={partnerDetailDateMetaLine(item.gesendet_at)}
        statusLabel={statusLabel}
        statusPillClass={anfrageStatusPillClass(item, bearbeitbar)}
      />

      {bearbeitbar ? (
        <PartnerDetailInfoBox>
          Prüfe die vorgeschlagenen Konditionen je Leistung. Du kannst die Preise direkt
          anpassen und einen Gegenvorschlag senden — oder unverändert bestätigen. Erst nach
          Preiseinigung mit Bärenwald erscheint das Projekt unter „Angebote“.
        </PartnerDetailInfoBox>
      ) : wartetAufPreis ? (
        <PartnerDetailInfoBox>
          Deine Konditionen wurden an Bärenwald übermittelt. Wir prüfen die Preise —
          sobald die Einigung steht, findest du das Angebot unter „Angebote“.
        </PartnerDetailInfoBox>
      ) : (hwSt === "rueckfrage" || hwSt === "abgelehnt") && item.hw_crm_notiz?.trim() ? (
        <PartnerDetailInfoBox>
          <p className="font-semibold">
            {hwSt === "rueckfrage" ? "Rückfrage von Bärenwald" : "Konditionen nicht übernommen"}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm">{item.hw_crm_notiz.trim()}</p>
        </PartnerDetailInfoBox>
      ) : abgelaufen ? (
        <PartnerDetailInfoBox>
          Die Antwortfrist ist abgelaufen, weil der geplante Projektstart erreicht ist.
        </PartnerDetailInfoBox>
      ) : null}

      <PartnerPortalDetailSections sections={sections} />

      {konditionZeilen.length > 0 ? (
        <PartnerDetailSection title={PARTNER_LEISTUNGEN_SECTION_TITLE}>
          <PartnerLeistungenKonditionenCard
            zeilen={konditionZeilen}
            mode={bearbeitbar ? "edit" : "readonly"}
            hwValues={bearbeitbar ? hwValues : undefined}
            onHwChange={
              bearbeitbar
                ? (id, value) => setHwValues((prev) => ({ ...prev, [id]: value }))
                : undefined
            }
            gesamtLabel={PARTNER_LEISTUNGEN_GESAMT_LABEL}
          />
        </PartnerDetailSection>
      ) : null}

      {bearbeitbar && !showReject ? (
        <label className="block portal-text-body">
          <span className="text-text-tertiary">Notiz (optional)</span>
          <textarea
            value={notiz}
            onChange={(e) => setNotiz(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-xl border border-border-default bg-surface-card px-3 py-2"
          />
        </label>
      ) : null}

      <DokumenteTabelle
        dokumente={[]}
        heading="Dokumente"
        emptyText="Noch keine Dokumente."
        className="!border-t-0 !pt-0"
      />

      {item.antwort_at ? (
        <p className="portal-text-body text-text-secondary">
          Beantwortet am {fmtPartnerDate(item.antwort_at)}
          {item.hw_konditionen?.art === "gegenvorschlag" ? " · Gegenvorschlag" : ""}
          {item.antwort_notiz ? ` — ${item.antwort_notiz}` : ""}
        </p>
      ) : null}

      {error ? <PartnerDetailError message={error} /> : null}

      {showReject && bearbeitbar ? (
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
        </div>
      ) : null}

      <PartnerConfirmDialog
        open={confirmSend}
        title={geaendert ? "Gegenvorschlag senden?" : "Anfrage annehmen?"}
        description={
          geaendert
            ? "Dein Gegenvorschlag je Leistung geht an Bärenwald zur Prüfung. Das Projekt bleibt unter „Anfragen“, bis die Preiseinigung steht."
            : "Du nimmst die vorgeschlagenen Konditionen an. Bärenwald prüft sie — danach erscheint das Angebot unter „Angebote“."
        }
        confirmLabel="Ja, absenden"
        loading={loading}
        onConfirm={sendZusage}
        onCancel={() => setConfirmSend(false)}
      />

      <PartnerConfirmDialog
        open={confirmReject}
        title="Anfrage ablehnen?"
        description="Bärenwald erhält eine E-Mail mit deiner Ablehnung."
        confirmLabel="Ja, ablehnen"
        confirmVariant="danger"
        loading={loading}
        onConfirm={sendAblehnung}
        onCancel={() => setConfirmReject(false)}
      />
    </PartnerDetailLayout>
  );
}
