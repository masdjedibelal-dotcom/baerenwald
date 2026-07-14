"use client";

import { PartnerAuftragAnfrageDetail } from "@/components/partner/PartnerAuftragAnfrageDetail";
import { PartnerAuftragDetail } from "@/components/partner/PartnerAuftragDetail";
import { PartnerOffenDetail } from "@/components/partner/PartnerOffenDetail";
import type { PartnerVorgangItem } from "@/lib/partner/build-partner-vorgaenge";
import {
  enrichPartnerOffenAngebot,
  type PartnerOffenAngebotItem,
} from "@/lib/partner/partner-offen-status";
import type { VorgangState } from "@/lib/partner/vorgang-state";

function toOffenAngebotItem(vorgang: PartnerVorgangItem): PartnerOffenAngebotItem {
  const anfrage = vorgang.anfrage!;
  if (vorgang.state === "geaendert") {
    return {
      ...anfrage,
      offen_karten_typ: "nachreichung",
      portal_status: "ausstehend",
      crm_auftrag_positionen:
        anfrage.crm_auftrag_positionen ?? vorgang.auftrag.positionen,
      nachreichung_open_position_ids:
        anfrage.nachreichung_open_position_ids ??
        vorgang.auftrag.nachreichungOpenPositionIds,
    };
  }
  return enrichPartnerOffenAngebot(anfrage);
}

function resolveOffenDetailItem(
  vorgang: PartnerVorgangItem
): PartnerOffenAngebotItem | null {
  if (vorgang.anfrage) return toOffenAngebotItem(vorgang);
  if (vorgang.state !== "geaendert") return null;

  const auftrag = vorgang.auftrag;
  const openIds = auftrag.nachreichungOpenPositionIds ?? [];
  if (!openIds.length) return null;

  return {
    id: auftrag.angebotHandwerkerId ?? `auftrag:${auftrag.id}`,
    angebot_id: auftrag.angebot_id ?? "",
    status: auftrag.hwStatus,
    gewerk_name: auftrag.positionen[0]?.gewerk_name ?? "Leistung",
    handwerker_id: undefined,
    angebot_titel: auftrag.titel,
    listen_titel: auftrag.listen_titel,
    plz: auftrag.plz,
    ort: auftrag.ort,
    zeitraum: "",
    positionen: [],
    lead: auftrag.lead,
    crm_auftrag_positionen: auftrag.positionen,
    nachreichung_open_position_ids: openIds,
    auftrag_id: auftrag.id,
    portal_status: "ausstehend",
    offen_karten_typ: "nachreichung",
    projektvertrag_bestaetigt_am: auftrag.projektvertrag_bestaetigt_am,
    projektvertrag: auftrag.vertrag?.projektvertrag ?? null,
  };
}

export function VorgangCard({
  vorgang,
  onUpdated,
}: {
  vorgang: PartnerVorgangItem;
  onUpdated?: (id: string) => void;
}) {
  const { state, auftrag } = vorgang;
  const vorgangState = state as VorgangState;

  if (auftrag.lead?.hv_meldung_status === "notmassnahme") {
    return (
      <PartnerAuftragDetail
        item={auftrag}
        vorgangState="in_bearbeitung"
      />
    );
  }

  if (state === "in_bearbeitung" || state === "erledigt") {
    return <PartnerAuftragDetail item={auftrag} vorgangState={vorgangState} />;
  }

  const offenItem = resolveOffenDetailItem(vorgang);
  if (offenItem && (state === "geaendert" || state === "neu")) {
    return (
      <PartnerOffenDetail
        item={offenItem}
        vorgangState={vorgangState}
        onConfirmed={onUpdated}
      />
    );
  }

  return (
    <PartnerAuftragAnfrageDetail item={auftrag} onAccepted={onUpdated} />
  );
}
