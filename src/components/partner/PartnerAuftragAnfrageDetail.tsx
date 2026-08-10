"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  confirmPartnerAuftragZuweisung,
  declinePartnerAuftragZuweisung,
} from "@/app/actions/partner-auftrag-bestaetigen";
import { usePortalBusy } from "@/components/shared/PortalBusyContext";
import { usePortalRefresh } from "@/components/shared/usePortalRefresh";
import { VorgangDetailBlocks } from "@/components/shared/vorgang-detail";
import { buildPartnerVorgangDetailVm } from "@/lib/vorgang/build-vorgang-detail-vm";
import { PartnerLeistungenKonditionenCard } from "@/components/partner/PartnerLeistungenKonditionenCard";
import {
  PartnerConfirmDialog,
  PartnerDetailError,
  PartnerDetailLayout,
  PartnerDetailSection,
  PartnerDetailStickyActions,
} from "@/components/partner/PartnerDetailUi";
import { PortalEntityDetailLayout } from "@/components/shared/PortalEntityDetailLayout";
import {
  HANDWERKER_ABLEHNUNG_GRUND_LABELS,
  HANDWERKER_ABLEHNUNG_GRUND_VALUES,
} from "@/lib/partner/handwerker-ablehnung";
import { partnerPortalToast } from "@/lib/shared/portal-toast";
import type { PartnerAuftragItem } from "@/lib/partner/get-partner-data";
import { resolvePartnerDetailTitelFromAuftrag } from "@/lib/partner/partner-listen-titel";
import {
  partnerDetailStatusPillClass,
  partnerDetailStatusPillStyle,
} from "@/lib/partner/partner-detail-format";
import { PartnerPflichtenCard } from "@/components/partner/PartnerPflichtenCard";
import { PartnerProjektvertragPaket } from "@/components/partner/PartnerProjektvertragPaket";
import { PartnerFirmendatenFehlenDialog } from "@/components/partner/PartnerFirmendatenFehlenDialog";
import { positionBrauchtHandwerkerAktion } from "@/lib/partner/partner-konditionen";
import { tryCreatePartnerAutoAngebot } from "@/lib/partner/try-partner-auto-angebot";
import {
  isPartnerAuftragAnfrageOffen,
  partnerAuftragAnfrageStatusLabel,
} from "@/lib/partner/partner-anfrage-status";
import { isPartnerBauprojektAuftrag } from "@/lib/partner/compliance-summary";
import {
  PARTNER_LEISTUNGEN_GESAMT_LABEL,
  PARTNER_LEISTUNGEN_SECTION_TITLE,
  partnerDetailOrtMetaLine,
  resolvePartnerAuftragKonditionZeilen,
} from "@/lib/partner/partner-portal-display";

