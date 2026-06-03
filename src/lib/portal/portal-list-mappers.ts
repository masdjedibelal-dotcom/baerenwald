import { Calendar, Hammer, MapPin } from "lucide-react";

import type {
  PortalListCardAccent,
  PortalListCardMeta,
} from "@/components/shared/PortalListCard";
import { fmtPortalDate, fmtPortalOrt } from "@/lib/shared/portal-detail-format";
import type { KundePortalDetailItem } from "@/lib/portal/portal-detail-item";

export type PortalCardRow = {
  id: string;
  title: string;
  subtitle?: string;
  statusLabel: string;
  statusPillKey: string;
  accent: PortalListCardAccent;
  meta: PortalListCardMeta[];
  sortDate: number;
};

function ts(v?: string | null): number {
  if (!v) return 0;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

export function mapKundeDetailToCard(
  item: KundePortalDetailItem,
  accent: PortalListCardAccent
): PortalCardRow {
  const ortLine = fmtPortalOrt(item.plz ?? "—", item.ort ?? "—");
  const meta: PortalListCardMeta[] = [];

  if (item.cardSubtitle) {
    meta.push({ icon: Hammer, text: item.cardSubtitle });
  }
  if (ortLine !== "—") {
    meta.push({ icon: MapPin, text: ortLine });
  }
  meta.push({ icon: Calendar, text: fmtPortalDate(item.date) });

  return {
    id: item.id,
    title: item.title,
    subtitle: item.cardSubtitle,
    statusLabel: item.status || "offen",
    statusPillKey: item.status || "offen",
    accent,
    meta,
    sortDate: ts(item.date),
  };
}

export function buildKundeCardRows(
  items: KundePortalDetailItem[],
  accent: PortalListCardAccent
): PortalCardRow[] {
  return items
    .map((item) => mapKundeDetailToCard(item, accent))
    .sort((a, b) => b.sortDate - a.sortDate);
}
