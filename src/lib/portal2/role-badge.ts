import { PALETTE } from "@/lib/tokens/palette";
/**
 * Portal 2.0 B5 — Mock `roleBadge(r)`.
 * Quelle: Baerenwald Portale (5).html
 */

export type PortalRoleBadgeRole =
  | "mieter"
  | "kunde"
  | "eigentuemer"
  | "hausmeister"
  | "handwerker";

export type PortalRoleBadgeStyle = {
  label: string;
  bg: string;
  color: string;
};

/** Mock `M` in `roleBadge` — Werte unverändert. */
export const PORTAL_ROLE_BADGE: Record<
  PortalRoleBadgeRole,
  PortalRoleBadgeStyle
> = {
  mieter: { label: "Mieter", bg: "var(--p2-status-blue-bg)", color: "var(--p2-status-blue)" },
  kunde: { label: "Kunde", bg: "var(--p2-primary-soft)", color: "var(--p2-primary)" },
  eigentuemer: { label: "Eigentümer", bg: PALETTE.hede7f6, color: PALETTE.h5b3fa8 },
  hausmeister: { label: "Hausmeister", bg: PALETTE.he8f5e9, color: PALETTE.h2e7d32 },
  handwerker: { label: "Partner", bg: "var(--p2-status-sand-bg)", color: "var(--p2-sand-text)" },
};

/** Nav-/Auth-Rollen → Badge-Rolle. */
export function toPortalRoleBadgeRole(
  role: string | null | undefined
): PortalRoleBadgeRole {
  if (role === "mieter") return "mieter";
  if (role === "eigentuemer") return "eigentuemer";
  if (role === "hausmeister") return "hausmeister";
  if (role === "handwerker") return "handwerker";
  if (role === "kunde_hv" || role === "kunde_privat" || role === "kunde") {
    return "kunde";
  }
  return "mieter";
}

export function getPortalRoleBadge(
  role: PortalRoleBadgeRole | string
): PortalRoleBadgeStyle {
  if (role in PORTAL_ROLE_BADGE) {
    return PORTAL_ROLE_BADGE[role as PortalRoleBadgeRole];
  }
  return PORTAL_ROLE_BADGE[toPortalRoleBadgeRole(role)];
}

/**
 * Mock `portalHeader` Initialen:
 * `who.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()`
 */
export function portalHeaderInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
