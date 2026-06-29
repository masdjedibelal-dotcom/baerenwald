"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  confirmPartnerAuftrag,
  declinePartnerAnfrage,
} from "@/app/actions/partner-auftrag-bestaetigen";
import { PartnerPflichtenCard } from "@/components/partner/PartnerPflichtenCard";
import { PartnerProjektvertragPaket } from "@/components/partner/PartnerProjektvertragPaket";
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
import { DokumenteTabelle, type DokumentZeile } from "@/components/shared/DokumenteTabelle";
import type { PartnerOffenAngebotItem } from "@/lib/partner/partner-offen-status";
import { partnerDetailStatusPillClass } from "@/lib/partner/partner-detail-format";
import {
  HANDWERKER_ABLEHNUNG_GRUND_LABELS,
  HANDWERKER_ABLEHNUNG_GRUND_VALUES,
} from "@/lib/partner/handwerker-ablehnung";
import {
  mapKonditionZeilenVereinbart,
  konditionZeilenNurAusHw,
  resolveNachreichungOpenZeilenIds,
} from "@/lib/partner/partner-konditionen";
import { buildPartnerAuftragKonditionZeilen } from "@/lib/partner/partner-leistungen-display";
import {
  partnerOffenStatusLabel,
  partnerOffenStatusPillKey,
} from "@/lib/partner/partner-offen-status";
import {
  buildPartnerAngebotPortalSections,
  PARTNER_LEISTUNGEN_GESAMT_LABEL,
  PARTNER_LEISTUNGEN_SECTION_TITLE,
  partnerDetailDateMetaLine,
  resolvePartnerKonditionZeilen,
} from "@/lib/partner/partner-portal-display";

