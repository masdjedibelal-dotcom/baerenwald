/**
 * Adapter: Legacy HV-/Partner-Zeilen → PortalNotifItem (Mock-Visual).
 */
import type { PartnerNotificationRow } from "@/lib/partner/partner-notifications";
import { resolvePartnerNotificationLink } from "@/lib/partner/partner-site-url";
import {
  formatPortalNotifTime,
  mapHvTypToPortalNotifTyp,
  mapPartnerTypToPortalNotifTyp,
  resolvePortalNotifVisual,
  type PortalNotifItem,
  type PortalNotifRole,
} from "@/lib/portal2/notif-types";

export type HvNotificationRow = {
  id: string;
  typ: string;
  titel: string;
  body?: string | null;
  link?: string | null;
  gelesen_am?: string | null;
  created_at: string;
};

export type PortalNotificationRow = {
  id: string;
  typ: string;
  titel: string;
  body: string;
  vorgang_ref?: string | null;
  link?: string | null;
  gelesen: boolean;
  created_at: string;
  icon_bg?: string | null;
  icon_fg?: string | null;
  icon_glyph?: string | null;
};

export function hvNotificationToPortalItem(
  n: HvNotificationRow,
  role: PortalNotifRole = "kunde"
): PortalNotifItem {
  const typ = mapHvTypToPortalNotifTyp(n.typ);
  const visual = resolvePortalNotifVisual(typ, role);
  return {
    id: n.id,
    typ,
    titel: n.titel || visual.title,
    text: n.body?.trim() || "",
    timeLabel: formatPortalNotifTime(n.created_at),
    unread: !n.gelesen_am,
    iconBg: visual.iconBg,
    iconFg: visual.iconFg,
    glyph: visual.glyph,
    link: n.link,
    createdAt: n.created_at,
  };
}

export function partnerNotificationToPortalItem(
  n: PartnerNotificationRow
): PortalNotifItem {
  const typ = mapPartnerTypToPortalNotifTyp(n.typ);
  const visual = resolvePortalNotifVisual(typ, "handwerker");
  const leistung = n.leistung_name?.trim();
  const text = leistung
    ? `${n.projekt_name.trim() || "Projekt"} — ${leistung}`
    : n.projekt_name.trim() || visual.title;
  return {
    id: n.id,
    typ,
    titel: visual.title,
    text,
    timeLabel: formatPortalNotifTime(n.created_at),
    unread: !n.gelesen,
    iconBg: visual.iconBg,
    iconFg: visual.iconFg,
    glyph: visual.glyph,
    link: resolvePartnerNotificationLink(n.link),
    vorgangRef: n.link,
    createdAt: n.created_at,
  };
}

export function portalNotificationRowToItem(
  n: PortalNotificationRow,
  role?: PortalNotifRole
): PortalNotifItem {
  const typ = mapHvTypToPortalNotifTyp(n.typ);
  const visual = resolvePortalNotifVisual(typ, role);
  return {
    id: n.id,
    typ,
    titel: n.titel || visual.title,
    text: n.body ?? "",
    timeLabel: formatPortalNotifTime(n.created_at),
    unread: !n.gelesen,
    iconBg: n.icon_bg || visual.iconBg,
    iconFg: n.icon_fg || visual.iconFg,
    glyph: n.icon_glyph || visual.glyph,
    link: n.link,
    vorgangRef: n.vorgang_ref,
    createdAt: n.created_at,
  };
}
