import type { PartnerAnfrageItem, PartnerAuftragItem } from "@/lib/partner/get-partner-data";
import { isPartnerAnfrageAktionErforderlich } from "@/lib/partner/partner-anfrage-status";
import {
  hasPartnerKonditionenNachreichungAusstehend,
  resolveNachreichungOpenZeilenIds,
} from "@/lib/partner/partner-konditionen";
import { isPartnerAuftragAnfrageAktionErforderlich } from "@/lib/partner/partner-anfrage-status";

/** Vereinfachter Portal-Status (Read-Layer über Legacy-DB-Werte). */
export type PartnerPortalStatus = "ausstehend" | "angenommen" | "abgelehnt";

/** Karten-Typ im Bereich „Offen“. */
export type PartnerOffenKartenTyp = "neu" | "nachreichung";

export type PartnerOffenAngebotItem = PartnerAnfrageItem & {
  portal_status: PartnerPortalStatus;
  offen_karten_typ: PartnerOffenKartenTyp;
};

export type PartnerOffenItem =
  | { kind: "angebot"; item: PartnerOffenAngebotItem }
  | { kind: "auftrag"; item: PartnerAuftragItem };

type AngebotStatusFields = Pick<
  PartnerAnfrageItem,
  | "status"
  | "antwort_at"
  | "gesendet_at"
  | "hw_status"
  | "hw_eingereicht_at"
  | "bestaetigt_at"
  | "projektvertrag_bestaetigt_am"
  | "crm_positionen_raw"
  | "crm_auftrag_positionen"
  | "gewerk_id"
  | "gewerk_name"
  | "handwerker_id"
  | "hw_konditionen"
  | "alle_hw_konditionen"
>;

/** Mappt DB-Werte auf vereinfachten Portal-Status. */
export function resolvePartnerPortalStatus(
  item: AngebotStatusFields
): PartnerPortalStatus {
  const st = (item.status ?? "").toLowerCase();
  const hwSt = (item.hw_status ?? "").toLowerCase();

  if (st === "abgelehnt" || hwSt === "abgelehnt") return "abgelehnt";

  if (hasPartnerKonditionenNachreichungAusstehend(item)) return "ausstehend";

  if (st === "angenommen" || item.bestaetigt_at || item.projektvertrag_bestaetigt_am) {
    return "angenommen";
  }

  if (hwSt === "uebernommen" || hwSt === "eingereicht") return "angenommen";

  return "ausstehend";
}

/** Sichtbar im Tab „Offen“ (Handwerker-Aktion nötig). */
export function isPartnerAngebotOffenListItem(item: AngebotStatusFields): boolean {
  if (hasPartnerKonditionenNachreichungAusstehend(item)) return true;
  if (resolvePartnerPortalStatus(item) !== "ausstehend") return false;
  return isPartnerAnfrageAktionErforderlich(item);
}

export function resolvePartnerOffenKartenTyp(
  item: AngebotStatusFields
): PartnerOffenKartenTyp {
  if (
    hasPartnerKonditionenNachreichungAusstehend(item) ||
    isPartnerAnfrageKonditionenNachreichung(item)
  ) {
    return "nachreichung";
  }
  return "neu";
}

function isPartnerAnfrageKonditionenNachreichung(
  item: AngebotStatusFields
): boolean {
  const openIds = resolveNachreichungOpenZeilenIds({
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
  if (!openIds.length) return false;
  if (!item.bestaetigt_at && (item.hw_status ?? "").toLowerCase() !== "uebernommen") {
    return false;
  }
  return true;
}

export function enrichPartnerOffenAngebot(
  item: PartnerAnfrageItem
): PartnerOffenAngebotItem {
  return {
    ...item,
    portal_status: resolvePartnerPortalStatus(item),
    offen_karten_typ: resolvePartnerOffenKartenTyp(item),
  };
}

export function buildPartnerOffenListe(input: {
  anfragen: PartnerAnfrageItem[];
  auftragAnfragen: PartnerAuftragItem[];
}): PartnerOffenItem[] {
  const seen = new Set<string>();
  const auftragIdsViaAngebot = new Set<string>();
  const out: PartnerOffenItem[] = [];

  for (const raw of input.anfragen) {
    if (seen.has(raw.id)) continue;
    if (!isPartnerAngebotOffenListItem(raw)) continue;
    seen.add(raw.id);
    if (raw.auftrag_id) auftragIdsViaAngebot.add(raw.auftrag_id);
    out.push({ kind: "angebot", item: enrichPartnerOffenAngebot(raw) });
  }

  for (const a of input.auftragAnfragen) {
    if (auftragIdsViaAngebot.has(a.id)) continue;
    if (!isPartnerAuftragAnfrageAktionErforderlich(a)) continue;
    out.push({ kind: "auftrag", item: a });
  }

  return out.sort((a, b) => {
    const ta =
      a.kind === "angebot"
        ? new Date(a.item.gesendet_at || a.item.antwort_at || 0).getTime()
        : new Date(a.item.start_datum || 0).getTime();
    const tb =
      b.kind === "angebot"
        ? new Date(b.item.gesendet_at || b.item.antwort_at || 0).getTime()
        : new Date(b.item.start_datum || 0).getTime();
    return tb - ta;
  });
}

export function partnerOffenStatusLabel(typ: PartnerOffenKartenTyp): string {
  if (typ === "nachreichung") return "Ergänzung";
  return "Neu";
}

export function partnerOffenStatusPillKey(typ: PartnerOffenKartenTyp): string {
  if (typ === "nachreichung") return "ergaenzung";
  return "neu";
}
