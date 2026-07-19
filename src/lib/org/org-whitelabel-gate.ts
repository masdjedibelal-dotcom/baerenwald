import type { OrgMitgliedRolle } from "@/lib/org/org-rbac";
import {
  orgWhitelabelReady,
  type OrgWhitelabelFields,
} from "@/lib/org/org-mieter-kontakt";

/** Übergangsfrist für Bestands-HVs nach aktiver Ansprache. */
export const ORG_WL_GATE_GRACE_DAYS = 30;

/** Fallback wenn wl_ansprache_am noch nicht gesetzt (WL-Wave Go-Live). */
export const ORG_WL_ANSRACHE_FALLBACK = "2026-07-09T00:00:00+02:00";

export type OrgWlGateFields = OrgWhitelabelFields & {
  wl_ansprache_am?: string | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function orgWlAnspracheAt(org: Pick<OrgWlGateFields, "wl_ansprache_am">): Date {
  const raw = org.wl_ansprache_am?.trim() || ORG_WL_ANSRACHE_FALLBACK;
  return new Date(raw);
}

/** Nach Ablauf der Übergangsfrist: Gate blockiert alle Org-Nutzer. */
export function orgWhitelabelGateHardEnforced(
  org: Pick<OrgWlGateFields, "wl_ansprache_am">,
  now = new Date()
): boolean {
  const elapsed = now.getTime() - orgWlAnspracheAt(org).getTime();
  return elapsed >= ORG_WL_GATE_GRACE_DAYS * MS_PER_DAY;
}

export function orgWhitelabelGateDaysRemaining(
  org: Pick<OrgWlGateFields, "wl_ansprache_am">,
  now = new Date()
): number {
  const deadline =
    orgWlAnspracheAt(org).getTime() + ORG_WL_GATE_GRACE_DAYS * MS_PER_DAY;
  return Math.max(0, Math.ceil((deadline - now.getTime()) / MS_PER_DAY));
}

/** Gate-Overlay anzeigen? Vor Hard-Enforcement nur Admins; danach alle. */
export function orgWhitelabelGateVisible(
  org: OrgWlGateFields,
  rolle: OrgMitgliedRolle,
  now = new Date()
): boolean {
  if (orgWhitelabelReady(org)) return false;
  if (orgWhitelabelGateHardEnforced(org, now)) return true;
  return rolle === "admin";
}

export function orgWhitelabelGateCanComplete(rolle: OrgMitgliedRolle): boolean {
  return rolle === "admin";
}
