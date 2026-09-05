/**
 * Portal 2.0 Create — Mock `canCreate()` / `createLabel()`.
 */

import type { FunnelChannel } from "@/lib/funnel/funnel-variant";
import type { PortalNavRole } from "@/lib/portal2/nav-items";

/** Mock: `canCreate(){ return role !== 'handwerker' }` */
export function portalCanCreate(role: PortalNavRole): boolean {
  return role !== "handwerker";
}

/**
 * Mock `createLabel()`:
 * Mieter / Privatkunde „Schaden melden“ · Eigentümer „Anfrage erstellen“ · sonst „Neuer Vorgang“.
 */
export function portalCreateLabel(role: PortalNavRole): string {
  if (role === "mieter" || role === "kunde_privat") return "Schaden melden";
  if (role === "eigentuemer") return "Anfrage erstellen";
  return "Neuer Vorgang";
}

/** FAB/Create-Funnel-Channel — nicht mit Label vermischen. */
export function portalCreateChannel(
  role: PortalNavRole
): Extract<
  FunnelChannel,
  "portal_privat" | "portal_eigentuemer" | "portal_mieter"
> {
  if (role === "eigentuemer") return "portal_eigentuemer";
  if (role === "mieter") return "portal_mieter";
  if (role === "kunde_privat") return "portal_privat";
  return "portal_privat";
}
