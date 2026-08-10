import type {
  PartnerAnfrageItem,
  PartnerAuftragItem,
} from "@/lib/partner/get-partner-data";
import { pickPrimaryAngebotHandwerkerAnfrage } from "@/lib/partner/pick-primary-angebot-handwerker";
import {
  isPartnerAnfrageAktionErforderlich,
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

/** Minimaler Auftrags-Stub — damit Angebots-Anfragen ohne Auftrag als Vorgang erscheinen. */
export function stubAuftragFromAnfrage(
  anfrage: PartnerAnfrageItem
): PartnerAuftragItem {
  return {
    id: anfrage.auftrag_id?.trim() || anfrage.id,
    titel: anfrage.angebot_titel || anfrage.listen_titel,
    listen_titel: anfrage.listen_titel,
    status: anfrage.auftrag_status?.trim() || "offen",
    fortschritt: null,
    start_datum: null,
    end_datum: null,
    created_at: anfrage.gesendet_at ?? null,
    updated_at:
      anfrage.hw_crm_antwort_at ??
      anfrage.gesendet_at ??
      anfrage.bestaetigt_at ??
      null,
    angebot_id: anfrage.angebot_id,
    plz: anfrage.plz,
    ort: anfrage.ort,
    lead: anfrage.lead ?? null,
    positionen: anfrage.crm_auftrag_positionen ?? [],
    bautagebuch: [],
    portalPhase: "anfrage",
    hwStatus: anfrage.status || "angefragt",
    angebotHandwerkerId: anfrage.id,
    angebotHwStatus: anfrage.hw_status ?? null,
    angebotHwEingereichtAt: anfrage.hw_eingereicht_at ?? null,
    handwerker_bestaetigt_at: anfrage.bestaetigt_at ?? null,
    projektvertrag_bestaetigt_am: anfrage.projektvertrag_bestaetigt_am ?? null,
    nachreichungOpenPositionIds: anfrage.nachreichung_open_position_ids,
    hw_angebot_pdf_url: anfrage.hw_angebot_pdf_url,
    hw_angebot_pdf_signed_url: anfrage.hw_angebot_pdf_signed_url,
    hw_angebot_anhang_urls: anfrage.hw_angebot_anhang_urls,
    hw_angebot_anhang_signed_urls: anfrage.hw_angebot_anhang_signed_urls,
    hw_rechnung_pdf_url: anfrage.hw_rechnung_pdf_url,
    hw_rechnung_pdf_signed_url: anfrage.hw_rechnung_pdf_signed_url,
    hw_rechnung_eingereicht_at: anfrage.hw_rechnung_eingereicht_at,
    vertrag: null,
  };
}

/** Ein Vorgang pro Auftrag — plus offene Angebots-Anfragen ohne Auftrag. */
export function buildPartnerVorgaenge(input: {
  alleAuftraege: PartnerAuftragItem[];
  anfragen: PartnerAnfrageItem[];
}): PartnerVorgangItem[] {
  const { alleAuftraege, anfragen } = input;
  const items: PartnerVorgangItem[] = [];
  const usedAnfrageIds = new Set<string>();

  for (const auftrag of alleAuftraege) {
    const anfrage = anfrageForAuftrag(auftrag, anfragen);
    if (anfrage) usedAnfrageIds.add(anfrage.id);

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

    const anfrageAktionNoetig = anfrage
      ? isPartnerAnfrageAktionErforderlich(anfrage)
      : isPartnerAuftragAnfrageAktionErforderlich(auftrag);

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

  for (const anfrage of anfragen) {
    if (usedAnfrageIds.has(anfrage.id)) continue;

    // Anfrage gehört zu einem geladenen Auftrag (andere Zuweisung gewählt) — nicht doppelt listen
    const linkedAuftragId = anfrage.auftrag_id?.trim();
    if (linkedAuftragId && alleAuftraege.some((a) => a.id === linkedAuftragId)) {
      continue;
    }
    if (
      anfrage.angebot_id &&
      alleAuftraege.some((a) => a.angebot_id === anfrage.angebot_id)
    ) {
      continue;
    }

    if (!isPartnerAnfrageAktionErforderlich(anfrage)) continue;

    const auftrag = stubAuftragFromAnfrage(anfrage);
    const handwerker_bestaetigt_at = resolveHandwerkerBestaetigtAt({
      handwerker_bestaetigt_at: auftrag.handwerker_bestaetigt_at,
      projektvertrag_bestaetigt_am: auftrag.projektvertrag_bestaetigt_am,
      angebot_bestaetigt_at: anfrage.bestaetigt_at ?? null,
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

    const state = ableitenVorgangState({
      auftragStatus: auftrag.status,
      handwerkerBestaetigtAt: handwerker_bestaetigt_at,
      positionen: auftrag.positionen,
      offeneNachreichungPositionIds: auftrag.nachreichungOpenPositionIds,
      anfrageAktionNoetig: true,
    });

    items.push({
      id: anfrage.id,
      state,
      auftrag,
      anfrage,
      handwerker_bestaetigt_at,
    });
  }

  return items.sort((a, b) => {
    return partnerVorgangLastActivityAt(b) - partnerVorgangLastActivityAt(a);
  });
}

/** Erstellzeitpunkt des Vorgangs (Auftrag bzw. Anfrage) — für Dashboard „Zuletzt“. */
export function partnerVorgangCreatedAt(v: PartnerVorgangItem): number {
  const raw =
    v.auftrag.created_at?.trim() ||
    v.anfrage?.gesendet_at?.trim() ||
    "";
  const t = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
}

/** Neuester Zeitstempel aus Status, Anpassungen, Positionen, Tagebuch usw. */
export function partnerVorgangLastActivityAt(v: PartnerVorgangItem): number {
  const candidates: Array<string | null | undefined> = [
    v.auftrag.updated_at,
    v.auftrag.created_at,
    v.anfrage?.gesendet_at,
    v.anfrage?.antwort_at,
    v.anfrage?.hw_crm_antwort_at,
    v.anfrage?.bestaetigt_at,
    v.anfrage?.hw_eingereicht_at,
    v.anfrage?.hw_rechnung_eingereicht_at,
    v.handwerker_bestaetigt_at,
    v.auftrag.handwerker_bestaetigt_at,
    v.auftrag.projektvertrag_bestaetigt_am,
    v.auftrag.hw_rechnung_eingereicht_at,
    v.auftrag.hw_abschluss_signiert_am,
    v.auftrag.angebotHwEingereichtAt,
    v.auftrag.start_datum,
    v.auftrag.end_datum,
    v.auftrag.abnahme_datum,
  ];

  for (const p of v.auftrag.positionen) {
    candidates.push(p.gestartet_am, p.erledigt_am, p.start_datum, p.end_datum);
  }
  for (const bt of v.auftrag.bautagebuch) {
    candidates.push(bt.datum);
  }

  let max = 0;
  for (const c of candidates) {
    if (!c?.trim()) continue;
    const t = new Date(c).getTime();
    if (!Number.isNaN(t) && t > max) max = t;
  }
  return max;
}

export function countPartnerVorgaengeFilter(
  vorgaenge: PartnerVorgangItem[]
): Record<VorgangFilter, number> {
  let offen = 0;
  let auftrag = 0;
  let erledigt = 0;
  for (const v of vorgaenge) {
    if (vorgangPasstFilter(v.state, "erledigt")) erledigt++;
    else if (vorgangPasstFilter(v.state, "auftrag")) auftrag++;
    else if (vorgangPasstFilter(v.state, "offen")) offen++;
  }
  return { alle: vorgaenge.length, offen, auftrag, erledigt };
}
