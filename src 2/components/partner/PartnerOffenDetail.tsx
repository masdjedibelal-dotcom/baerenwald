"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  confirmPartnerAuftrag,
  declinePartnerAnfrage,
} from "@/app/actions/partner-auftrag-bestaetigen";
import { VorgangDetailBlocks } from "@/components/shared/vorgang-detail";
import { buildPartnerVorgangDetailVm } from "@/lib/vorgang/build-vorgang-detail-vm";
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
import { PartnerHwKalkulationScreen } from "@/components/partner/PartnerHwKalkulationScreen";
import { PartnerDokumentPreviewModal } from "@/components/partner/PartnerDokumentPreviewModal";
import { DokumenteTabelle, type DokumentZeile } from "@/components/shared/DokumenteTabelle";
import type { PartnerOffenAngebotItem } from "@/lib/partner/partner-offen-status";
import { resolvePartnerDetailTitelFromAnfrage } from "@/lib/partner/partner-listen-titel";
import {
  partnerDetailStatusPillClass,
  partnerDetailStatusPillStyle,
} from "@/lib/partner/partner-detail-format";
import { partnerPortalToast, portalToastError } from "@/lib/shared/portal-toast";
import {
  HANDWERKER_ABLEHNUNG_GRUND_LABELS,
  HANDWERKER_ABLEHNUNG_GRUND_VALUES,
} from "@/lib/partner/handwerker-ablehnung";
import {
  buildNachreichungKonditionZeilen,
  konditionZeilenNurAusHw,
  mapKonditionZeilenVereinbart,
  positionBrauchtVorgangAktion,
  resolveNachreichungOpenZeilenIds,
} from "@/lib/partner/partner-konditionen";
import { buildPartnerAuftragKonditionZeilen } from "@/lib/partner/partner-leistungen-display";
import { isPartnerBauprojektAuftrag } from "@/lib/partner/compliance-summary";
import { sortPartnerDokumentZeilen } from "@/lib/partner/partner-auftrag-dokumente";
import {
  partnerOffenStatusLabel,
  partnerOffenStatusPillKey,
} from "@/lib/partner/partner-offen-status";
import {
  vorgangStateLabel,
  vorgangStatePillKey,
  type VorgangState,
} from "@/lib/partner/vorgang-state";
import {
  PARTNER_LEISTUNGEN_GESAMT_LABEL,
  PARTNER_LEISTUNGEN_SECTION_TITLE,
  partnerDetailDateMetaLine,
  resolvePartnerKonditionZeilen,
} from "@/lib/partner/partner-portal-display";

