"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { respondPartnerAuftragZuweisung } from "@/app/actions/partner-auftrag-anfragen";
import { PartnerLeistungenKonditionenCard } from "@/components/partner/PartnerLeistungenKonditionenCard";
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
import type { PartnerAuftragItem } from "@/lib/partner/get-partner-data";
import { partnerDetailStatusPillClass } from "@/lib/partner/partner-detail-format";
import {
  initialHwNettoInputs,
  initialHwNotizInputs,
  parseHwNettoInput,
  sindKonditionPreiseGeaendert,
} from "@/lib/partner/partner-konditionen";
import {
  isPartnerAuftragAnfrageAntwortAbgelaufen,
  isPartnerAuftragAnfrageOffen,
  isPartnerAuftragWartetAufPreiseinigung,
  partnerAuftragAnfrageStatusLabel,
} from "@/lib/partner/partner-anfrage-status";
import {
  buildPartnerAuftragPortalSections,
  PARTNER_LEISTUNGEN_GESAMT_LABEL,
  PARTNER_LEISTUNGEN_SECTION_TITLE,
  partnerAuftragDetailMetaLine,
  resolvePartnerAuftragKonditionZeilen,
} from "@/lib/partner/partner-portal-display";
import {
  partnerAnfragePortalPath,
  partnerAnfragePortalUrl,
  partnerAngebotPortalPath,
} from "@/lib/partner/partner-site-url";

