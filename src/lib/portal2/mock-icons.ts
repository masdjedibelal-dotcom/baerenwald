import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Bell,
  Building2,
  Calendar,
  Check,
  Euro,
  FileText,
  Home,
  LayoutDashboard,
  LayoutGrid,
  List,
  Lock,
  Mail,
  MoreHorizontal,
  Package,
  Pencil,
  Search,
  Settings,
  Star,
  WifiOff,
  Wrench,
  X,
  Zap,
} from "lucide-react";

/**
 * Mock-Icon-Namen → lucide-react (CRM-Lösung portiert + Portal-Nav).
 * Kein generischer Fallback — unbekannte Namen scheitern bewusst.
 */
export const ICON_MAP = {
  "layout-dashboard": LayoutDashboard,
  list: List,
  building: Building2,
  package: Package,
  settings: Settings,
  home: Home,
  bell: Bell,
  check: Check,
  x: X,
  search: Search,
  "wifi-off": WifiOff,
  star: Star,
  "star-filled": Star,
  "alert-triangle": AlertTriangle,
  mail: Mail,
  "file-text": FileText,
  lock: Lock,
  pencil: Pencil,
  dots: MoreHorizontal,
  zap: Zap,
  calendar: Calendar,
  wrench: Wrench,
  euro: Euro,
  grid: LayoutGrid,
} as const satisfies Record<string, LucideIcon>;

export type MockIconName = keyof typeof ICON_MAP;

export function isMockIconName(n: string): n is MockIconName {
  return Object.prototype.hasOwnProperty.call(ICON_MAP, n);
}

export function resolveMockIcon(n: MockIconName | string): LucideIcon {
  if (!isMockIconName(n)) {
    throw new Error(`Unbekanntes Mock-Icon: "${n}"`);
  }
  return ICON_MAP[n];
}

/**
 * Mock-Glyphen (Portal-HTML) → MockIcon-Name.
 * Weitere Glyphen beim Screen-Bau hier ergänzen + Entscheidungslog.
 */
export const PORTAL_GLYPH_TO_ICON = {
  "◈": "layout-dashboard",
  "▤": "list",
  "▦": "building",
  "◇": "package",
  "⚙": "settings",
  "✓": "check",
  "✕": "x",
  "★": "star",
  "⭐": "star-filled",
  "⚠": "alert-triangle",
  "✉": "mail",
  "📄": "file-text",
  "🔔": "bell",
  "🔒": "lock",
  "🏠": "home",
  "⋯": "dots",
  "✎": "pencil",
  "⚡": "zap",
  "🔍": "search",
  "📡": "wifi-off",
  "📅": "calendar",
  "🔧": "wrench",
  "€": "euro",
  "▧": "grid",
} as const satisfies Record<string, MockIconName>;

export type PortalGlyph = keyof typeof PORTAL_GLYPH_TO_ICON;

export function isPortalGlyph(g: string): g is PortalGlyph {
  return Object.prototype.hasOwnProperty.call(PORTAL_GLYPH_TO_ICON, g);
}

export function resolvePortalGlyph(glyph: string): LucideIcon {
  if (!isPortalGlyph(glyph)) {
    throw new Error(`Unbekanntes Portal-Mock-Glyph: "${glyph}"`);
  }
  return resolveMockIcon(PORTAL_GLYPH_TO_ICON[glyph]);
}

/** Pflicht-Kontext → CSS-Variable `--icon-*` (CRM-Token-Set, Portal-Scope). */
export const MOCK_ICON_CTX = [
  "default",
  "muted",
  "emphasis",
  "active",
  "nav",
  "nav-active",
  "row",
  "row-hover",
  "sidebar",
  "sidebar-hover",
  "sidebar-active",
] as const;

export type MockIconCtx = (typeof MOCK_ICON_CTX)[number];

export function isMockIconCtx(c: string): c is MockIconCtx {
  return (MOCK_ICON_CTX as readonly string[]).includes(c);
}

/** Sidebar-Nav laut Mock `navItems()` — Glyph → Icon-Name. */
export const PORTAL_NAV_ICONS = {
  home: "layout-dashboard",
  liste: "list",
  objekte: "building",
  servicepakete: "package",
  settings: "settings",
} as const satisfies Record<string, MockIconName>;
