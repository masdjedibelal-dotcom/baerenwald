/**
 * Deep-Link aus Notifications → Vorgangs-Detail-Tab.
 * Preferiert Query `tab=` (App-Router-sicher); Hash `#…` bleibt kompatibel.
 */

export const PORTAL_DETAIL_TAB_QUERY = "tab";

export type PortalDeepLinkTab =
  | "uebersicht"
  | "angebot"
  | "bautagebuch"
  | "dokumente"
  | "feedback"
  | "hm_pruefung";

const TAB_ALIASES: Record<string, PortalDeepLinkTab> = {
  uebersicht: "uebersicht",
  details: "uebersicht",
  detail: "uebersicht",
  angebot: "angebot",
  freigabe: "angebot",
  bautagebuch: "bautagebuch",
  dokumentation: "bautagebuch",
  doku: "bautagebuch",
  dokumente: "dokumente",
  feedback: "feedback",
  hm_pruefung: "hm_pruefung",
  hausmeister: "hm_pruefung",
  befund: "hm_pruefung",
};

export function normalizePortalDeepLinkTab(
  raw: string | null | undefined
): PortalDeepLinkTab | null {
  const key = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^#/, "");
  if (!key) return null;
  return TAB_ALIASES[key] ?? null;
}

/** Notification-Typ → Ziel-Tab (falls Link keinen tab/hash hat). */
export function portalDeepLinkTabFromNotifTyp(
  typ: string | null | undefined
): PortalDeepLinkTab | null {
  const t = String(typ ?? "")
    .toLowerCase()
    .trim();
  if (!t) return null;
  if (
    t.includes("tagebuch") ||
    t.includes("dokumentation") ||
    t === "vor_ort" ||
    t === "bautagebuch"
  ) {
    return "bautagebuch";
  }
  if (
    t.includes("angebot") ||
    t.includes("freigabe") ||
    t.includes("schwellen")
  ) {
    return "angebot";
  }
  if (t.includes("dokument") || t.includes("rechnung") || t.includes("pdf")) {
    return "dokumente";
  }
  if (t.includes("feedback") || t.includes("maengel") || t.includes("mängel")) {
    return "feedback";
  }
  return "uebersicht";
}

function parseHref(href: string): URL {
  const raw = href.trim();
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return new URL(raw);
  }
  return new URL(raw.startsWith("/") ? raw : `/${raw}`, "https://local.invalid");
}

export function portalDeepLinkTabFromHref(
  href: string | null | undefined
): PortalDeepLinkTab | null {
  if (!href?.trim()) return null;
  try {
    const u = parseHref(href);
    const fromQuery = normalizePortalDeepLinkTab(
      u.searchParams.get(PORTAL_DETAIL_TAB_QUERY)
    );
    if (fromQuery) return fromQuery;
    return normalizePortalDeepLinkTab(u.hash);
  } catch {
    const mTab = href.match(/[?&]tab=([^&#]+)/i);
    if (mTab?.[1]) {
      return normalizePortalDeepLinkTab(decodeURIComponent(mTab[1]));
    }
    const mHash = href.match(/#([A-Za-z0-9_-]+)/);
    return normalizePortalDeepLinkTab(mHash?.[1]);
  }
}

export function vorgangIdFromPortalHref(
  href: string | null | undefined
): string | null {
  if (!href?.trim()) return null;
  try {
    const u = parseHref(href);
    return u.searchParams.get("id")?.trim() || null;
  } catch {
    const m = href.match(/[?&]id=([^&#]+)/i);
    return m?.[1] ? decodeURIComponent(m[1]) : null;
  }
}

/**
 * Baut einen Portal-Link mit section/id/tab (Hash optional für Legacy-Listener).
 */
export function withPortalDetailDeepLink(
  href: string,
  tab: PortalDeepLinkTab | null | undefined
): string {
  try {
    const u = parseHref(href);
    if (!u.searchParams.get("section")) {
      u.searchParams.set("section", "vorgaenge");
    }
    if (tab) {
      u.searchParams.set(PORTAL_DETAIL_TAB_QUERY, tab);
      u.hash = tab === "bautagebuch" ? "bautagebuch" : tab;
    }
    const path = `${u.pathname}${u.search}${u.hash}`;
    return href.startsWith("http") ? u.toString() : path;
  } catch {
    if (!tab) return href;
    const join = href.includes("?") ? "&" : "?";
    const hasTab = /[?&]tab=/i.test(href);
    const base = hasTab
      ? href.replace(/([?&])tab=[^&#]*/i, `$1tab=${encodeURIComponent(tab)}`)
      : `${href}${join}tab=${encodeURIComponent(tab)}`;
    if (base.includes("#")) return base.replace(/#.*$/, `#${tab}`);
    return `${base}#${tab}`;
  }
}

/** Notification-Link normalisieren: id + tab aus Typ/Hash. */
export function ensurePortalVorgangNotificationHref(opts: {
  href: string | null | undefined;
  vorgangId?: string | null;
  typ?: string | null;
}): string | null {
  const raw = opts.href?.trim() || "";
  const id =
    opts.vorgangId?.trim() ||
    vorgangIdFromPortalHref(raw) ||
    null;
  if (!id && !raw) return null;

  const base =
    raw ||
    `/portal?section=vorgaenge&id=${encodeURIComponent(id!)}`;

  let href = base;
  try {
    const u = parseHref(href);
    if (!u.searchParams.get("section")) {
      u.searchParams.set("section", "vorgaenge");
    }
    if (id && !u.searchParams.get("id")) {
      u.searchParams.set("id", id);
    }
    href = `${u.pathname}${u.search}${u.hash}`;
  } catch {
    /* keep */
  }

  const tab =
    portalDeepLinkTabFromHref(href) ||
    portalDeepLinkTabFromNotifTyp(opts.typ) ||
    null;

  return withPortalDetailDeepLink(href, tab);
}

/** HV Section-Nav Ids vs. einfache PortalVorgangDetail-Tabs. */
export function portalDeepLinkTabForHvNav(
  tab: PortalDeepLinkTab
): "uebersicht" | "angebot" | "bautagebuch" | "dokumente" | "hm_pruefung" {
  if (tab === "feedback") return "uebersicht";
  return tab;
}

export function portalDeepLinkTabForSimpleNav(
  tab: PortalDeepLinkTab
): "details" | "bautagebuch" | "dokumente" | "feedback" {
  if (tab === "uebersicht" || tab === "angebot" || tab === "hm_pruefung") {
    return "details";
  }
  return tab;
}
