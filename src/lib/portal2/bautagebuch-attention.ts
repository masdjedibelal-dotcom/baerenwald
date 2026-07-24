/**
 * C3 — Bautagebuch-Attention für HV (Unread seit letzter Ansicht).
 * Client-only (localStorage); Mieter sehen kein BT.
 */

const STORAGE_PREFIX = "hv_bt_seen_v1:";

export function bautagebuchSeenStorageKey(leadId: string): string {
  return `${STORAGE_PREFIX}${leadId.trim()}`;
}

export function getBautagebuchLastSeenAt(leadId: string): string | null {
  if (typeof window === "undefined") return null;
  const id = leadId.trim();
  if (!id) return null;
  try {
    return window.localStorage.getItem(bautagebuchSeenStorageKey(id));
  } catch {
    return null;
  }
}

export function markBautagebuchSeen(
  leadId: string,
  atIso: string = new Date().toISOString()
): void {
  if (typeof window === "undefined") return;
  const id = leadId.trim();
  if (!id) return;
  try {
    window.localStorage.setItem(bautagebuchSeenStorageKey(id), atIso);
  } catch {
    /* ignore quota / private mode */
  }
}

export type BautagebuchAttentionEntry = {
  id?: string;
  created_at?: string | null;
  datum?: string | null;
};

/** Neuester Zeitstempel aus Einträgen. */
export function latestBautagebuchAt(
  entries: BautagebuchAttentionEntry[] | null | undefined
): string | null {
  let best: number | null = null;
  let bestIso: string | null = null;
  for (const e of entries ?? []) {
    const raw = (e.created_at ?? e.datum ?? "").trim();
    if (!raw) continue;
    const t = new Date(raw).getTime();
    if (!Number.isFinite(t)) continue;
    if (best == null || t > best) {
      best = t;
      bestIso = raw;
    }
  }
  return bestIso;
}

export function countUnreadBautagebuch(
  entries: BautagebuchAttentionEntry[] | null | undefined,
  lastSeenAt: string | null | undefined
): number {
  const list = entries ?? [];
  if (!list.length) return 0;
  if (!lastSeenAt?.trim()) return list.length;
  const seen = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(seen)) return list.length;
  return list.filter((e) => {
    const raw = (e.created_at ?? e.datum ?? "").trim();
    if (!raw) return true;
    const t = new Date(raw).getTime();
    if (!Number.isFinite(t)) return true;
    return t > seen;
  }).length;
}

export function hasUnreadBautagebuch(
  entries: BautagebuchAttentionEntry[] | null | undefined,
  lastSeenAt: string | null | undefined
): boolean {
  return countUnreadBautagebuch(entries, lastSeenAt) > 0;
}

/** Deep-Link auf BT-Section im Vorgang-Detail. */
export function bautagebuchDeepLink(leadId: string): string {
  const id = encodeURIComponent(leadId.trim());
  return `/portal?section=vorgaenge&id=${id}#bautagebuch`;
}
