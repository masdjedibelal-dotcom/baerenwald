"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  confirmPartnerAuftragZuweisung,
  declinePartnerAuftragZuweisung,
} from "@/app/actions/partner-auftrag-bestaetigen";
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
import { partnerPortalToast } from "@/lib/shared/portal-toast";
import type { PartnerAuftragItem } from "@/lib/partner/get-partner-data";
import { resolvePartnerDetailTitelFromAuftrag } from "@/lib/partner/partner-listen-titel";
import { partnerDetailStatusPillClass } from "@/lib/partner/partner-detail-format";
import { PartnerPflichtenCard } from "@/components/partner/PartnerPflichtenCard";
import { PartnerProjektvertragPaket } from "@/components/partner/PartnerProjektvertragPaket";
import { positionBrauchtHandwerkerAktion } from "@/lib/partner/partner-konditionen";
import {
  isPartnerAuftragAnfrageOffen,
  partnerAuftragAnfrageStatusLabel,
} from "@/lib/partner/partner-anfrage-status";
import { isPartnerBauprojektAuftrag } from "@/lib/partner/compliance-summary";
import {
  buildPartnerAuftragPortalSections,
  PARTNER_LEISTUNGEN_GESAMT_LABEL,
  PARTNER_LEISTUNGEN_SECTION_TITLE,
  partnerAuftragDetailMetaLine,
  resolvePartnerAuftragKonditionZeilen,
} from "@/lib/partner/partner-portal-display";

export function PartnerAuftragAnfrageDetail({
  item,
  onAccepted,
}: {
  item: PartnerAuftragItem;
  onAccepted?: (anfrageId: string) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [confirmAccept, setConfirmAccept] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [projektvertragBereit, setProjektvertragBereit] = useState(false);
  const [pflichtenGelesen, setPflichtenGelesen] = useState(false);
  const [grund, setGrund] = useState<string>(HANDWERKER_ABLEHNUNG_GRUND_VALUES[0]);
  const [notiz, setNotiz] = useState("");

  const bearbeitbar = isPartnerAuftragAnfrageOffen(item);
  const istBauprojekt = isPartnerBauprojektAuftrag({
    ist_bauprojekt: item.vertrag?.ist_bauprojekt,
    compliance_projekt: item.vertrag?.compliance_projekt,
  });
  const brauchtProjektvertrag = bearbeitbar && istBauprojekt;

  const konditionZeilen = useMemo(
    () =>
      resolvePartnerAuftragKonditionZeilen(
        item.positionen.filter((p) => positionBrauchtHandwerkerAktion(p))
      ),
    [item.positionen]
  );

  async function onAccept() {
    setLoading(true);
    setError(null);
    const res = await confirmPartnerAuftragZuweisung({
      auftragId: item.id,
      gelesen: pflichtenGelesen,
      verbindlich: pflichtenGelesen,
    });
    setLoading(false);
    setConfirmAccept(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    partnerPortalToast.auftragAngenommen();
    if (onAccepted) onAccepted(item.id);
    else router.refresh();
  }

  async function onDecline() {
    setLoading(true);
    setError(null);
    const res = await declinePartnerAuftragZuweisung({
      auftragId: item.id,
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
    partnerPortalToast.abgelehnt();
    if (onAccepted) onAccepted(item.id);
    else router.refresh();
  }

  const statusLabel = partnerAuftragAnfrageStatusLabel(item);

  const infoText =
    "Prüfe die Leistungen und den Projektvertrag. Mit „Annehmen“ bestätigst du den Auftrag verbindlich.";

  const sections = useMemo(
    () => buildPartnerAuftragPortalSections(item.lead),
    [item.lead]
  );

  const statusPillClass = partnerDetailStatusPillClass("neu");

  const actionFooter =
    bearbeitbar && !showReject ? (
      <PartnerDetailStickyActions
        primaryLabel="Annehmen"
        onPrimary={() => setConfirmAccept(true)}
        primaryLoading={loading}
        primaryDisabled={!pflichtenGelesen || (brauchtProjektvertrag && !projektvertragBereit)}
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
        title={resolvePartnerDetailTitelFromAuftrag(item)}
        metaLine={partnerAuftragDetailMetaLine(item.start_datum, item.end_datum)}
        statusLabel={statusLabel}
        statusPillClass={statusPillClass}
      />

      <PartnerDetailInfoBox>{infoText}</PartnerDetailInfoBox>

      <PartnerPortalDetailSections sections={sections} />

      <PartnerPflichtenCard
        compliance_stamm={item.vertrag?.compliance_stamm}
        compliance_projekt={item.vertrag?.compliance_projekt}
        compliance_bauauftrag={item.vertrag?.compliance_bauauftrag}
        ist_bauprojekt={item.vertrag?.ist_bauprojekt}
        auftragId={item.id}
        includeProjektvertrag={brauchtProjektvertrag}
        acknowledgment={{
          checked: pflichtenGelesen,
          onChange: setPflichtenGelesen,
        }}
      />

      {brauchtProjektvertrag ? (
        <PartnerProjektvertragPaket
          auftragId={item.id}
          gewerkName={item.positionen[0]?.gewerk_name}
          vertrag={item.vertrag?.projektvertrag ?? null}
          projektvertrag_bestaetigt_am={item.projektvertrag_bestaetigt_am}
          embedded={bearbeitbar}
          onEmbeddedReadyChange={setProjektvertragBereit}
        />
      ) : null}

      {konditionZeilen.length > 0 ? (
        <PartnerDetailSection title={PARTNER_LEISTUNGEN_SECTION_TITLE}>
          <PartnerLeistungenKonditionenCard
            zeilen={konditionZeilen}
            mode="readonly"
            gesamtLabel={PARTNER_LEISTUNGEN_GESAMT_LABEL}
          />
        </PartnerDetailSection>
      ) : null}

      {bearbeitbar && showReject ? (
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

      {error ? <PartnerDetailError message={error} /> : null}

      <PartnerConfirmDialog
        open={confirmAccept}
        title="Annehmen?"
        description={
          brauchtProjektvertrag
            ? "Du nimmst Leistungen und Projektvertrag verbindlich an."
            : "Du nimmst Leistungen und Konditionen verbindlich an."
        }
        confirmLabel="Annehmen"
        loading={loading}
        onConfirm={onAccept}
        onCancel={() => setConfirmAccept(false)}
      />
      <PartnerConfirmDialog
        open={confirmReject}
        title="Zuweisung ablehnen?"
        description="Bärenwald wird informiert."
        confirmLabel="Ablehnen"
        confirmVariant="danger"
        loading={loading}
        onConfirm={onDecline}
        onCancel={() => setConfirmReject(false)}
      />
    </PartnerDetailLayout>
  );
}