export function PartnerAuftragAnfrageDetail({
  item,
  onAccepted,
  onBack,
}: {
  item: PartnerAuftragItem;
  onAccepted?: (anfrageId: string) => void;
  onBack?: () => void;
}) {
  const router = useRouter();
  const { refresh } = usePortalRefresh();
  const { runBusy } = usePortalBusy();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [confirmAccept, setConfirmAccept] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [projektvertragBereit, setProjektvertragBereit] = useState(false);
  const [pflichtenGelesen, setPflichtenGelesen] = useState(false);
  const [grund, setGrund] = useState<string>(HANDWERKER_ABLEHNUNG_GRUND_VALUES[0]);
  const [notiz, setNotiz] = useState("");
  const [firmendatenFehlenOpen, setFirmendatenFehlenOpen] = useState(false);
  const [firmendatenMissing, setFirmendatenMissing] = useState<string[]>([]);

  const bearbeitbar = isPartnerAuftragAnfrageOffen(item);
  const istBauprojekt = isPartnerBauprojektAuftrag({
    ist_bauprojekt: item.vertrag?.ist_bauprojekt,
    compliance_projekt: item.vertrag?.compliance_projekt,
  });
  const brauchtProjektvertrag = bearbeitbar && istBauprojekt;

  const konditionZeilen = useMemo(() => {
    const fuerAnnahme = !item.handwerker_bestaetigt_at?.trim();
    const ziel = fuerAnnahme
      ? item.positionen.filter(
          (p) =>
            Boolean(p.handwerker_id?.trim()) ||
            Boolean((p.handwerker_status ?? "").trim()) ||
            positionBrauchtHandwerkerAktion(p)
        )
      : item.positionen.filter((p) => positionBrauchtHandwerkerAktion(p));
    return resolvePartnerAuftragKonditionZeilen(
      ziel.length ? ziel : item.positionen
    );
  }, [item.handwerker_bestaetigt_at, item.positionen]);

  async function onAccept() {
    setLoading(true);
    setError(null);
    try {
      await runBusy(async () => {
        const res = await confirmPartnerAuftragZuweisung({
          auftragId: item.id,
          gelesen: pflichtenGelesen,
          verbindlich: pflichtenGelesen,
        });
        setConfirmAccept(false);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        partnerPortalToast.auftragAngenommen();

        const anfrageId = item.angebotHandwerkerId?.trim();
        if (anfrageId) {
          const auto = await tryCreatePartnerAutoAngebot(anfrageId);
          if (auto.status === "created") {
            partnerPortalToast.unterlagenHochgeladen();
          } else if (auto.status === "firmendaten_missing") {
            setFirmendatenMissing(auto.missing);
            setFirmendatenFehlenOpen(true);
            return;
          }
        }

        if (onAccepted) onAccepted(item.id);
        else await refresh();
      });
    } finally {
      setLoading(false);
    }
  }

  function finishAfterFirmendatenHinweis() {
    setFirmendatenFehlenOpen(false);
    if (onAccepted) onAccepted(item.id);
    else void refresh();
  }

  async function onDecline() {
    setLoading(true);
    setError(null);
    try {
      await runBusy(async () => {
        const res = await declinePartnerAuftragZuweisung({
          auftragId: item.id,
          grund,
          notiz: notiz.trim() || undefined,
        });
        setConfirmReject(false);
        setShowReject(false);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        partnerPortalToast.abgelehnt();
        if (onAccepted) onAccepted(item.id);
        else await refresh();
      });
    } finally {
      setLoading(false);
    }
  }

  const statusLabel = partnerAuftragAnfrageStatusLabel(item);

  const statusPillClass = partnerDetailStatusPillClass("neu");
  const statusPillStyle = partnerDetailStatusPillStyle("neu");

  const kannBestaetigen =
    pflichtenGelesen && (!brauchtProjektvertrag || projektvertragBereit);

  const acceptDisabledHint = !kannBestaetigen
    ? !pflichtenGelesen
      ? "Bitte die Pflichten bestätigen."
      : brauchtProjektvertrag && !projektvertragBereit
        ? "Bitte den Projektvertrag bestätigen."
        : null
    : null;

  const actionFooter =
    bearbeitbar && !showReject ? (
      <PartnerDetailStickyActions
        primaryLabel="Annehmen"
        onPrimary={() => setConfirmAccept(true)}
        primaryLoading={loading}
        primaryDisabled={!kannBestaetigen}
        disabledHint={acceptDisabledHint}
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
      <PortalEntityDetailLayout
        onBack={onBack ?? (() => router.back())}
        backLabel="← Zurück"
        title={resolvePartnerDetailTitelFromAuftrag(item)}
        metaLine={partnerDetailOrtMetaLine(item.lead)}
        statusLabel={statusLabel}
        statusPillClass={statusPillClass}
        statusPillStyle={statusPillStyle}
      >
        <div className="space-y-5">
      <VorgangDetailBlocks
        vm={buildPartnerVorgangDetailVm({
          idLabel: item.id.slice(0, 8).toUpperCase(),
          titel: resolvePartnerDetailTitelFromAuftrag(item),
          statusLabel,
          lead: item.lead,
          plz: item.plz,
          ort: item.ort,
          gewerkName: item.positionen?.[0]?.gewerk_name ?? null,
          konditionZeilen,
          startDatum: item.start_datum,
          endDatum: item.end_datum,
        })}
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

      {bearbeitbar && !showReject ? (
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
      ) : null}

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
        cancelLabel="Weiter bearbeiten"
        loading={loading}
        onConfirm={onDecline}
        onCancel={() => setConfirmReject(false)}
      />

      <PartnerFirmendatenFehlenDialog
        open={firmendatenFehlenOpen}
        missing={firmendatenMissing}
        onDismiss={finishAfterFirmendatenHinweis}
        onGoSettings={() => {
          setFirmendatenFehlenOpen(false);
          void refresh();
        }}
      />
        </div>
      </PortalEntityDetailLayout>
    </PartnerDetailLayout>
  );
}
