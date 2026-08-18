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
import {
  ensurePortalVorgangNotificationHref,
  vorgangIdFromPortalHref,
} from "@/lib/portal2/portal-detail-deep-link";

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
  const rawTitel = n.titel?.trim() || "";
  const link = ensurePortalVorgangNotificationHref({
    href: n.link,
    typ: n.typ,
  });
  return {
    id: n.id,
    typ,
    // Immer echten Titel bevorzugen — kein Fallback „Angebot freigabebereit“
    // bei unscharfem Typ-Mapping nach eigener Freigabe.
    titel: rawTitel || visual.title,
    text: n.body?.trim() || "",
    timeLabel: formatPortalNotifTime(n.created_at),
    unread: !n.gelesen_am,
    iconBg: visual.iconBg,
    iconFg: visual.iconFg,
    glyph: visual.glyph,
    link,
    vorgangRef: vorgangIdFromPortalHref(link),
    createdAt: n.created_at,
  };
}

export function partnerNotificationToPortalItem(
  n: PartnerNotificationRow
): PortalNotifItem {
  const typ = mapPartnerTypToPortalNotifTyp(n.typ);
  const visual = resolvePortalNotifVisual(typ, "handwerker");
  const leistung = n.leistung_name?.trim();
  const isUpdateBitte =
    n.typ === "bautagebuch" ||
    Boolean(leistung && /bitte\s+update\s+geben/i.test(leistung));
  const isAbnahmeBereit = Boolean(
    leistung && /abnahmeprotokoll\s+bereit/i.test(leistung)
  );
  const titel = isAbnahmeBereit
    ? "Abnahmeprotokoll bereit"
    : isUpdateBitte
      ? "Bitte Update geben"
      : visual.title;
  const text = isAbnahmeBereit
    ? n.projekt_name.trim() || "Projekt"
    : isUpdateBitte
      ? [
          n.projekt_name.trim() || "Projekt",
          leistung?.includes("Bautagebuch") ? "Bautagebuch" : null,
        ]
          .filter(Boolean)
          .join(" — ")
      : leistung
        ? `${n.projekt_name.trim() || "Projekt"} — ${leistung}`
        : n.projekt_name.trim() || visual.title;
  return {
    id: n.id,
    typ,
    titel,
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
  const link = ensurePortalVorgangNotificationHref({
    href: n.link,
    vorgangId: n.vorgang_ref,
    typ: n.typ,
  });
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
    link,
    vorgangRef: n.vorgang_ref?.trim() || vorgangIdFromPortalHref(link),
    createdAt: n.created_at,
  };
}