export function PartnerAuftragAnfrageDetail({
  item,
  onAccepted,
  onWeiterZuAngeboten,
}: {
  item: PartnerAuftragItem;
  onAccepted?: (anfrageId: string) => void;
  onWeiterZuAngeboten?: (angebotHandwerkerId: string) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [confirmAccept, setConfirmAccept] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [grund, setGrund] = useState<string>(HANDWERKER_ABLEHNUNG_GRUND_VALUES[0]);
  const [notiz, setNotiz] = useState("");

  const hwSt = item.hwStatus.toLowerCase();
  const ahSt = (item.angebotHwStatus ?? "").toLowerCase();
  const abgelaufen = isPartnerAuftragAnfrageAntwortAbgelaufen(item);
  const kannAntworten = isPartnerAuftragAnfrageOffen(item);
  const wartetAufPruefung = isPartnerAuftragWartetAufPreiseinigung(item);
  const konditionenUebernommen = ahSt === "uebernommen";
  const konditionenNachreichen =
    hwSt === "akzeptiert" &&
    !item.angebotHwEingereichtAt &&
    ahSt !== "eingereicht" &&
    ahSt !== "uebernommen" &&
    ahSt !== "rueckfrage";
  const bearbeitbar =
    !konditionenUebernommen &&
    !wartetAufPruefung &&
    ahSt !== "rueckfrage" &&
    (kannAntworten || konditionenNachreichen);

  const konditionZeilen = useMemo(
    () => resolvePartnerAuftragKonditionZeilen(item.positionen),
    [item.positionen]
  );

  const [hwValues, setHwValues] = useState<Record<string, string>>({});
  const [hwNotizen, setHwNotizen] = useState<Record<string, string>>({});

  useEffect(() => {
    setHwValues(initialHwNettoInputs(konditionZeilen));
    setHwNotizen(initialHwNotizInputs(konditionZeilen));
  }, [konditionZeilen]);

  useEffect(() => {
    if (!konditionenUebernommen || !item.angebotHandwerkerId) return;
    if (onWeiterZuAngeboten) {
      onWeiterZuAngeboten(item.angebotHandwerkerId);
      return;
    }
    router.replace(partnerAngebotPortalPath(item.angebotHandwerkerId));
  }, [konditionenUebernommen, item.angebotHandwerkerId, onWeiterZuAngeboten, router]);

  const geaendert = useMemo(
    () => sindKonditionPreiseGeaendert(konditionZeilen, hwValues),
    [konditionZeilen, hwValues]
  );

  function buildKonditionenJson(): string | null {
    const rows: Array<{ position_id: string; hw_netto: number; hw_notiz?: string }> = [];
    for (const z of konditionZeilen) {
      const hw = parseHwNettoInput(hwValues[z.id] ?? "");
      if (hw == null) return null;
      const zeilenNotiz = hwNotizen[z.id]?.trim();
      rows.push({
        position_id: z.id,
        hw_netto: hw,
        ...(zeilenNotiz ? { hw_notiz: zeilenNotiz } : {}),
      });
    }
    return JSON.stringify(rows);
  }

  async function sendAntwort(antwort: "akzeptiert" | "abgelehnt") {
    setLoading(true);
    setError(null);

    let konditionenJson: string | undefined;
    if (antwort === "akzeptiert") {
      const json = buildKonditionenJson();
      if (!json) {
        setLoading(false);
        setError("Bitte für jede Leistung einen gültigen Angebotspreis angeben.");
        return;
      }
      konditionenJson = json;
    }

    const res = await respondPartnerAuftragZuweisung({
      auftragId: item.id,
      antwort,
      grund: antwort === "abgelehnt" ? grund : undefined,
      notiz: notiz.trim() || undefined,
      konditionenJson,
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
      if (res.angebotAnfrageId) {
        if (onAccepted) {
          onAccepted(res.angebotAnfrageId);
        } else {
          router.replace(partnerAnfragePortalPath(res.angebotAnfrageId));
          router.refresh();
        }
      } else {
        router.refresh();
      }
      return;
    }
    router.refresh();
  }

  const statusLabel = partnerAuftragAnfrageStatusLabel(item);

  const infoText = abgelaufen
    ? "Die Antwortfrist ist abgelaufen, weil der geplante Projektstart erreicht ist. Eine Annahme oder Ablehnung ist nicht mehr möglich."
    : wartetAufPruefung
      ? "Dein Gegenangebot wurde an Bärenwald übermittelt. Wir prüfen die Preise — du musst vorerst nichts tun."
      : konditionenUebernommen
        ? "Bärenwald hat dein Gegenangebot akzeptiert. Du wirst zu „Angebote“ weitergeleitet — dort siehst du die vereinbarten Preise."
        : konditionenNachreichen
          ? "Du hast zugesagt, die Preise wurden aber noch nicht übermittelt. Bitte unten „Annehmen“ oder „Gegenangebot senden“ erneut ausführen."
          : hwSt === "abgelehnt"
            ? "Du hast diese Zuweisung abgelehnt."
            : "Prüfe die Leistungen und passe bei Bedarf den Angebotspreis an. Mit „Annehmen“ oder „Gegenangebot senden“ schickst du deine Antwort an Bärenwald.";

  const sections = useMemo(
    () => buildPartnerAuftragPortalSections(item.lead),
    [item.lead]
  );

  const primaryLabel = geaendert ? "Gegenangebot senden" : "Annehmen";

  const statusPillClass = abgelaufen
    ? "tag bg-red-100 text-red-700"
    : wartetAufPruefung
      ? "tag bg-blue-100 text-blue-800"
      : partnerDetailStatusPillClass(item.hwStatus);

  const actionFooter =
    bearbeitbar && !showReject ? (
      <PartnerDetailStickyActions
        primaryLabel={primaryLabel}
        onPrimary={() => setConfirmAccept(true)}
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
    ) : undefined;

  return (
    <PartnerDetailLayout footer={actionFooter}>
      <PartnerDetailHero
        title={item.listen_titel}
        metaLine={partnerAuftragDetailMetaLine(item.start_datum, item.end_datum)}
        statusLabel={statusLabel}
        statusPillClass={statusPillClass}
      />

      <PartnerDetailInfoBox>{infoText}</PartnerDetailInfoBox>

      <PartnerPortalDetailSections sections={sections} />

      {konditionZeilen.length > 0 ? (
        <PartnerDetailSection title={PARTNER_LEISTUNGEN_SECTION_TITLE}>
          <PartnerLeistungenKonditionenCard
            zeilen={konditionZeilen}
            mode={bearbeitbar ? "edit" : "readonly"}
            hwValues={bearbeitbar ? hwValues : undefined}
            hwNotizen={bearbeitbar ? hwNotizen : undefined}
            onHwChange={
              bearbeitbar
                ? (id, value) => setHwValues((prev) => ({ ...prev, [id]: value }))
                : undefined
            }
            onHwNotizChange={
              bearbeitbar
                ? (id, value) => setHwNotizen((prev) => ({ ...prev, [id]: value }))
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

      {error ? <PartnerDetailError message={error} /> : null}

      {item.angebotHandwerkerId && ahSt === "rueckfrage" ? (
        <a
          href={partnerAnfragePortalUrl(item.angebotHandwerkerId)}
          className="btn-pill-primary portal-btn inline-flex !px-4 !py-2.5"
        >
          Neue Konditionen prüfen
        </a>
      ) : null}

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
        title={geaendert ? "Gegenangebot senden?" : "Anfrage annehmen?"}
        description={
          geaendert
            ? "Dein Gegenangebot mit den angepassten Preisen geht an Bärenwald zur Prüfung."
            : "Du nimmst die Anfrage mit den vorgeschlagenen Preisen an."
        }
        confirmLabel="Ja, absenden"
        loading={loading}
        onConfirm={() => sendAntwort("akzeptiert")}
        onCancel={() => setConfirmAccept(false)}
      />
      <PartnerConfirmDialog
        open={confirmReject}
        title="Anfrage ablehnen?"
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
