import type {
  PartnerAnfrageItem,
  PartnerAuftragItem,
} from "@/lib/partner/get-partner-data";
import {
  isPartnerAnfrageAktionErforderlich,
  isPartnerAuftragAnfrageAktionErforderlich,
  isPartnerVorgangAusgeblendet,
} from "@/lib/partner/partner-anfrage-status";
import {
  enrichPartnerOffenAngebot,
  isPartnerAngebotOffenListItem,
  type PartnerOffenAngebotItem,
} from "@/lib/partner/partner-offen-status";
import { pickPrimaryAngebotHandwerkerAnfrage } from "@/lib/partner/pick-primary-angebot-handwerker";
import {
  ableitenVorgangState,
  resolveHandwerkerBestaetigtAt,
  type VorgangFilter,
  type VorgangState,
} from "@/lib/partner/vorgang-state";

export type PartnerVorgangItem = {
  /** Auftrags-ID (Listen-Schlüssel) */
  id: string;
  state: VorgangState;
  auftrag: PartnerAuftragItem;
  /** Verknüpfte angebot_handwerker-Zeile (falls vorhanden) */
  anfrage?: PartnerOffenAngebotItem;
  handwerker_bestaetigt_at: string | null;
};

function ts(v?: string | null): number {
  if (!v) return 0;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function anfrageAktionNoetig(anfrage: PartnerAnfrageItem | undefined): boolean {
  if (!anfrage) return false;
  return (
    isPartnerAngebotOffenListItem(anfrage) ||
    isPartnerAnfrageAktionErforderlich(anfrage)
  );
}

function buildVorgangFromAuftrag(
  auftrag: PartnerAuftragItem,
  anfrage: PartnerAnfrageItem | undefined
): PartnerVorgangItem {
  const enrichedAnfrage = anfrage
    ? enrichPartnerOffenAngebot({
        ...anfrage,
        crm_auftrag_positionen:
          anfrage.crm_auftrag_positionen ?? auftrag.positionen,
        nachreichung_open_position_ids: auftrag.nachreichungOpenPositionIds,
      })
    : undefined;
  const handwerker_bestaetigt_at = resolveHandwerkerBestaetigtAt({
    handwerker_bestaetigt_at: auftrag.handwerker_bestaetigt_at,
    projektvertrag_bestaetigt_am: auftrag.projektvertrag_bestaetigt_am,
    angebot_bestaetigt_at: anfrage?.bestaetigt_at,
  });

  const state = ableitenVorgangState({
    auftragStatus: auftrag.status,
    handwerkerBestaetigtAt: handwerker_bestaetigt_at,
    positionen: auftrag.positionen,
    offeneNachreichungPositionIds: auftrag.nachreichungOpenPositionIds,
    anfrageAktionNoetig:
      !handwerker_bestaetigt_at &&
      (anfrageAktionNoetig(anfrage) ||
        isPartnerAuftragAnfrageAktionErforderlich(auftrag)),
  });

  return {
    id: auftrag.id,
    state,
    auftrag,
    anfrage: enrichedAnfrage,
    handwerker_bestaetigt_at,
  };
}

export function buildPartnerVorgaenge(input: {
  alleAuftraege: PartnerAuftragItem[];
  anfragen: PartnerAnfrageItem[];
}): PartnerVorgangItem[] {
  const anfragenByAngebotId = new Map<string, PartnerAnfrageItem[]>();
  for (const a of input.anfragen) {
    const list = anfragenByAngebotId.get(a.angebot_id) ?? [];
    list.push(a);
    anfragenByAngebotId.set(a.angebot_id, list);
  }

  const seenAuftragIds = new Set<string>();
  const out: PartnerVorgangItem[] = [];

  for (const auftrag of input.alleAuftraege) {
    seenAuftragIds.add(auftrag.id);
    const anfragenForAngebot = auftrag.angebot_id
      ? anfragenByAngebotId.get(auftrag.angebot_id) ?? []
      : [];
    const anfrage = pickPrimaryAngebotHandwerkerAnfrage(anfragenForAngebot);
    out.push(buildVorgangFromAuftrag(auftrag, anfrage));
  }

  for (const anfrage of input.anfragen) {
    const auftragId = anfrage.auftrag_id?.trim();
    if (auftragId && seenAuftragIds.has(auftragId)) continue;
    if (!isPartnerAngebotOffenListItem(anfrage)) continue;

    const pseudoAuftrag: PartnerAuftragItem = {
      id: auftragId ?? `anfrage:${anfrage.id}`,
      titel: anfrage.angebot_titel,
      listen_titel: anfrage.listen_titel,
      status: anfrage.auftrag_status ?? "offen",
      fortschritt: null,
      start_datum: null,
      end_datum: null,
      angebot_id: anfrage.angebot_id,
      plz: anfrage.plz,
      ort: anfrage.ort,
      lead: anfrage.lead,
      positionen: anfrage.crm_auftrag_positionen ?? [],
      bautagebuch: [],
      portalPhase: "anfrage",
      hwStatus: anfrage.hw_status ?? "ausstehend",
      angebotHandwerkerId: anfrage.id,
      projektvertrag_bestaetigt_am: anfrage.projektvertrag_bestaetigt_am,
    };

    out.push(buildVorgangFromAuftrag(pseudoAuftrag, anfrage));
  }

  return out
    .filter(
      (v) =>
        !isPartnerVorgangAusgeblendet({
          handwerker_bestaetigt_at: v.handwerker_bestaetigt_at,
          anfrage: v.anfrage,
          auftrag: v.auftrag,
        })
    )
    .sort((a, b) => {
      const ta = ts(
        a.anfrage?.gesendet_at ??
          a.auftrag.start_datum ??
          a.handwerker_bestaetigt_at
      );
      const tb = ts(
        b.anfrage?.gesendet_at ??
          b.auftrag.start_datum ??
          b.handwerker_bestaetigt_at
      );
      return tb - ta;
    });
}

export function countPartnerVorgaengeFilter(
  vorgaenge: PartnerVorgangItem[]
): Record<VorgangFilter, number> {
  return {
    offen: vorgaenge.filter((v) => v.state !== "erledigt").length,
    erledigt: vorgaenge.filter((v) => v.state === "erledigt").length,
  };
}