export function PartnerOffenDetail({
  item,
  vorgangState,
  onConfirmed,
}: {
  item: PartnerOffenAngebotItem;
  vorgangState?: VorgangState;
  onConfirmed?: (anfrageId: string) => void;
}) {
  const router = useRouter();
  const isNachreichung = item.offen_karten_typ === "nachreichung";
  const [projektvertragBereit, setProjektvertragBereit] = useState(
    Boolean(item.projektvertrag_bestaetigt_am)
  );
  const [pflichtenGelesen, setPflichtenGelesen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [grund, setGrund] = useState<string>(HANDWERKER_ABLEHNUNG_GRUND_VALUES[0]);
  const [notiz, setNotiz] = useState("");
  const [showKalkulation, setShowKalkulation] = useState(false);
  const [angebotDocOpen, setAngebotDocOpen] = useState(false);
  const hatAuftrag = Boolean(item.auftrag_id);
  const istBauprojekt = isPartnerBauprojektAuftrag({
    ist_bauprojekt: item.ist_bauprojekt,
    compliance_projekt: item.compliance_projekt,
  });
  const brauchtProjektvertrag = hatAuftrag && !isNachreichung && istBauprojekt;

  const statusLabel = vorgangState
    ? vorgangStateLabel(vorgangState)
    : partnerOffenStatusLabel(item.offen_karten_typ);
  const statusPillKey = vorgangState
    ? vorgangStatePillKey(vorgangState)
    : partnerOffenStatusPillKey(item.offen_karten_typ);

  const openPositionIds = useMemo(() => {
    if (!isNachreichung) return null;
    if (item.nachreichung_open_position_ids?.length) {
      return item.nachreichung_open_position_ids;
    }
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
    if (isNachreichung && openPositionIds?.length) {
      const openSet = new Set(openPositionIds);

      const ausAuftrag = (item.crm_auftrag_positionen ?? []).filter((p) =>
        openSet.has(p.id)
      );
      if (ausAuftrag.length) {
        return buildPartnerAuftragKonditionZeilen(ausAuftrag).map((z) => ({
          ...z,
          zeilenBadge: z.zeilenBadge ?? "neu",
        }));
      }

      const ausCrm = buildNachreichungKonditionZeilen(
        item.crm_positionen_raw,
        item.crm_auftrag_positionen,
        {
          gewerkId: item.gewerk_id,
          handwerkerId: item.handwerker_id,
          gewerkName: item.gewerk_name,
        }
      ).filter((z) => openSet.has(z.id));
      if (ausCrm.length) {
        return ausCrm.map((z) => ({
          ...z,
          zeilenBadge: z.zeilenBadge ?? "neu",
        }));
      }

      const offenAusDb = (item.crm_auftrag_positionen ?? []).filter((p) =>
        positionBrauchtVorgangAktion(p)
      );
      if (offenAusDb.length) {
        return buildPartnerAuftragKonditionZeilen(offenAusDb).map((z) => ({
          ...z,
          zeilenBadge: z.zeilenBadge ?? "neu",
        }));
      }
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

  const dokumentZeilen = useMemo((): DokumentZeile[] => {
    const rows: DokumentZeile[] = [];
    const pv = item.projektvertrag;
    const pvHref = pv?.pdf_signed_url?.trim() || pv?.pdf_url?.trim();
    if (brauchtProjektvertrag && pvHref) {
      rows.push({
        id: "projektvertrag",
        datum: pv?.signiert_am ?? null,
        name: pv?.vertrags_nr
          ? `Projektvertrag ${pv.vertrags_nr}`
          : "Projektvertrag (Leistungsvertrag)",
        href: pvHref,
      });
    }
    return sortPartnerDokumentZeilen(rows);
  }, [item.projektvertrag, brauchtProjektvertrag]);

  const heroMeta = partnerDetailDateMetaLine(item.gesendet_at ?? item.antwort_at);

  const infoText = useMemo(() => {
    if (!isNachreichung) {
      return hatAuftrag
        ? brauchtProjektvertrag
          ? "Prüfe die Pflichten, Leistungen und den Projektvertrag. Mit „Annehmen“ bestätigst du den Auftrag verbindlich."
          : "Prüfe die Leistungen und Konditionen. Mit „Annehmen“ nimmst du den Auftrag verbindlich an."
        : "Prüfe die Leistungen und Konditionen. Mit „Annehmen“ nimmst du die Zuweisung verbindlich an.";
    }
    const openIds = openPositionIds ?? [];
    const openPos =
      item.crm_auftrag_positionen?.filter((p) => openIds.includes(p.id)) ?? [];
    if (openPos.some((p) => p.aenderung_typ === "entfernt")) {
      return "Bärenwald hat Leistungen entfernt — bitte die Änderungen prüfen und bestätigen.";
    }
    if (openPos.some((p) => p.aenderung_typ === "geaendert")) {
      return "Bärenwald hat Leistungen oder Preise angepasst — bitte prüfen und bestätigen.";
    }
    return "Bärenwald hat Leistungen angepasst — markierte Zeilen unten prüfen und bestätigen.";
  }, [isNachreichung, hatAuftrag, brauchtProjektvertrag, openPositionIds, item.crm_auftrag_positionen]);

  const primaryLabel = isNachreichung ? "Änderungen bestätigen" : "Annehmen";

  async function onConfirm() {
    setLoading(true);
    setError(null);
    const gelesen = isNachreichung
      ? pflichtenGelesen
      : brauchtProjektvertrag
        ? pflichtenGelesen && projektvertragBereit
        : pflichtenGelesen;
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
      portalToastError("Annahme fehlgeschlagen", res.error);
      return;
    }
    if (isNachreichung) {
      partnerPortalToast.aenderungenBestaetigt();
      if (onConfirmed) onConfirmed(item.id);
      else router.refresh();
      return;
    }
    if (hatAuftrag) {
      partnerPortalToast.auftragAngenommen();
    } else {
      partnerPortalToast.zuweisungAngenommen();
    }
    setAngebotDocOpen(true);
  }

  function continueAfterAngebotDoc() {
    setAngebotDocOpen(false);
    setShowKalkulation(true);
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
    partnerPortalToast.abgelehnt();
    if (onConfirmed) onConfirmed(item.id);
    else router.refresh();
  }

  const kannBestaetigen = isNachreichung
    ? pflichtenGelesen
    : brauchtProjektvertrag
      ? pflichtenGelesen && projektvertragBereit
      : pflichtenGelesen;

  const actionFooter =
    showKalkulation ? null : !showReject ? (
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

  function finishAfterKalk() {
    if (onConfirmed) onConfirmed(item.id);
    else router.refresh();
  }

  if (showKalkulation) {
    return (
      <PartnerDetailLayout footer={null}>
        <PartnerDetailHero
          title={resolvePartnerDetailTitelFromAnfrage(item)}
          metaLine={heroMeta}
          statusLabel="Angenommen"
          statusPillClass={partnerDetailStatusPillClass("angenommen")}
          statusPillStyle={partnerDetailStatusPillStyle("angenommen")}
        />
        <PartnerDetailInfoBox>
          Als Nächstes: Kalkulation einreichen — Positionen und Summe erscheinen
          im CRM und bei der Verwaltung als empfohlenes Angebot.
        </PartnerDetailInfoBox>
        <PartnerHwKalkulationScreen
          anfrageId={item.id}
          onDone={finishAfterKalk}
          onCancel={finishAfterKalk}
        />
      </PartnerDetailLayout>
    );
  }

  return (
    <PartnerDetailLayout footer={actionFooter}>
      <PartnerDetailHero
        title={resolvePartnerDetailTitelFromAnfrage(item)}
        metaLine={heroMeta}
        statusLabel={statusLabel}
        statusPillClass={partnerDetailStatusPillClass(statusPillKey)}
        statusPillStyle={partnerDetailStatusPillStyle(statusPillKey)}
      />

      <VorgangDetailBlocks
        vm={buildPartnerVorgangDetailVm({
          idLabel: item.id.slice(0, 8).toUpperCase(),
          titel: resolvePartnerDetailTitelFromAnfrage(item),
          statusLabel,
          lead: item.lead,
          plz: item.plz,
          ort: item.ort,
          zeitraum: item.zeitraum,
          gewerkName: item.gewerk_name,
          aufgabeNotiz: item.aufgabe_notiz,
          konditionZeilen,
        })}
      />

      <PartnerDetailInfoBox>{infoText}</PartnerDetailInfoBox>

      {isNachreichung && konditionZeilen.length === 0 ? (
        <PartnerDetailInfoBox>
          Bärenwald hat Leistungen an diesem Auftrag angepasst. Die Details konnten
          gerade nicht geladen werden — bitte Seite neu laden. Bei anhaltendem
          Problem melde dich bei Bärenwald.
        </PartnerDetailInfoBox>
      ) : null}

      {konditionZeilen.length > 0 ? (
        <PartnerDetailSection
          title={
            isNachreichung ? "Geänderte Leistungen" : PARTNER_LEISTUNGEN_SECTION_TITLE
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
        compliance_stamm={item.compliance_stamm}
        compliance_projekt={item.compliance_projekt}
        compliance_bauauftrag={item.compliance_bauauftrag}
        ist_bauprojekt={item.ist_bauprojekt}
        auftragId={item.auftrag_id}
        includeProjektvertrag={brauchtProjektvertrag}
        acknowledgment={{
          checked: pflichtenGelesen,
          onChange: setPflichtenGelesen,
        }}
      />

      {brauchtProjektvertrag ? (
        <PartnerProjektvertragPaket
          auftragId={item.auftrag_id!}
          gewerkName={item.gewerk_name}
          vertrag={item.projektvertrag ?? null}
          projektvertrag_bestaetigt_am={item.projektvertrag_bestaetigt_am}
          embedded
          onEmbeddedReadyChange={setProjektvertragBereit}
        />
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
            ? "Mit der Bestätigung nimmst du die geänderten Leistungen verbindlich an (stille Aktualisierung — kein neuer Projektvertrag)."
            : brauchtProjektvertrag
              ? "Mit der Bestätigung nimmst du den Auftrag inkl. Projektvertrag verbindlich an."
              : hatAuftrag
                ? "Mit der Bestätigung nimmst du Leistungen und Konditionen verbindlich an."
                : "Mit der Bestätigung nimmst du die Zuweisung verbindlich an."
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

      <PartnerDokumentPreviewModal
        open={angebotDocOpen}
        anfrageId={item.id}
        art="angebot"
        onClose={continueAfterAngebotDoc}
        onSuccess={continueAfterAngebotDoc}
        allowSkip
      />
    </PartnerDetailLayout>
  );
}
