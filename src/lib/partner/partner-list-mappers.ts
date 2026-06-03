import { Calendar, Hammer, MapPin } from "lucide-react";

import type { PartnerListCardAccent, PartnerListCardMeta } from "@/components/partner/PartnerListCard";
import type {
  PartnerAnfrageItem,
  PartnerAuftragItem,
} from "@/lib/partner/get-partner-data";
import { isPartnerAnfrageOffen, partnerAnfrageStatusLabel } from "@/lib/partner/partner-anfrage-status";
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
  sortDate: number;
};

function fmtOrt(plz: string, ort: string): string {
  if (plz === "—" && ort === "—") return "—";
  if (ort === "—") return plz;
  return `${plz} · ${ort}`;
}

function ts(v?: string | null): number {
  if (!v) return 0;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function fmtDateDe(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-DE");
}

const PENDING_HW = new Set(["angefragt", "ausstehend", "warten", "offen", "zugewiesen"]);

export function mapAnfrageAngebotToCard(item: PartnerAnfrageItem): PartnerCardRow {
  const offen = isPartnerAnfrageOffen(item);
  return {
    id: item.id,
    title: item.angebot_titel,
    subtitle: item.gewerk_name,
    statusLabel: partnerAnfrageStatusLabel(item),
    statusPillKey: offen ? "antwort ausstehend" : item.status,
    accent: "anfrage",
    meta: [
      { icon: Hammer, text: item.gewerk_name },
      { icon: MapPin, text: fmtOrt(item.plz, item.ort) },
      { icon: Calendar, text: fmtDateDe(item.gesendet_at) },
    ],
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
  const pos = item.positionen[0];
  const leistung = pos
    ? `${pos.gewerk_name}${pos.leistung_name ? ` — ${pos.leistung_name}` : ""}`
    : undefined;

  return {
    id: `auftrag:${item.id}`,
    title: item.titel,
    subtitle: leistung,
    statusLabel: auftragHwStatusLabel(item.hwStatus),
    statusPillKey: item.hwStatus,
    accent: "anfrage",
    meta: [
      ...(leistung ? [{ icon: Hammer, text: leistung }] : []),
      { icon: MapPin, text: fmtOrt(item.plz, item.ort) },
      { icon: Calendar, text: fmtDateDe(item.start_datum) },
    ],
    hint: pending ? "→ Bitte annehmen oder ablehnen" : undefined,
    sortDate: ts(item.start_datum),
  };
}

export function mapAngebotToCard(item: PartnerAnfrageItem): PartnerCardRow {
  const offen = !item.hw_eingereicht_at;
  return {
    id: item.id,
    title: item.angebot_titel,
    subtitle: item.gewerk_name,
    statusLabel: offen ? "Offen" : "Eingereicht",
    statusPillKey: offen ? "offen" : "eingereicht",
    accent: "angebot",
    meta: [
      { icon: Hammer, text: item.gewerk_name },
      { icon: MapPin, text: fmtOrt(item.plz, item.ort) },
      { icon: Calendar, text: fmtDateDe(item.antwort_at ?? item.gesendet_at) },
    ],
    hint: offen ? "→ Angebot einreichen (Preis + PDF)" : undefined,
    sortDate: ts(item.antwort_at ?? item.gesendet_at),
  };
}

export function mapAuftragToCard(item: PartnerAuftragItem): PartnerCardRow {
  const fortschritt =
    item.fortschritt != null && Number.isFinite(item.fortschritt)
      ? `${Math.round(item.fortschritt)} %`
      : null;

  return {
    id: item.id,
    title: item.titel,
    statusLabel: item.status.replace(/_/g, " "),
    statusPillKey: item.status,
    accent: "auftrag",
    meta: [
      { icon: MapPin, text: fmtOrt(item.plz, item.ort) },
      { icon: Calendar, text: fmtDateDe(item.start_datum) },
      ...(fortschritt ? [{ icon: Hammer, text: `Fortschritt ${fortschritt}` }] : []),
    ],
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
