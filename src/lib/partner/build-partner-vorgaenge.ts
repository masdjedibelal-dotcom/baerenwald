import type {
  PartnerAnfrageItem,
  PartnerAuftragItem,
} from "@/lib/partner/get-partner-data";
import { pickPrimaryAngebotHandwerkerAnfrage } from "@/lib/partner/pick-primary-angebot-handwerker";
import {
  isPartnerAuftragAnfrageAktionErforderlich,
  isPartnerVorgangAusgeblendet,
} from "@/lib/partner/partner-anfrage-status";
import {
  ableitenVorgangState,
  resolveHandwerkerBestaetigtAt,
  type VorgangFilter,
  type VorgangState,
  vorgangPasstFilter,
} from "@/lib/partner/vorgang-state";

export type PartnerVorgangItem = {
  id: string;
  state: VorgangState;
  auftrag: PartnerAuftragItem;
  anfrage?: PartnerAnfrageItem | null;
  handwerker_bestaetigt_at: string | null;
};

function anfrageForAuftrag(
  auftrag: PartnerAuftragItem,
  anfragen: PartnerAnfrageItem[]
): PartnerAnfrageItem | null {
  if (auftrag.angebotHandwerkerId) {
    const direct = anfragen.find((a) => a.id === auftrag.angebotHandwerkerId);
    if (direct) return direct;
  }
  const angebotId = auftrag.angebot_id?.trim();
  if (!angebotId) return null;
  const matches = anfragen.filter((a) => a.angebot_id === angebotId);
  return pickPrimaryAngebotHandwerkerAnfrage(matches) ?? null;
}

/** Ein Vorgang pro Auftrag — State aus Positionen, Nachreichung und HW-Bestätigung. */
export function buildPartnerVorgaenge(input: {
  alleAuftraege: PartnerAuftragItem[];
  anfragen: PartnerAnfrageItem[];
}): PartnerVorgangItem[] {
  const { alleAuftraege, anfragen } = input;
  const items: PartnerVorgangItem[] = [];

  for (const auftrag of alleAuftraege) {
    const anfrage = anfrageForAuftrag(auftrag, anfragen);
    const handwerker_bestaetigt_at = resolveHandwerkerBestaetigtAt({
      handwerker_bestaetigt_at: auftrag.handwerker_bestaetigt_at,
      projektvertrag_bestaetigt_am: auftrag.projektvertrag_bestaetigt_am,
      angebot_bestaetigt_at: anfrage?.bestaetigt_at ?? null,
    });

    if (
      isPartnerVorgangAusgeblendet({
        handwerker_bestaetigt_at,
        anfrage,
        auftrag,
      })
    ) {
      continue;
    }

    const anfrageAktionNoetig =
      !anfrage && isPartnerAuftragAnfrageAktionErforderlich(auftrag);

    const state = ableitenVorgangState({
      auftragStatus: auftrag.status,
      handwerkerBestaetigtAt: handwerker_bestaetigt_at,
      positionen: auftrag.positionen,
      offeneNachreichungPositionIds: auftrag.nachreichungOpenPositionIds,
      anfrageAktionNoetig,
    });

    items.push({
      id: auftrag.id,
      state,
      auftrag,
      anfrage: anfrage ?? null,
      handwerker_bestaetigt_at,
    });
  }

  return items.sort((a, b) => {
    const ta = a.auftrag.start_datum ?? a.handwerker_bestaetigt_at ?? a.auftrag.id;
    const tb = b.auftrag.start_datum ?? b.handwerker_bestaetigt_at ?? b.auftrag.id;
    return tb.localeCompare(ta);
  });
}

export function countPartnerVorgaengeFilter(
  vorgaenge: PartnerVorgangItem[]
): Record<VorgangFilter, number> {
  let offen = 0;
  let erledigt = 0;
  for (const v of vorgaenge) {
    if (vorgangPasstFilter(v.state, "erledigt")) erledigt++;
    else if (vorgangPasstFilter(v.state, "offen")) offen++;
  }
  return { offen, erledigt };
}
