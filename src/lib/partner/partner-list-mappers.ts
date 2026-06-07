import type { PartnerListCardAccent, PartnerListCardMeta } from "@/components/partner/PartnerListCard";
import type {
  PartnerAnfrageItem,
  PartnerAuftragItem,
} from "@/lib/partner/get-partner-data";
import { isPartnerAnfrageOffen, partnerAnfrageStatusLabel } from "@/lib/partner/partner-anfrage-status";
import {
  buildPartnerAnfrageCardMeta,
  buildPartnerAngebotCardMeta,
  buildPartnerAuftragCardMeta,
  partnerAuftragListFooter,
  type PartnerAuftragPhasenCardData,
} from "@/lib/partner/partner-portal-display";
import { auftragHwStatusLabel } from "@/lib/partner/partner-portal-phase";
export type PartnerCardRow = {
  id: string;
  title: string;
  subtitle?: string;
  statusLabel: string;
  statusPillKey: string;
  accent: PartnerListCardAccent;
  meta: PartnerListCardMeta[];
  hint?: string;
  auftragPhasen?: PartnerAuftragPhasenCardData;
  sortDate: number;
};

function ts(v?: string | null): number {
  if (!v) return 0;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

const PENDING_HW = new Set(["angefragt", "ausstehend", "warten", "offen", "zugewiesen"]);

export function mapAnfrageAngebotToCard(item: PartnerAnfrageItem): PartnerCardRow {
  const offen = isPartnerAnfrageOffen(item);
  const meta = buildPartnerAnfrageCardMeta(item.lead, {
    gewerk_name: item.gewerk_name,
    positionen: item.positionen,
  });

  return {
    id: item.id,
    title: item.angebot_titel,
    statusLabel: partnerAnfrageStatusLabel(item),
    statusPillKey: offen ? "antwort ausstehend" : item.status,
    accent: "anfrage",
    meta,
    hint: offen ? "→ Bitte annehmen oder ablehnen" : undefined,
    sortDate: ts(item.gesendet_at),
  };
}

export function mapAnfrageAuftragToCard(item: PartnerAuftragItem): PartnerCardRow {
  const hw = item.hwStatus.toLowerCase();
  const pending =
    item.status.toLowerCase() === "offen" ||
    PENDING_HW.has(hw) ||
    hw === "zugewiesen";

  const meta = buildPartnerAuftragCardMeta(
    item.lead?.objekt,
    item.lead,
    item.start_datum,
    item.end_datum
  );

  return {
    id: `auftrag:${item.id}`,
    title: item.titel,
    statusLabel: auftragHwStatusLabel(item.hwStatus),
    statusPillKey: item.hwStatus,
    accent: "anfrage",
    meta,
    hint: pending ? "→ Bitte annehmen oder ablehnen" : undefined,
    sortDate: ts(item.start_datum),
  };
}

/** Sortierung: Offen → In Prüfung → Übernommen. */
export function angebotPhaseSortKey(item: PartnerAnfrageItem): number {
  const hwSt = (item.hw_status ?? "").toLowerCase();
  if (hwSt === "uebernommen") return 2;
  if (item.hw_eingereicht_at) return 1;
  return 0;
}

export function partnerAngebotStatusPillClass(statusKey: string): string {
  const s = statusKey.toLowerCase();
  if (s === "uebernommen") return "tag bg-emerald-100 text-emerald-700";
  if (s === "eingereicht") return "tag bg-blue-100 text-blue-800";
  if (s === "offen") return "tag bg-amber-100 text-amber-700";
  return "tag bg-amber-100 text-amber-700";
}

export function partnerAngebotOverviewStatusLabel(statusKey: string): string {
  if (statusKey === "uebernommen") return "Übernommen";
  if (statusKey === "eingereicht") return "In Prüfung";
  if (statusKey === "offen") return "Offen";
  return statusKey;
}

export function angebotOverviewStatusKey(item: PartnerAnfrageItem): string {
  const hwSt = (item.hw_status ?? "").toLowerCase();
  if (hwSt === "uebernommen") return "uebernommen";
  if (item.hw_eingereicht_at) return "eingereicht";
  return "offen";
}

function angebotListenStatus(item: PartnerAnfrageItem): {
  label: string;
  pillKey: string;
  hint?: string;
} {
  const hwSt = (item.hw_status ?? "").toLowerCase();
  if (hwSt === "uebernommen") {
    return { label: "Übernommen", pillKey: "uebernommen", hint: "→ Von Bärenwald bestätigt" };
  }
  if (item.hw_eingereicht_at) {
    return {
      label: "In Prüfung",
      pillKey: "eingereicht",
      hint: "→ Warte auf Freigabe durch Bärenwald",
    };
  }
  return {
    label: "Offen",
    pillKey: "offen",
    hint: "→ Angebot einreichen (Preis + PDF)",
  };
}

export function mapAngebotToCard(item: PartnerAnfrageItem): PartnerCardRow {
  const st = angebotListenStatus(item);
  const meta = buildPartnerAngebotCardMeta(
    item.lead,
    item.antwort_at ?? item.gesendet_at
  );

  return {
    id: item.id,
    title: item.angebot_titel,
    statusLabel: st.label,
    statusPillKey: st.pillKey,
    accent: "angebot",
    meta,
    hint: st.hint,
    sortDate: ts(item.antwort_at ?? item.gesendet_at),
  };
}

export function mapAuftragToCard(item: PartnerAuftragItem): PartnerCardRow {
  const phasen = partnerAuftragListFooter({
    status: item.status,
    fortschritt: item.fortschritt,
    hatAngebot: Boolean(item.angebot_id),
    abgeschlossen: item.status.toLowerCase() === "abgeschlossen",
  });

  return {
    id: item.id,
    title: item.titel,
    statusLabel: item.status.replace(/_/g, " "),
    statusPillKey: item.status,
    accent: "auftrag",
    meta: buildPartnerAuftragCardMeta(
      item.lead?.objekt,
      item.lead,
      item.start_datum,
      item.end_datum
    ),
    auftragPhasen: phasen,
    sortDate: ts(item.start_datum),
  };
}

export function buildAnfragenCardRows(
  anfragen: PartnerAnfrageItem[],
  auftragAnfragen: PartnerAuftragItem[]
): PartnerCardRow[] {
  const rows = [
    ...anfragen.map(mapAnfrageAngebotToCard),
    ...auftragAnfragen.map(mapAnfrageAuftragToCard),
  ];
  return rows.sort((a, b) => {
    const aPending = a.hint ? 1 : 0;
    const bPending = b.hint ? 1 : 0;
    if (aPending !== bPending) return bPending - aPending;
    return b.sortDate - a.sortDate;
  });
}
