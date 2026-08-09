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
  if (item.cardSubtitle?.trim()) {
    const base = item.cardSubtitle.trim();
    if (item.wartetAufHwLabel?.trim()) {
      return `${base} · ${item.wartetAufHwLabel.trim()}`;
    }
    return base;
  }
  const metaTexts = item.cardMeta?.map((m) => m.text) ?? [];
  const ortParts = [item.plz, item.ort].filter(Boolean).join(" ");
  const adresse =
    metaTexts.find((t) =>
      /str|weg|allee|platz|gasse|\d{5}|plz|ort/i.test(t)
    ) ??
    (ortParts || undefined);
  const we = metaTexts.find((t) => /\bWE\b|Einheit|Whg/i.test(t));
  const person = metaTexts.find((t) =>
    /Melder|Mieter|\(/i.test(t)
  );
  const kategorie = item.anfrageGewerk?.trim();
  const parts = [
    adresse,
    we,
    person ?? kategorie,
    item.wartetAufHwLabel?.trim() || null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : undefined;
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
  const meta: PortalListCardMeta[] = item.cardMeta?.length
    ? item.cardMeta
    : mockListe
      ? (() => {
          // Mock-Liste (HV): Termin/Ort behalten, wenn vorhanden — nicht leeren.
          const fromFallback = buildFallbackCardMeta(item).filter(
            (m) => m.icon === "calendar" || m.icon === "map-pin"
          );
          return fromFallback;
        })()
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
    hint: resolveCardHint(item),
    sortDate: ts(item.date),
    statusRank: kundePillSortRank(
      item.statusPillKey || item.status || item.vorgangPhase
    ),
    hvMieterView: Boolean(item.hvMieterView),
    wartetAufHwLabel: item.wartetAufHwLabel ?? null,
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
