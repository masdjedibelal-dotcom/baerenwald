import type { PartnerListCardAccent, PartnerListCardMeta } from "@/components/partner/PartnerListCard";
import type {
  PartnerAnfrageItem,
  PartnerAuftragItem,
} from "@/lib/partner/get-partner-data";
import type { PartnerVorgangItem } from "@/lib/partner/build-partner-vorgaenge";
import {
  vorgangStateLabel,
  vorgangStatePillKey,
  type VorgangFilter,
} from "@/lib/partner/vorgang-state";
import {
  partnerOffenStatusLabel,
  partnerOffenStatusPillKey,
  type PartnerOffenItem,
} from "@/lib/partner/partner-offen-status";
import { partnerAuftragAnfrageStatusLabel } from "@/lib/partner/partner-anfrage-status";
import {
  partnerAuftragListenStatusLabel,
  partnerAuftragListenStatusPillKey,
} from "@/lib/partner/partner-auftrag-list-status";
import {
  buildPartnerAnfrageCardMeta,
  buildPartnerAuftragCardMeta,
} from "@/lib/partner/partner-portal-display";

export type PartnerCardRow = {
  id: string;
  title: string;
  subtitle?: string;
  statusLabel: string;
  statusPillKey: string;
  accent: PartnerListCardAccent;
  meta: PartnerListCardMeta[];
  hint?: string;
  sortDate: number;
};

function ts(v?: string | null): number {
  if (!v) return 0;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

export function partnerAngebotStatusPillClass(statusKey: string): string {
  const s = statusKey.toLowerCase();
  if (s === "ergaenzung" || s === "geaendert") return "tag bg-amber-100 text-amber-800";
  if (s === "neu") return "tag bg-amber-100 text-amber-700";
  if (s === "abgelehnt") return "tag bg-red-100 text-red-800";
  return "tag bg-amber-100 text-amber-700";
}

export function mapAnfrageAuftragToCard(item: PartnerAuftragItem): PartnerCardRow {
  const meta = buildPartnerAuftragCardMeta(
    item.lead?.objekt,
    item.lead,
    item.start_datum,
    item.end_datum
  );

  return {
    id: `auftrag:${item.id}`,
    title: item.listen_titel,
    statusLabel: partnerAuftragAnfrageStatusLabel(item),
    statusPillKey: "neu",
    accent: "anfrage",
    meta,
    hint: "→ Bitte annehmen oder ablehnen",
    sortDate: ts(item.start_datum),
  };
}

export function mapAuftragToCard(item: PartnerAuftragItem): PartnerCardRow {
  return {
    id: item.id,
    title: item.listen_titel,
    statusLabel: partnerAuftragListenStatusLabel(item.status),
    statusPillKey: partnerAuftragListenStatusPillKey(item.status),
    accent: "auftrag",
    meta: buildPartnerAuftragCardMeta(
      item.lead?.objekt,
      item.lead,
      item.start_datum,
      item.end_datum
    ),
    sortDate: ts(item.start_datum),
  };
}

export function mapOffenAngebotToCard(
  item: PartnerAnfrageItem & { offen_karten_typ: "neu" | "nachreichung" }
): PartnerCardRow {
  const typ = item.offen_karten_typ;
  const meta = buildPartnerAnfrageCardMeta(item.lead, {
    gewerk_name: item.gewerk_name,
    positionen: item.positionen,
  });

  return {
    id: item.id,
    title: item.listen_titel,
    subtitle:
      typ === "nachreichung" ? "Ergänzung zum laufenden Auftrag" : undefined,
    statusLabel: partnerOffenStatusLabel(typ),
    statusPillKey: partnerOffenStatusPillKey(typ),
    accent: typ === "nachreichung" ? "anfrage" : "angebot",
    meta,
    hint: typ === "nachreichung" ? "→ Ergänzung annehmen" : "→ Bitte annehmen",
    sortDate: ts(item.gesendet_at ?? item.antwort_at),
  };
}

export function mapVorgangToCard(vorgang: PartnerVorgangItem): PartnerCardRow {
  const { auftrag, state, anfrage } = vorgang;
  const meta = buildPartnerAuftragCardMeta(
    auftrag.lead?.objekt,
    auftrag.lead,
    auftrag.start_datum,
    auftrag.end_datum
  );

  const hint =
    state === "neu"
      ? "→ Bitte annehmen oder ablehnen"
      : state === "geaendert"
        ? "→ Änderungen bestätigen"
        : undefined;

  return {
    id: vorgang.id,
    title: auftrag.listen_titel,
    subtitle:
      state === "geaendert" ? "Änderungen vom CRM" : anfrage ? undefined : undefined,
    statusLabel: vorgangStateLabel(state),
    statusPillKey: vorgangStatePillKey(state),
    accent:
      state === "neu" || state === "geaendert"
        ? state === "geaendert"
          ? "anfrage"
          : "angebot"
        : "auftrag",
    meta,
    hint,
    sortDate: ts(
      anfrage?.gesendet_at ?? auftrag.start_datum ?? vorgang.handwerker_bestaetigt_at
    ),
  };
}

export function buildVorgangCardRows(
  vorgaenge: PartnerVorgangItem[],
  filter: VorgangFilter
): PartnerCardRow[] {
  const rows = vorgaenge
    .filter((v) =>
      filter === "erledigt" ? v.state === "erledigt" : v.state !== "erledigt"
    )
    .map(mapVorgangToCard);
  return rows.sort((a, b) => b.sortDate - a.sortDate);
}

export function buildOffenCardRows(offen: PartnerOffenItem[]): PartnerCardRow[] {
  const rows = offen.map((entry) => {
    if (entry.kind === "angebot") {
      return mapOffenAngebotToCard(entry.item);
    }
    return mapAnfrageAuftragToCard(entry.item);
  });
  return rows.sort((a, b) => b.sortDate - a.sortDate);
}

export function buildAuftraegeCardRows(
  auftraege: PartnerAuftragItem[],
  filter: "aktiv" | "erledigt",
  isAktiv: (item: PartnerAuftragItem) => boolean
): PartnerCardRow[] {
  return auftraege
    .filter((a) => (filter === "aktiv" ? isAktiv(a) : !isAktiv(a)))
    .map(mapAuftragToCard)
    .sort((a, b) => b.sortDate - a.sortDate);
}
