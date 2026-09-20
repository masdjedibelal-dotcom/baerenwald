import type { PartnerListCardAccent, PartnerListCardMeta } from "@/components/partner/PartnerListCard";
import type {
  PartnerAnfrageItem,
  PartnerAuftragItem,
} from "@/lib/partner/get-partner-data";
import type { PartnerVorgangItem } from "@/lib/partner/build-partner-vorgaenge";
import { partnerVorgangLastActivityAt } from "@/lib/partner/build-partner-vorgaenge";
import {
  type VorgangFilter,
  vorgangPasstFilter,
} from "@/lib/partner/vorgang-state";
import { resolvePartnerVorgangCardStatus } from "@/lib/partner/partner-vorgang-display";
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
import { portalDetailStatusPillStyle } from "@/lib/shared/portal-detail-format";
import {
  formatAnfrageListOrtLine,
  type PortalAnfrageLeadSource,
} from "@/lib/portal/portal-anfrage-display";
import { compareVorgangListOrder } from "@/lib/portal/portal-vorgang-sort";
import type { VorgangState } from "@/lib/partner/vorgang-state";

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
  statusRank: number;
};

function partnerOrtSubtitle(
  lead?: PortalAnfrageLeadSource | null
): string | undefined {
  if (!lead) return undefined;
  const line = formatAnfrageListOrtLine(lead);
  return line !== "—" ? line : undefined;
}

function partnerStateSortRank(state: VorgangState | string): number {
  switch (String(state)) {
    case "neu":
      return 0;
    case "geaendert":
      return 1;
    case "in_bearbeitung":
      return 2;
    case "erledigt":
      return 80;
    case "abgelehnt":
      return 90;
    default:
      return 20;
  }
}

function ts(v?: string | null): number {
  if (!v) return 0;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

export function partnerAngebotStatusPillClass(statusKey: string): string {
  const s = statusKey.toLowerCase();
  if (s === "neu") return "bg-warning-bg text-warning-text";
  if (s === "geaendert" || s === "ergaenzung") return "bg-p2-bg text-p2-ink";
  if (
    s === "in_arbeit" ||
    s === "abnahme" ||
    s === "durchfuehrung" ||
    s === "auftrag" ||
    s === "beauftragt"
  ) {
    return "bg-[var(--p2-status-blue-bg)] text-[var(--p2-status-blue)]";
  }
  if (s === "abgeschlossen" || s === "erledigt") return "bg-[var(--p2-status-green-bg)] text-[var(--p2-status-green)]";
  if (s === "abgelehnt" || s === "storniert" || s === "antwort_abgelaufen") {
    return "bg-p2-danger-soft text-p2-danger";
  }
  return "bg-muted text-text-secondary";
}

/** Inline-Styles analog PORTAL_STATUS / PortalStatusPill Flow-Farben. */
export function partnerStatusChipStyle(statusKey: string): {
  color: string;
  backgroundColor: string;
} {
  return portalDetailStatusPillStyle(statusKey);
}

export function mapAnfrageAuftragToCard(item: PartnerAuftragItem): PartnerCardRow {
  return {
    id: `auftrag:${item.id}`,
    title: item.listen_titel,
    subtitle: partnerOrtSubtitle(item.lead),
    statusLabel: partnerAuftragAnfrageStatusLabel(item),
    statusPillKey: "neu",
    accent: "anfrage",
    meta: [],
    sortDate: ts(item.start_datum),
    statusRank: 0,
  };
}

export function mapAuftragToCard(item: PartnerAuftragItem): PartnerCardRow {
  const pill = partnerAuftragListenStatusPillKey(item.status);
  return {
    id: item.id,
    title: item.listen_titel,
    subtitle: partnerOrtSubtitle(item.lead),
    statusLabel: partnerAuftragListenStatusLabel(item.status),
    statusPillKey: pill,
    accent: "auftrag",
    meta: [],
    sortDate: ts(item.start_datum),
    statusRank: partnerStateSortRank(
      pill === "abgeschlossen" || pill === "erledigt" ? "erledigt" : "in_bearbeitung"
    ),
  };
}

export function mapOffenAngebotToCard(
  item: PartnerAnfrageItem & { offen_karten_typ: "neu" | "nachreichung" }
): PartnerCardRow {
  const typ = item.offen_karten_typ;

  return {
    id: item.id,
    title: item.listen_titel,
    subtitle: partnerOrtSubtitle(item.lead),
    statusLabel: partnerOffenStatusLabel(typ),
    statusPillKey: partnerOffenStatusPillKey(typ),
    accent: typ === "nachreichung" ? "anfrage" : "angebot",
    meta: [],
    sortDate: ts(item.gesendet_at ?? item.antwort_at),
    statusRank: typ === "nachreichung" ? 1 : 0,
  };
}

export function mapVorgangToCard(vorgang: PartnerVorgangItem): PartnerCardRow {
  const { auftrag, state, anfrage } = vorgang;
  const subtitle = partnerOrtSubtitle(auftrag.lead);

  const listenStatus = resolvePartnerVorgangCardStatus(vorgang);

  return {
    id: vorgang.id,
    title: auftrag.listen_titel,
    subtitle,
    statusLabel: listenStatus.label,
    statusPillKey: listenStatus.pillKey,
    accent:
      state === "neu" || state === "geaendert"
        ? state === "geaendert"
          ? "anfrage"
          : "angebot"
        : "auftrag",
    meta: [],
    hint: undefined,
    sortDate: partnerVorgangLastActivityAt(vorgang) || ts(
      anfrage?.gesendet_at ?? auftrag.start_datum ?? vorgang.handwerker_bestaetigt_at
    ),
    statusRank: partnerStateSortRank(state),
  };
}

export function buildVorgangCardRows(
  vorgaenge: PartnerVorgangItem[],
  filter: VorgangFilter
): PartnerCardRow[] {
  const rows = vorgaenge
    .filter((v) => vorgangPasstFilter(v.state, filter))
    .map(mapVorgangToCard);
  return rows.sort(compareVorgangListOrder);
}

export function buildOffenCardRows(offen: PartnerOffenItem[]): PartnerCardRow[] {
  const rows = offen.map((entry) => {
    if (entry.kind === "angebot") {
      return mapOffenAngebotToCard(entry.item);
    }
    return mapAnfrageAuftragToCard(entry.item);
  });
  return rows.sort(compareVorgangListOrder);
}

export function buildAuftraegeCardRows(
  auftraege: PartnerAuftragItem[],
  filter: "aktiv" | "erledigt",
  isAktiv: (item: PartnerAuftragItem) => boolean
): PartnerCardRow[] {
  return auftraege
    .filter((a) => (filter === "aktiv" ? isAktiv(a) : !isAktiv(a)))
    .map(mapAuftragToCard)
    .sort(compareVorgangListOrder);
}
