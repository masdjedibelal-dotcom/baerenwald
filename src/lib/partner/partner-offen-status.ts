import type { PartnerAnfrageItem, PartnerAuftragItem } from "@/lib/partner/get-partner-data";
import {
  isPartnerAnfrageAktionErforderlich,
  isPartnerAnfrageKonditionenNachreichung,
} from "@/lib/partner/partner-anfrage-status";
import {
  hasPartnerKonditionenNachreichungAusstehend,
  resolveNachreichungOpenZeilenIds,
} from "@/lib/partner/partner-konditionen";
import { isPartnerAuftragAnfrageAktionErforderlich } from "@/lib/partner/partner-anfrage-status";

/** Vereinfachter Portal-Status (Read-Layer über Legacy-DB-Werte). */
export type PartnerPortalStatus = "ausstehend" | "angenommen" | "abgelehnt";

/** Karten-Typ im Bereich „Offen“. */
export type PartnerOffenKartenTyp = "neu" | "nachreichung" | "geaendert";

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

/** Mappt Legacy status/hw_status auf vereinfachten Portal-Status. */
export function resolvePartnerPortalStatus(
  item: AngebotStatusFields
): PartnerPortalStatus {
  const st = (item.status ?? "").toLowerCase();
  const hwSt = (item.hw_status ?? "").toLowerCase();

  if (st === "abgelehnt" || hwSt === "abgelehnt") return "abgelehnt";

  if (
    st === "angenommen" ||
    item.bestaetigt_at ||
    item.projektvertrag_bestaetigt_am
  ) {
    return "angenommen";
  }

  /** CRM prüft Einreichung — weder Offen noch Meine Aufträge. */
  if (hwSt === "eingereicht") return "angenommen";

  if (st === "angefragt" || st === "ausstehend") return "ausstehend";
  if (st === "akzeptiert") return "ausstehend";
  if (st === "bestaetigt" || hwSt === "bestaetigt") return "ausstehend";

  /** Legacy: Preise verbindlich, Auftrag noch nicht angenommen. */
  if (hwSt === "uebernommen") return "ausstehend";

  if (item.gesendet_at && !item.antwort_at) return "ausstehend";

  return "ausstehend";
}

/** Sichtbar im Tab „Offen“ (Handwerker-Aktion nötig). */
export function isPartnerAngebotOffenListItem(item: AngebotStatusFields): boolean {
  if (resolvePartnerPortalStatus(item) !== "ausstehend") return false;
  const hwSt = (item.hw_status ?? "").toLowerCase();
  if (hwSt === "eingereicht") return false;
  return true;
}

export function resolvePartnerOffenKartenTyp(
  item: AngebotStatusFields
): PartnerOffenKartenTyp {
  if (isPartnerAnfrageKonditionenNachreichung(item)) {
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
    const agreed = new Set(
      item.hw_konditionen?.positionen.map((p) => p.position_id) ?? []
    );
    const hasNew = openIds.some((id) => !agreed.has(id));
    if (hasNew) return "nachreichung";
    if (openIds.length) return "geaendert";
  }

  if (hasPartnerKonditionenNachreichungAusstehend(item)) {
    return "nachreichung";
  }

  return "neu";
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
  angebote: PartnerAnfrageItem[];
  auftragAnfragen: PartnerAuftragItem[];
}): PartnerOffenItem[] {
  const seen = new Set<string>();
  const out: PartnerOffenItem[] = [];

  for (const raw of [...input.anfragen, ...input.angebote]) {
    if (seen.has(raw.id)) continue;
    if (
      !isPartnerAngebotOffenListItem(raw) &&
      !isPartnerAnfrageAktionErforderlich(raw)
    ) {
      continue;
    }
    seen.add(raw.id);
    out.push({ kind: "angebot", item: enrichPartnerOffenAngebot(raw) });
  }

  for (const a of input.auftragAnfragen) {
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
  if (typ === "nachreichung") return "Neue Leistung";
  if (typ === "geaendert") return "Geändert";
  return "Neu";
}

export function partnerOffenStatusPillKey(typ: PartnerOffenKartenTyp): string {
  if (typ === "nachreichung") return "neue_leistung";
  if (typ === "geaendert") return "geaendert";
  return "neu";
}
