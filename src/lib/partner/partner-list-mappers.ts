import type { PartnerListCardAccent, PartnerListCardMeta } from "@/components/partner/PartnerListCard";
import type {
  PartnerAnfrageItem,
  PartnerAuftragItem,
} from "@/lib/partner/get-partner-data";
import {
  partnerAngebotListenHint,
  partnerAngebotPortalStatusLabel,
  partnerAngebotPortalStatusPillKey,
  resolvePartnerAngebotPortalPhase,
} from "@/lib/partner/partner-angebot-portal-status";
import {
  isPartnerAnfrageAktionErforderlich,
  isPartnerAnfrageAntwortAbgelaufen,
  isPartnerAnfrageKonditionenNachreichung,
  isPartnerAnfrageWartetAufPreiseinigung,
  isPartnerAuftragAnfrageAktionErforderlich,
  isPartnerAuftragAnfrageAntwortAbgelaufen,
  isPartnerAuftragWartetAufPreiseinigung,
  partnerAnfrageStatusLabel,
  partnerAnfrageStatusPillKey,
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
  const aktion = isPartnerAnfrageAktionErforderlich(item);
  const abgelaufen = isPartnerAnfrageAntwortAbgelaufen(item);
  const wartet = isPartnerAnfrageWartetAufPreiseinigung(item);
  const meta = buildPartnerAnfrageCardMeta(item.lead, {
    gewerk_name: item.gewerk_name,
    positionen: item.positionen,
  });

  const hwSt = (item.hw_status ?? "").toLowerCase();
  let hint: string | undefined;
  if (aktion) {
    hint =
      hwSt === "bestaetigt"
        ? "→ Konditionen bestätigen"
        : isPartnerAnfrageKonditionenNachreichung(item)
          ? "→ Neue Leistung prüfen"
          : hwSt === "rueckfrage"
            ? "→ Neue Konditionen prüfen"
            : "→ Bitte annehmen oder ablehnen";
  } else if (wartet) {
    hint = "→ Warte auf Freigabe";
  }

  return {
    id: item.id,
    title: item.listen_titel,
    subtitle: isPartnerAnfrageKonditionenNachreichung(item)
      ? "Ergänzung zum bestehenden Auftrag"
      : undefined,
    statusLabel: partnerAnfrageStatusLabel(item),
    statusPillKey: partnerAnfrageStatusPillKey(item),
    accent: "anfrage",
    meta,
    hint,
    sortDate: ts(item.gesendet_at),
  };
}

export function mapAnfrageAuftragToCard(item: PartnerAuftragItem): PartnerCardRow {
  const aktion = isPartnerAuftragAnfrageAktionErforderlich(item);
  const abgelaufen = isPartnerAuftragAnfrageAntwortAbgelaufen(item);
  const wartet = isPartnerAuftragWartetAufPreiseinigung(item);

  const meta = buildPartnerAuftragCardMeta(
    item.lead?.objekt,
    item.lead,
    item.start_datum,
    item.end_datum
  );

  const ahSt = (item.angebotHwStatus ?? "").toLowerCase();
  let hint: string | undefined;
  if (aktion) {
    hint = "→ Bitte annehmen oder ablehnen";
  } else if (wartet) {
    hint = "→ Warte auf Freigabe";
  } else if (ahSt === "bestaetigt" && item.angebotHandwerkerId) {
    hint = "→ Konditionen in Anfrage bestätigen";
  } else if (ahSt === "uebernommen" && item.angebotHandwerkerId) {
    hint = "→ Unter Angebote";
  }

  let statusPillKey = item.hwStatus;
  if (abgelaufen) statusPillKey = "antwort_abgelaufen";
  else if (wartet) statusPillKey = "eingereicht";
  else if (ahSt === "rueckfrage") statusPillKey = "rueckfrage";
  else if (aktion) statusPillKey = "antwort ausstehend";

  return {
    id: `auftrag:${item.id}`,
    title: item.listen_titel,
    statusLabel: partnerAuftragAnfrageStatusLabel(item),
    statusPillKey,
    accent: "anfrage",
    meta,
    hint,
    sortDate: ts(item.start_datum),
  };
}

/** Sortierung: Freigabe offen → Warten → Übrige. */
export function angebotPhaseSortKey(item: PartnerAnfrageItem): number {
  const phase = resolvePartnerAngebotPortalPhase(item);
  if (phase === "auftrag_freigegeben") return 0;
  if (phase === "wartet_auf_freigabe") return 1;
  const hwSt = (item.hw_status ?? "").toLowerCase();
  if (hwSt === "uebernommen") return 2;
  if (item.hw_eingereicht_at) return 3;
  return 4;
}

export function partnerAngebotStatusPillClass(statusKey: string): string {
  const s = statusKey.toLowerCase();
  if (s === "uebernommen") return "tag bg-emerald-100 text-emerald-700";
  if (s === "geschlossen") return "tag bg-slate-100 text-slate-700";
  if (s === "auftrag_freigegeben") return "tag bg-violet-100 text-violet-800";
  if (s === "warte_freigabe") return "tag bg-slate-100 text-slate-700";
  if (s === "vertrag_offen") return "tag bg-violet-100 text-violet-800";
  if (s === "warte_vertrag") return "tag bg-slate-100 text-slate-700";
  if (s === "eingereicht") return "tag bg-blue-100 text-blue-800";
  if (s === "bestaetigt") return "tag bg-emerald-100 text-emerald-700";
  if (s === "rueckfrage") return "tag bg-amber-100 text-amber-800";
  if (s === "abgelehnt") return "tag bg-red-100 text-red-800";
  if (s === "offen") return "tag bg-amber-100 text-amber-700";
  return "tag bg-amber-100 text-amber-700";
}

export function partnerAngebotOverviewStatusLabel(statusKey: string): string {
  if (statusKey === "auftrag_freigegeben") return "Auftrag freigegeben";
  if (statusKey === "warte_freigabe") return "Warte auf Auftragsfreigabe";
  if (statusKey === "uebernommen") return "Angebot offen";
  if (statusKey === "vertrag_offen") return "Auftrag freigegeben";
  if (statusKey === "warte_vertrag") return "Warte auf Auftragsfreigabe";
  if (statusKey === "eingereicht") return "Wartet auf Prüfung";
  if (statusKey === "rueckfrage") return "Neue Konditionen";
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
  const phase = resolvePartnerAngebotPortalPhase(item);
  if (phase) {
    return {
      label: partnerAngebotPortalStatusLabel(item),
      pillKey: partnerAngebotPortalStatusPillKey(item),
      hint: partnerAngebotListenHint(item),
    };
  }

  const hwSt = (item.hw_status ?? "").toLowerCase();
  if (hwSt === "eingereicht") {
    return {
      label: "Wartet auf Prüfung",
      pillKey: "eingereicht",
      hint: "→ Warte auf Freigabe",
    };
  }
  if (hwSt === "rueckfrage") {
    return {
      label: "Neue Konditionen",
      pillKey: "rueckfrage",
      hint: "→ Bitte erneut prüfen",
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
