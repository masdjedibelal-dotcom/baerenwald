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
  idLabel?: string;
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

/** Mock-ID wie V-1039 — deterministisch aus UUID. */
export function formatMockVorgangIdLabel(id: string): string {
  const hex = id.replace(/[^a-fA-F0-9]/g, "");
  const n = parseInt(hex.slice(-4) || "0", 16);
  if (!Number.isFinite(n)) return id.slice(0, 8).toUpperCase();
  return `V-${String(n % 10000).padStart(4, "0")}`;
}

function buildMockSubtitle(item: KundePortalDetailItem): string | undefined {
  if (item.cardSubtitle?.trim()) return item.cardSubtitle.trim();
  const metaTexts = item.cardMeta?.map((m) => m.text) ?? [];
  const ortParts = [item.plz, item.ort].filter(Boolean).join(" ");
  const adresse =
    metaTexts.find((t) =>
      /str|weg|allee|platz|gasse|\d{5}|plz|ort/i.test(t)
    ) ??
    (ortParts || undefined);
  const we = metaTexts.find((t) => /\bWE\b|Einheit|Whg/i.test(t));
  const person = metaTexts.find((t) =>
    /Melder|Eigentümer|Mieter|\(/i.test(t)
  );
  const kategorie = item.anfrageGewerk?.trim();
  const parts = [adresse, we, person ?? kategorie].filter(Boolean);
  return parts.length ? parts.join(" · ") : undefined;
}

export function mapKundeDetailToCard(
  item: KundePortalDetailItem,
  accent: PortalListCardAccent,
  opts?: { mockListe?: boolean }
): PortalCardRow {
  const mockListe = opts?.mockListe === true;
  const meta: PortalListCardMeta[] = mockListe
    ? []
    : item.cardMeta?.length
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
    subtitle: mockListe
      ? buildMockSubtitle(item)
      : item.cardMeta?.length
        ? undefined
        : item.cardSubtitle,
    idLabel: mockListe
      ? formatMockVorgangIdLabel(item.leadId ?? item.id)
      : undefined,
    statusLabel: item.status || "offen",
    statusPillKey: item.statusPillKey || item.status || "offen",
    accent,
    meta,
    footer: mockListe ? undefined : item.listFooter,
    hint: mockListe
      ? undefined
      : item.actionHint ??
        (item.needsAction
          ? item.isAuftragDetail
            ? "To-do: Änderungen prüfen & annehmen"
            : "To-do: Angebot prüfen & annehmen"
          : undefined),
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
  items: KundePortalDetailItem[],
  opts?: { mockListe?: boolean }
): PortalCardRow[] {
  return items
    .map((item) =>
      mapKundeDetailToCard(item, kundeVorgangAccent(item), opts)
    )
    .sort((a, b) => b.sortDate - a.sortDate);
}
