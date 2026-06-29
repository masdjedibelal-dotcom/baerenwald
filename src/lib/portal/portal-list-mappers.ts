import type { ReactNode } from "react";
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
  footer?: ReactNode;
  hint?: string;
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
  const meta: PortalListCardMeta[] = item.cardMeta?.length
    ? item.cardMeta
    : (() => {
        const ortLine = fmtPortalOrt(item.plz ?? "—", item.ort ?? "—");
        const lines: PortalListCardMeta[] = [];
        if (item.cardSubtitle) {
          lines.push({ icon: Hammer, text: item.cardSubtitle });
        }
        if (ortLine !== "—") {
          lines.push({ icon: MapPin, text: ortLine });
        }
        lines.push({ icon: Calendar, text: fmtPortalDate(item.date) });
        return lines;
      })();

  return {
    id: item.id,
    title: item.title,
    subtitle: item.cardMeta?.length ? undefined : item.cardSubtitle,
    statusLabel: item.status || "offen",
    statusPillKey: item.statusPillKey || item.status || "offen",
    accent,
    meta,
    footer: item.listFooter,
    hint: item.needsAction
      ? item.isAuftragDetail
        ? "To-do: Änderungen prüfen & annehmen"
        : "To-do: Angebot prüfen & annehmen"
      : undefined,
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

export function kundeVorgangAccent(item: KundePortalDetailItem): PortalListCardAccent {
  if (item.isAuftragDetail) return "auftrag";
  if (item.isAngebotDetail) return "angebot";
  return "anfrage";
}

export function buildKundeVorgangCardRows(
  items: KundePortalDetailItem[]
): PortalCardRow[] {
  return items
    .map((item) => mapKundeDetailToCard(item, kundeVorgangAccent(item)))
    .sort((a, b) => b.sortDate - a.sortDate);
}
