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
import type { PartnerRahmenvertrag } from "@/lib/partner/compliance-summary";
import { partnerDetailStatusPillClass } from "@/lib/partner/partner-detail-format";
import { PartnerProjektvertragPaket } from "@/components/partner/PartnerProjektvertragPaket";
import { PartnerRahmenvertragAcceptBlock } from "@/components/partner/PartnerRahmenvertragAcceptBlock";
import {
  buildKonditionenEingabeFromZeilen,
  positionBrauchtHandwerkerAktion,
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
  rahmenvertrag,
  onAccepted,
  onWeiterZuAngeboten,
}: {
  item: PartnerAuftragItem;
  rahmenvertrag?: PartnerRahmenvertrag | null;
  onAccepted?: (anfrageId: string) => void;
  onWeiterZuAngeboten?: (angebotHandwerkerId: string) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [confirmAccept, setConfirmAccept] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [bedingungenAkzeptiert, setBedingungenAkzeptiert] = useState(false);
  const [projektvertragBereit, setProjektvertragBereit] = useState(true);
  const [grund, setGrund] = useState<string>(HANDWERKER_ABLEHNUNG_GRUND_VALUES[0]);
  const [notiz, setNotiz] = useState("");

  const hwSt = item.hwStatus.toLowerCase();
  const ahSt = (item.angebotHwStatus ?? "").toLowerCase();
  const abgelaufen = isPartnerAuftragAnfrageAntwortAbgelaufen(item);
  const kannAntworten = isPartnerAuftragAnfrageOffen(item);
  const wartetAufPruefung = isPartnerAuftragWartetAufPreiseinigung(item);
  const konditionenUebernommen = ahSt === "uebernommen";
  const konditionenBestaetigen =
    ahSt === "bestaetigt" && Boolean(item.angebotHandwerkerId);
  const konditionenNachreichen =
    hwSt === "akzeptiert" &&
    !item.angebotHwEingereichtAt &&
    ahSt !== "eingereicht" &&
    ahSt !== "bestaetigt" &&
    ahSt !== "uebernommen" &&
    ahSt !== "rueckfrage";
  const bearbeitbar =
    !konditionenUebernommen &&
    !wartetAufPruefung &&
    ahSt !== "rueckfrage" &&
    (kannAntworten || konditionenNachreichen);

  const konditionZeilen = useMemo(
    () =>
      resolvePartnerAuftragKonditionZeilen(
        item.positionen.filter((p) => positionBrauchtHandwerkerAktion(p.handwerker_status))
      ),
    [item.positionen]
  );

  function buildKonditionenJson(): string | null {
    const rows = buildKonditionenEingabeFromZeilen(konditionZeilen);
    if (!rows) return null;
    return JSON.stringify(rows);
  }

  useEffect(() => {
    if (!konditionenUebernommen || !item.angebotHandwerkerId) return;
    if (onWeiterZuAngeboten) {
      onWeiterZuAngeboten(item.angebotHandwerkerId);
      return;
    }
    router.replace(partnerAngebotPortalPath(item.angebotHandwerkerId));
  }, [konditionenUebernommen, item.angebotHandwerkerId, onWeiterZuAngeboten, router]);

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
    ? "Antwortfrist abgelaufen."
    : wartetAufPruefung
      ? "Wird von Bärenwald geprüft."
      : konditionenBestaetigen
        ? "Konditionen in der verknüpften Anfrage bestätigen."
        : konditionenUebernommen
          ? "Unter Angebote optional Unterlagen als PDF hochladen."
        : konditionenNachreichen
          ? "Angebotspreise noch nicht bestätigt — bitte unten annehmen."
          : hwSt === "abgelehnt"
            ? "Zuweisung abgelehnt."
            : "Bärenwald hat die Angebotspreise festgelegt — bitte prüfen und annehmen.";

  const primaryLabel = "Annehmen";

  const kannAnnehmen = bedingungenAkzeptiert && projektvertragBereit;

  const sections = useMemo(
    () => buildPartnerAuftragPortalSections(item.lead),
    [item.lead]
  );

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
        primaryDisabled={!kannAnnehmen}
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

      {bearbeitbar ? (
        <PartnerDetailSection title="Bedingungen">
          <PartnerRahmenvertragAcceptBlock
            pdfUrl={rahmenvertrag?.pdf_signed_url ?? rahmenvertrag?.pdf_url}
            vertragsNr={rahmenvertrag?.vertrags_nr}
            akzeptiert={bedingungenAkzeptiert}
            onAkzeptiertChange={setBedingungenAkzeptiert}
            alreadyAcceptedAt={rahmenvertrag?.portal_akzeptiert_am}
          />
        </PartnerDetailSection>
      ) : null}

      <PartnerProjektvertragPaket
        auftragId={item.id}
        gewerkName={item.positionen[0]?.gewerk_name}
        vertrag={item.vertrag?.projektvertrag ?? null}
        projektvertrag_bestaetigt_am={item.projektvertrag_bestaetigt_am}
        embedded={bearbeitbar}
        onEmbeddedReadyChange={setProjektvertragBereit}
      />

      {konditionZeilen.length > 0 ? (
        <PartnerDetailSection title={PARTNER_LEISTUNGEN_SECTION_TITLE}>
          <PartnerLeistungenKonditionenCard
            zeilen={konditionZeilen}
            mode="readonly"
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

      {item.angebotHandwerkerId && ahSt === "bestaetigt" ? (
        <a
          href={partnerAnfragePortalUrl(item.angebotHandwerkerId)}
          className="btn-pill-primary portal-btn inline-flex !px-4 !py-2.5"
        >
          Konditionen bestätigen
        </a>
      ) : null}

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
        title="Annehmen?"
        description="Du nimmst die von Bärenwald festgelegten Preise an."
        confirmLabel="Annehmen"
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
