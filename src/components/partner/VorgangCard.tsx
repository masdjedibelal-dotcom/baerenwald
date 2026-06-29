"use client";

import { PartnerAuftragAnfrageDetail } from "@/components/partner/PartnerAuftragAnfrageDetail";
import { PartnerAuftragDetail } from "@/components/partner/PartnerAuftragDetail";
import { PartnerOffenDetail } from "@/components/partner/PartnerOffenDetail";
import type { PartnerVorgangItem } from "@/lib/partner/build-partner-vorgaenge";
import type { PartnerOffenAngebotItem } from "@/lib/partner/partner-offen-status";

function toOffenAngebotItem(
  vorgang: PartnerVorgangItem
): PartnerOffenAngebotItem {
  const anfrage = vorgang.anfrage!;
  if (vorgang.state === "geaendert") {
    return {
      ...anfrage,
      offen_karten_typ: "nachreichung",
      portal_status: "ausstehend",
    };
  }
  return anfrage;
}

export function VorgangCard({
  vorgang,
  onUpdated,
}: {
  vorgang: PartnerVorgangItem;
  onUpdated?: (id: string) => void;
}) {
  const { state, auftrag, anfrage } = vorgang;

  if (state === "in_bearbeitung" || state === "erledigt") {
    return <PartnerAuftragDetail item={auftrag} />;
  }

  if (anfrage) {
    return (
      <PartnerOffenDetail
        item={toOffenAngebotItem(vorgang)}
        onConfirmed={onUpdated}
      />
    );
  }

  return (
    <PartnerAuftragAnfrageDetail item={auftrag} onAccepted={onUpdated} />
  );
}
