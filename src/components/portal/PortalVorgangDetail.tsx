"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { acceptKundeAngebot } from "@/app/actions/portal-angebot";
import { OrgAnlassBadge } from "@/components/org/OrgAnlassBadge";
import { PartnerPortalDetailSections } from "@/components/partner/PartnerPortalDetailSections";
import { BautagebuchAccordionList } from "@/components/shared/BautagebuchAccordionList";
import { DokumenteTabelle } from "@/components/shared/DokumenteTabelle";
import { PortalAuftragPhasenStrip } from "@/components/shared/PortalAuftragPhasenStrip";
import {
  PortalAnsprechpartnerCard,
  PortalConfirmDialog,
  PortalDetailError,
  PortalDetailHero,
  PortalDetailInfoBox,
  PortalDetailLayout,
  PortalDetailMilestoneList,
  PortalDetailStickyActions,
  PortalDetailSuccessBox,
} from "@/components/shared/PortalDetailUi";
import type { KundePortalDetailItem } from "@/lib/portal/portal-detail-item";
import { fmtPortalRelativeTime } from "@/lib/shared/portal-detail-format";
import { portalDetailStatusPillClass } from "@/lib/shared/portal-detail-format";

export function PortalVorgangDetail({
  item,
  showAnlassBadge,
  onAccepted,
}: {
  item: KundePortalDetailItem;
  showAnlassBadge?: boolean;
  onAccepted?: () => void;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  const rel = fmtPortalRelativeTime(item.date);
  const metaLine = rel ? `${rel}` : undefined;
  const statusPill = portalDetailStatusPillClass(item.statusPillKey ?? item.status ?? "offen");

  async function handleAccept() {
    if (!item.isAngebotDetail) return;
    setLoading(true);
    setError(null);
    const res = await acceptKundeAngebot(item.id);
    setLoading(false);
    setConfirmOpen(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setAccepted(true);
    onAccepted?.();
    router.refresh();
  }

  const showAcceptCta = item.needsAction && item.isAngebotDetail && !accepted;

  const footer = showAcceptCta ? (
    <PortalDetailStickyActions
      primaryLabel="Angebot annehmen"
      onPrimary={() => setConfirmOpen(true)}
      primaryLoading={loading}
    />
  ) : null;

  return (
    <>
      <PortalDetailLayout footer={footer}>
        <PortalDetailHero
          title={item.title}
          metaLine={metaLine}
          statusLabel={item.status}
          statusPillClass={statusPill}
        />

        {showAnlassBadge && item.anfrageVorhaben ? (
          <OrgAnlassBadge anlass={item.anfrageVorhaben} />
        ) : null}

        {accepted ? (
          <PortalDetailSuccessBox>
            <p className="font-semibold">Angebot angenommen</p>
            <p className="portal-text-meta mt-1">
              Wir bereiten den Auftrag vor und melden uns, sobald es weitergeht.
            </p>
          </PortalDetailSuccessBox>
        ) : null}

        {error ? <PortalDetailError message={error} /> : null}

        {item.infoHint ? (
          <PortalDetailInfoBox>{item.infoHint}</PortalDetailInfoBox>
        ) : null}

        {item.isAuftragDetail && item.auftragPhasen ? (
          <PortalAuftragPhasenStrip
            states={item.auftragPhasen.states}
            aktuellePhase={item.auftragPhasen.aktuellePhase}
            fortschritt={item.auftragPhasen.fortschritt ?? undefined}
          />
        ) : null}

        <PartnerPortalDetailSections
          sections={item.sections}
          angebotPositionen={item.angebotPositionen}
          gesamtBrutto={item.gesamtBrutto}
        />

        {item.milestones && item.milestones.length > 0 ? (
          <PortalDetailMilestoneList items={item.milestones} />
        ) : null}

        {item.bautagebuch && item.bautagebuch.length > 0 ? (
          <BautagebuchAccordionList
            eintraege={item.bautagebuch.map((b) => ({
              id: b.id ?? `${b.datum}-${b.titel}`,
              datum: b.datum ?? b.created_at,
              titel: b.titel ?? "Eintrag",
              beschreibung: b.notiz,
              fotos: b.fotos_urls,
            }))}
          />
        ) : null}

        {item.ansprechpartner ? (
          <PortalAnsprechpartnerCard
            rolleLabel={item.ansprechpartner.rolleLabel}
            name={item.ansprechpartner.name}
            telefon={item.ansprechpartner.telefon}
            telefonHref={item.ansprechpartner.telefonHref}
            intro={item.ansprechpartner.intro}
          />
        ) : null}

        {item.dokumente && item.dokumente.length > 0 ? (
          <DokumenteTabelle
            dokumente={item.dokumente.map((d) => ({
              id: d.id,
              name: d.name,
              datum: d.datum,
              href: d.href,
            }))}
          />
        ) : null}
      </PortalDetailLayout>

      <PortalConfirmDialog
        open={confirmOpen}
        title="Angebot annehmen?"
        description="Mit der Annahme beauftragst du Bärenwald verbindlich mit der Ausführung zu den genannten Konditionen. Wir melden uns zur weiteren Planung."
        confirmLabel="Verbindlich annehmen"
        loading={loading}
        onConfirm={handleAccept}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
