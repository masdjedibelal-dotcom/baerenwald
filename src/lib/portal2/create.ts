/**
 * Portal 2.0 Create — Mock `canCreate()` / `createLabel()`.
 * N8: keine Nav-Rolle `mieter` — Mieter-WL über `kunde_privat` / hvPortalMode.
 */

import type { FunnelChannel } from "@/lib/funnel/funnel-variant";
import type { PortalNavRole } from "@/lib/portal2/nav-items";

/** Mock: `canCreate(){ return role !== 'handwerker' }` */
export function portalCanCreate(role: PortalNavRole): boolean {
  return role !== "handwerker";
}

/**
 * Mock `createLabel()`:
 * Privat „Schaden melden“ · sonst „Neuer Vorgang“.
 */
export function portalCreateLabel(role: PortalNavRole): string {
  if (role === "kunde_privat") return "Schaden melden";
  return "Neuer Vorgang";
}

/**
 * Create-Kanal für MeinBärenwald-PortalClient (ohne HV-Embedded).
 * Privat = Website-Flow mit Preis (`portal_privat`).
 * Gewerbe teilt denselben Kanal (Mieter/Eigentümer haben kein Portal mehr).
 */
export function portalClientCreateChannel(opts: {
  hvPortalMode?: boolean;
  kundeTyp: "hv" | "privat" | "gewerbe";
  navRole: PortalNavRole;
}): Extract<FunnelChannel, "portal_privat"> {
  void opts;
  return "portal_privat";
}
