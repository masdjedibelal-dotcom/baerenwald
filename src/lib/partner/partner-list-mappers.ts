import type { PartnerListCardAccent, PartnerListCardMeta } from "@/components/partner/PartnerListCard";
import type {
  PartnerAnfrageItem,
  PartnerAuftragItem,
} from "@/lib/partner/get-partner-data";
import { isPartnerAnfrageOffen, partnerAnfrageStatusLabel } from "@/lib/partner/partner-anfrage-status";
import {
  isPartnerAnfrageAntwortAbgelaufen,
  isPartnerAuftragAnfrageAntwortAbgelaufen,
  isPartnerAuftragAnfrageOffen,
  partnerAuftragAnfrageStatusLabel,
} from "@/lib/partner/partner-anfrage-status";
import {
  buildPartnerAnfrageCardMeta,
  buildPartnerAngebotCardMeta,
  buildPartnerAuftragCardMeta,
  partnerAuftragListFooter,
  type PartnerAuftragPhasenCardData,
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
  auftragPhasen?: PartnerAuftragPhasenCardData;
  sortDate: number;
};

function ts(v?: string | null): number {
  if (!v) return 0;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

export function mapAnfrageAngebotToCard(item: PartnerAnfrageItem): PartnerCardRow {
  const offen = isPartnerAnfrageOffen(item);
  const abgelaufen = isPartnerAnfrageAntwortAbgelaufen(item);
  const meta = buildPartnerAnfrageCardMeta(item.lead, {
    gewerk_name: item.gewerk_name,
    positionen: item.positionen,
  });

  return {
    id: item.id,
    title: item.listen_titel,
    statusLabel: partnerAnfrageStatusLabel(item),
    statusPillKey: abgelaufen ? "antwort_abgelaufen" : offen ? "antwort ausstehend" : item.status,
    accent: "anfrage",
    meta,
    hint: offen ? "→ Bitte annehmen oder ablehnen" : undefined,
    sortDate: ts(item.gesendet_at),
  };
}

export function mapAnfrageAuftragToCard(item: PartnerAuftragItem): PartnerCardRow {
  const offen = isPartnerAuftragAnfrageOffen(item);
  const abgelaufen = isPartnerAuftragAnfrageAntwortAbgelaufen(item);

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
    statusPillKey: abgelaufen ? "antwort_abgelaufen" : item.hwStatus,
    accent: "anfrage",
    meta,
    hint: offen ? "→ Bitte annehmen oder ablehnen" : undefined,
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
  if (s === "vertrag_offen") return "tag bg-violet-100 text-violet-800";
  if (s === "warte_vertrag") return "tag bg-slate-100 text-slate-700";
  if (s === "eingereicht") return "tag bg-blue-100 text-blue-800";
  if (s === "rueckfrage") return "tag bg-amber-100 text-amber-800";
  if (s === "abgelehnt") return "tag bg-red-100 text-red-800";
  if (s === "offen") return "tag bg-amber-100 text-amber-700";
  return "tag bg-amber-100 text-amber-700";
}

export function partnerAngebotOverviewStatusLabel(statusKey: string): string {
  if (statusKey === "uebernommen") return "Bestätigt";
  if (statusKey === "vertrag_offen") return "Vertrag offen";
  if (statusKey === "warte_vertrag") return "Warte auf Vertrag";
  if (statusKey === "eingereicht") return "In Prüfung";
  if (statusKey === "rueckfrage") return "Rückfrage";
  if (statusKey === "abgelehnt") return "Abgelehnt";
  if (statusKey === "offen") return "Offen";
  return statusKey;
}

export function angebotOverviewStatusKey(item: PartnerAnfrageItem): string {
  return angebotListenStatus(item).pillKey;
}

function angebotListenStatus(item: PartnerAnfrageItem): {
  label: string;
  pillKey: string;
  hint?: string;
} {
  const hwSt = (item.hw_status ?? "").toLowerCase();
  if (hwSt === "uebernommen" && !item.projektvertrag_bestaetigt_am) {
    if (item.projektvertrag_bereit) {
      return {
        label: "Vertrag offen",
        pillKey: "vertrag_offen",
        hint: "→ Projektvertrag bestätigen",
      };
    }
    return {
      label: "Warte auf Vertrag",
      pillKey: "warte_vertrag",
      hint: "→ Bärenwald bereitet Vertrag vor",
    };
  }
  if (hwSt === "uebernommen") {
    return { label: "Bestätigt", pillKey: "uebernommen", hint: "→ Unter Aufträge" };
  }
  if (hwSt === "eingereicht") {
    return {
      label: "In Prüfung",
      pillKey: "eingereicht",
      hint: "→ Warte auf Freigabe durch Bärenwald",
    };
  }
  if (hwSt === "rueckfrage") {
    return {
      label: "Rückfrage",
      pillKey: "rueckfrage",
      hint: "→ Bitte erneut einreichen",
    };
  }
  if (hwSt === "abgelehnt") {
    return {
      label: "Abgelehnt",
      pillKey: "abgelehnt",
      hint: "→ Neues Angebot einreichen",
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
    item.antwort_at ?? item.gesendet_at,
    { plz: item.plz, ort: item.ort }
  );

  return {
    id: item.id,
    title: item.listen_titel,
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
    title: item.listen_titel,
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
