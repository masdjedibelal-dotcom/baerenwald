import type { ReactNode } from "react";
import type {
  PortalListCardAccent,
  PortalListCardMeta,
} from "@/components/shared/PortalListCard";
import { fmtPortalDate, fmtPortalOrt } from "@/lib/shared/portal-detail-format";
import type { KundePortalDetailItem } from "@/lib/portal/portal-detail-item";
import {
  compareVorgangListOrder,
  kundePillSortRank,
} from "@/lib/portal/portal-vorgang-sort";

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
  /** Niedrig = weiter oben (offen vor erledigt). */
  statusRank: number;
  /** HV-Lead im Mieter-Portal: kein Angebots-/HV-Status-Wording. */
  hvMieterView?: boolean;
  /** C4 */
  wartetAufHwLabel?: string | null;
  /** C3 — ungelesene BT-Einträge (Client setzt oft separat) */
  bautagebuch?: KundePortalDetailItem["bautagebuch"];
  leadId?: string;
};

function ts(v?: string | null): number {
  if (!v) return 0;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function buildMockSubtitle(item: KundePortalDetailItem): string | undefined {
  // Mock-Liste: nur Anschrift (cardSubtitle bereits so gebaut).
  if (item.cardSubtitle?.trim()) return item.cardSubtitle.trim();
  const ortParts = [item.plz, item.ort].filter(Boolean).join(" ");
  return ortParts || undefined;
}

function buildFallbackCardMeta(item: KundePortalDetailItem): PortalListCardMeta[] {
  const ortLine = fmtPortalOrt(item.plz ?? "—", item.ort ?? "—");
  const lines: PortalListCardMeta[] = [];
  if (item.cardSubtitle) {
    lines.push({ icon: "hammer", text: item.cardSubtitle });
  }
  if (ortLine !== "—") {
    lines.push({ icon: "map-pin", text: ortLine });
  }
  lines.push({ icon: "calendar", text: fmtPortalDate(item.date) });
  return lines;
}

function resolveCardHint(item: KundePortalDetailItem): string | undefined {
  if (item.actionHint?.trim()) return item.actionHint.trim();
  if (item.wartetAufHwLabel?.trim()) return item.wartetAufHwLabel.trim();
  if (item.needsAction) {
    return item.isAuftragDetail
      ? "To-do: Änderungen prüfen & annehmen"
      : "To-do: Angebot prüfen & annehmen";
  }
  return undefined;
}

export function mapKundeDetailToCard(
  item: KundePortalDetailItem,
  accent: PortalListCardAccent,
  opts?: { mockListe?: boolean }
): PortalCardRow {
  const mockListe = opts?.mockListe === true;
  // Mock-Liste: Meta weglassen — Anschrift steht nur im Subtitle.
  const meta: PortalListCardMeta[] = mockListe
    ? []
    : item.cardMeta?.length
      ? item.cardMeta
      : buildFallbackCardMeta(item);

  return {
    id: item.id,
    title: item.title,
    subtitle: mockListe
      ? buildMockSubtitle(item)
      : item.cardMeta?.length
        ? undefined
        : item.cardSubtitle,
    statusLabel: item.status || "offen",
    statusPillKey: item.statusPillKey || item.status || "offen",
    accent,
    meta,
    footer: mockListe ? undefined : item.listFooter,
    hint: mockListe ? undefined : resolveCardHint(item),
    sortDate: ts(item.date),
    statusRank: kundePillSortRank(
      item.statusPillKey || item.status || item.vorgangPhase
    ),
    hvMieterView: Boolean(item.hvMieterView),
    wartetAufHwLabel: mockListe ? null : item.wartetAufHwLabel ?? null,
    bautagebuch: item.hvMieterView ? undefined : item.bautagebuch,
    leadId: item.leadId ?? item.id,
  };
}

export function buildKundeCardRows(
  items: KundePortalDetailItem[],
  accent: PortalListCardAccent
): PortalCardRow[] {
  return items
    .map((item) => mapKundeDetailToCard(item, accent))
    .sort(compareVorgangListOrder);
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
    .sort(compareVorgangListOrder);
}
