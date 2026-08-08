/** CustomEvent — Glocken nach Mark-as-read neu laden. */
export const PORTAL_NOTIFICATIONS_CHANGED_EVENT = "portal-notifications-changed";

export function emitPortalNotificationsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PORTAL_NOTIFICATIONS_CHANGED_EVENT));
}
