"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { confirmPartnerAuftrag } from "@/app/actions/partner-auftrag-bestaetigen";
import { PartnerPflichtenCard } from "@/components/partner/PartnerPflichtenCard";
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
  mapKonditionZeilenVereinbart,
  konditionZeilenNurAusHw,
} from "@/lib/partner/partner-konditionen";
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
import {
  partnerKonditionenNachreichungZeilenIds,
} from "@/lib/partner/partner-konditionen";

export function PartnerOffenDetail({
  item,
  onConfirmed,
}: {
  item: PartnerOffenAngebotItem;
  onConfirmed?: (anfrageId: string) => void;
}) {
  const router = useRouter();
  const [gelesen, setGelesen] = useState(false);
  const [verbindlich, setVerbindlich] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const typ = item.offen_karten_typ;
  const statusLabel = partnerOffenStatusLabel(typ);
  const statusPillKey = partnerOffenStatusPillKey(typ);

  const konditionZeilen = useMemo(() => {
    if (typ === "nachreichung" || typ === "geaendert") {
      const openIds = partnerKonditionenNachreichungZeilenIds(
        item.crm_positionen_raw,
        {
          gewerkId: item.gewerk_id,
          handwerkerId: item.handwerker_id,
          gewerkName: item.gewerk_name,
        },
        item.hw_konditionen,
        item.hw_status,
        item.crm_auftrag_positionen
      );
      if (openIds.length) {
        return resolvePartnerKonditionZeilen(
          item.crm_positionen_raw,
          {
            gewerkId: item.gewerk_id,
            handwerkerId: item.handwerker_id,
            gewerkName: item.gewerk_name,
          },
          item.hw_konditionen,
          { nachreichungOpenIds: openIds, auftragPositionen: item.crm_auftrag_positionen }
        );
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
  }, [item, typ]);

  const vereinbarteZeilen = useMemo(() => {
    if (typ !== "nachreichung" && typ !== "geaendert") return [];
    return konditionZeilen.filter((z) => z.readonly);
  }, [konditionZeilen, typ]);

  const aktiveZeilen = useMemo(() => {
    if (typ === "nachreichung" || typ === "geaendert") {
      return konditionZeilen.filter((z) => !z.readonly);
    }
    return konditionZeilen;
  }, [konditionZeilen, typ]);

  const sections = useMemo(
    () =>
      buildPartnerAngebotPortalSections(item.lead, {
        crm_leistungsumfang: item.crm_leistungsumfang,
      }),
    [item.lead, item.crm_leistungsumfang]
  );

  const dokumentZeilen = useMemo((): DokumentZeile[] => {
    const rows: DokumentZeile[] = [];
    const rv = item.rahmenvertrag;
    const rvHref = rv?.pdf_signed_url?.trim() || rv?.pdf_url?.trim();
    if (rvHref) {
      rows.push({
        id: "rahmenvertrag",
        datum: rv?.signiert_am ?? rv?.portal_akzeptiert_am,
        name: "Partnerschafts-Rahmenvertrag",
        href: rvHref,
      });
    }
    return rows;
  }, [item.rahmenvertrag]);

  const heroMeta =
    typ === "nachreichung"
      ? `Ergänzung zum Auftrag · ${partnerDetailDateMetaLine(item.gesendet_at) ?? ""}`.trim()
      : partnerDetailDateMetaLine(item.gesendet_at ?? item.antwort_at);

  const infoText =
    typ === "nachreichung"
      ? "Neue Leistung zum laufenden Auftrag — bitte prüfen und unten bestätigen."
      : typ === "geaendert"
        ? "Bärenwald hat eine Leistung angepasst — bitte Änderung prüfen und bestätigen."
        : "Bitte Leistungen, Rahmenvertrag und Unterlagen prüfen — dann Auftrag annehmen.";

  const primaryLabel =
    typ === "geaendert" ? "Bestätigen" : typ === "nachreichung" ? "Annehmen" : "Auftrag annehmen";

  async function onConfirm() {
    setLoading(true);
    setError(null);
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

  const kannBestaetigen = gelesen && verbindlich;

  const actionFooter = (
    <PartnerDetailStickyActions
      primaryLabel={primaryLabel}
      onPrimary={() => setConfirmOpen(true)}
      primaryLoading={loading}
      primaryDisabled={!kannBestaetigen}
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

      {vereinbarteZeilen.length > 0 ? (
        <PartnerDetailSection title="Bereits angenommen">
          <PartnerLeistungenKonditionenCard
            zeilen={vereinbarteZeilen}
            mode="readonly"
            gesamtLabel="Vergütung angenommen (netto)"
          />
        </PartnerDetailSection>
      ) : null}

      {aktiveZeilen.length > 0 ? (
        <PartnerDetailSection
          title={
            typ === "nachreichung"
              ? "Neue Leistung"
              : typ === "geaendert"
                ? "Geänderte Leistung"
                : PARTNER_LEISTUNGEN_SECTION_TITLE
          }
        >
          <PartnerLeistungenKonditionenCard
            zeilen={aktiveZeilen}
            mode="readonly"
            gesamtLabel={PARTNER_LEISTUNGEN_GESAMT_LABEL}
          />
        </PartnerDetailSection>
      ) : null}

      <PartnerPflichtenCard compliance_projekt={item.compliance_projekt} />

      <DokumenteTabelle
        dokumente={dokumentZeilen}
        heading="Dokumente"
        emptyText="Noch keine Dokumente."
      />

      <div className="space-y-3 border-t border-border-default pt-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={gelesen}
            onChange={(e) => setGelesen(e.target.checked)}
            className="mt-1"
          />
          <span className="portal-text-body text-text-primary">
            Ich habe den Partnerschafts-Rahmenvertrag gelesen.
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={verbindlich}
            onChange={(e) => setVerbindlich(e.target.checked)}
            className="mt-1"
          />
          <span className="portal-text-body text-text-primary">
            Ich nehme den Auftrag verbindlich an.
          </span>
        </label>
      </div>

      {error ? <PartnerDetailError message={error} /> : null}

      <PartnerConfirmDialog
        open={confirmOpen}
        title={primaryLabel}
        description="Mit der Bestätigung nimmst du den Auftrag verbindlich an."
        confirmLabel={primaryLabel}
        onConfirm={onConfirm}
        onCancel={() => setConfirmOpen(false)}
        loading={loading}
      />
    </PartnerDetailLayout>
  );
}
