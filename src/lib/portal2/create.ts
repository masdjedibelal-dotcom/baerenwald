/**
 * Portal 2.0 Create — Mock `canCreate()` / `createLabel()`.
 */

import type { PortalNavRole } from "@/lib/portal2/nav-items";

/** Mock: `canCreate(){ return role !== 'handwerker' }` */
export function portalCanCreate(role: PortalNavRole): boolean {
  return role !== "handwerker";
}

/**
 * Mock `createLabel()`:
 * Mieter „Schaden melden“ · Eigentümer „Anfrage erstellen“ · sonst „Neuer Vorgang“.
 */
export function portalCreateLabel(role: PortalNavRole): string {
  if (role === "mieter") return "Schaden melden";
  if (role === "eigentuemer") return "Anfrage erstellen";
  return "Neuer Vorgang";
}