export function PartnerOffenDetail({
  item,
  onConfirmed,
}: {
  item: PartnerOffenAngebotItem;
  onConfirmed?: (anfrageId: string) => void;
}) {
  const router = useRouter();
  const isNachreichung = item.offen_karten_typ === "nachreichung";
  const [projektvertragBereit, setProjektvertragBereit] = useState(
    isNachreichung && Boolean(item.projektvertrag_bestaetigt_am)
  );
  const [anfrageVerbindlich, setAnfrageVerbindlich] = useState(false);
  const [ergaenzungVerbindlich, setErgaenzungVerbindlich] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [grund, setGrund] = useState<string>(HANDWERKER_ABLEHNUNG_GRUND_VALUES[0]);
  const [notiz, setNotiz] = useState("");
  const hatAuftrag = Boolean(item.auftrag_id);
  const projektvertragBereits = Boolean(item.projektvertrag_bestaetigt_am);

  const statusLabel = partnerOffenStatusLabel(item.offen_karten_typ);
  const statusPillKey = partnerOffenStatusPillKey(item.offen_karten_typ);

  const openPositionIds = useMemo(() => {
    if (!isNachreichung) return null;
    return resolveNachreichungOpenZeilenIds({
      crm_positionen_raw: item.crm_positionen_raw,
      crm_auftrag_positionen: item.crm_auftrag_positionen,
      filter: {
        gewerkId: item.gewerk_id,
        handwerkerId: item.handwerker_id,
        gewerkName: item.gewerk_name,
      },
      hw_konditionen: item.hw_konditionen,
      hw_status: item.hw_status,
      alle_hw_konditionen: item.alle_hw_konditionen,
    });
  }, [isNachreichung, item]);

  const konditionZeilen = useMemo(() => {
    if (isNachreichung && item.crm_auftrag_positionen?.length && openPositionIds) {
      const openSet = new Set(openPositionIds);
      const zeilen = buildPartnerAuftragKonditionZeilen(
        item.crm_auftrag_positionen.filter((p) => openSet.has(p.id))
      );
      return mapKonditionZeilenVereinbart(zeilen);
    }

    if (item.hw_konditionen?.positionen.length) {
      return mapKonditionZeilenVereinbart(konditionZeilenNurAusHw(item.hw_konditionen));
    }

    const zeilen = resolvePartnerKonditionZeilen(
      item.crm_positionen_raw,
      { gewerkId: item.gewerk_id, handwerkerId: item.handwerker_id },
      item.hw_konditionen
    );
    return mapKonditionZeilenVereinbart(zeilen);
  }, [isNachreichung, item, openPositionIds]);

  const sections = useMemo(
    () =>
      buildPartnerAngebotPortalSections(item.lead, {
        crm_leistungsumfang: item.crm_leistungsumfang,
      }),
    [item.lead, item.crm_leistungsumfang]
  );

  const dokumentZeilen = useMemo((): DokumentZeile[] => {
    const rows: DokumentZeile[] = [];
    const pv = item.projektvertrag;
    const pvHref = pv?.pdf_signed_url?.trim() || pv?.pdf_url?.trim();
    if (pvHref) {
      rows.push({
        id: "projektvertrag",
        datum: pv?.signiert_am ?? null,
        name: pv?.vertrags_nr
          ? `Projektvertrag ${pv.vertrags_nr}`
          : "Projektvertrag (Leistungsvertrag)",
        href: pvHref,
      });
    }
    return rows;
  }, [item.projektvertrag]);

  const heroMeta = partnerDetailDateMetaLine(item.gesendet_at ?? item.antwort_at);

  const infoText = useMemo(() => {
    if (!isNachreichung) {
      return hatAuftrag
        ? "Bitte Leistungen und Projektvertrag prüfen — dann annehmen."
        : "Bitte Leistungen prüfen und die Anfrage verbindlich annehmen.";
    }
    const openIds = openPositionIds ?? [];
    const openPos =
      item.crm_auftrag_positionen?.filter((p) => openIds.includes(p.id)) ?? [];
    if (openPos.some((p) => p.aenderung_typ === "entfernt")) {
      return "Bärenwald hat Leistungen angepasst — bitte Änderungen und Entfernungen bestätigen.";
    }
    if (openPos.some((p) => p.aenderung_typ === "geaendert")) {
      return "Bärenwald hat Preise oder Leistungen geändert — bitte prüfen und annehmen.";
    }
    return "Bärenwald hat zusätzliche Leistungen festgelegt — bitte prüfen und annehmen oder ablehnen.";
  }, [isNachreichung, hatAuftrag, openPositionIds, item.crm_auftrag_positionen]);

  const primaryLabel = isNachreichung ? "Ergänzung annehmen" : "Annehmen";

  async function onConfirm() {
    setLoading(true);
    setError(null);
    const gelesen = isNachreichung
      ? ergaenzungVerbindlich || projektvertragBereit
      : hatAuftrag
        ? projektvertragBereit
        : anfrageVerbindlich;
    const verbindlich = gelesen;
    const res = await confirmPartnerAuftrag({
      anfrageId: item.id,
      gelesen,
      verbindlich,
    });
    setLoading(false);
    setConfirmOpen(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (onConfirmed) onConfirmed(item.id);
    else router.refresh();
  }

  async function onDecline() {
    setLoading(true);
    setError(null);
    const res = await declinePartnerAnfrage({
      anfrageId: item.id,
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
    if (onConfirmed) onConfirmed(item.id);
    else router.refresh();
  }

  const kannBestaetigen = isNachreichung
    ? ergaenzungVerbindlich
    : hatAuftrag
      ? projektvertragBereit
      : anfrageVerbindlich;

  const actionFooter =
    !showReject ? (
      <PartnerDetailStickyActions
        primaryLabel={primaryLabel}
        onPrimary={() => setConfirmOpen(true)}
        primaryLoading={loading}
        primaryDisabled={!kannBestaetigen}
        secondaryLabel="Ablehnen"
        onSecondary={() => setShowReject(true)}
        secondaryDisabled={loading}
      />
    ) : (
      <PartnerDetailStickyActions
        primaryLabel="Ablehnung senden"
        onPrimary={() => setConfirmReject(true)}
        primaryLoading={loading}
        secondaryLabel="Zurück"
        onSecondary={() => setShowReject(false)}
        secondaryDisabled={loading}
      />
    );

  return (
    <PartnerDetailLayout footer={actionFooter}>
      <PartnerDetailHero
        title={item.listen_titel}
        metaLine={heroMeta}
        statusLabel={statusLabel}
        statusPillClass={partnerDetailStatusPillClass(statusPillKey)}
      />

      <PartnerDetailInfoBox>{infoText}</PartnerDetailInfoBox>

      <PartnerPortalDetailSections sections={sections} />

      {konditionZeilen.length > 0 ? (
        <PartnerDetailSection
          title={
            isNachreichung ? "Neue Leistungen" : PARTNER_LEISTUNGEN_SECTION_TITLE
          }
        >
          <PartnerLeistungenKonditionenCard
            zeilen={konditionZeilen}
            mode="readonly"
            gesamtLabel={PARTNER_LEISTUNGEN_GESAMT_LABEL}
          />
        </PartnerDetailSection>
      ) : null}

      <PartnerPflichtenCard
        compliance_projekt={item.compliance_projekt}
        ist_bauprojekt={item.ist_bauprojekt}
      />

      {hatAuftrag && !isNachreichung ? (
        <PartnerProjektvertragPaket
          auftragId={item.auftrag_id!}
          gewerkName={item.gewerk_name}
          vertrag={item.projektvertrag ?? null}
          projektvertrag_bestaetigt_am={item.projektvertrag_bestaetigt_am}
          embedded
          onEmbeddedReadyChange={setProjektvertragBereit}
        />
      ) : null}

      {hatAuftrag && isNachreichung && !projektvertragBereits ? (
        <PartnerProjektvertragPaket
          auftragId={item.auftrag_id!}
          gewerkName={item.gewerk_name}
          vertrag={item.projektvertrag ?? null}
          projektvertrag_bestaetigt_am={item.projektvertrag_bestaetigt_am}
          embedded
          onEmbeddedReadyChange={setProjektvertragBereit}
        />
      ) : null}

      {!hatAuftrag && !isNachreichung ? (
        <div className="space-y-3 border-t border-border-default pt-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={anfrageVerbindlich}
              onChange={(e) => setAnfrageVerbindlich(e.target.checked)}
              className="mt-1"
            />
            <span className="portal-text-body text-text-primary">
              Ich nehme diese Anfrage verbindlich an.
            </span>
          </label>
        </div>
      ) : null}

      {isNachreichung ? (
        <label className="flex cursor-pointer items-start gap-3 border-t border-border-default pt-4">
          <input
            type="checkbox"
            checked={ergaenzungVerbindlich}
            onChange={(e) => setErgaenzungVerbindlich(e.target.checked)}
            className="mt-1"
          />
          <span className="portal-text-body text-text-primary">
            Ich nehme die ergänzenden Leistungen verbindlich an.
          </span>
        </label>
      ) : null}

      <DokumenteTabelle
        dokumente={dokumentZeilen}
        heading="Dokumente"
        emptyText="Noch keine Dokumente."
      />

      {showReject ? (
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
        open={confirmOpen}
        title={primaryLabel}
        description={
          isNachreichung
            ? "Mit der Bestätigung nimmst du die ergänzenden Leistungen verbindlich an."
            : hatAuftrag
              ? "Mit der Bestätigung nimmst du den Auftrag verbindlich an."
              : "Mit der Bestätigung nimmst du die Anfrage verbindlich an."
        }
        confirmLabel={primaryLabel}
        onConfirm={onConfirm}
        onCancel={() => setConfirmOpen(false)}
        loading={loading}
      />

      <PartnerConfirmDialog
        open={confirmReject}
        title="Ablehnen?"
        description="Bärenwald wird informiert."
        confirmLabel="Ablehnen"
        confirmVariant="danger"
        onConfirm={onDecline}
        onCancel={() => setConfirmReject(false)}
        loading={loading}
      />
    </PartnerDetailLayout>
  );
}
