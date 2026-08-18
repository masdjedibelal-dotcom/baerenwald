/**
 * Portal 2.0 B5 — Mock `roleBadge(r)`.
 * Quelle: Baerenwald Portale (5).html
 */

export type PortalRoleBadgeRole =
  | "mieter"
  | "kunde"
  | "eigentuemer"
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
  mieter: { label: "Mieter", bg: "#E4ECF7", color: "#1F4FA8" },
  kunde: { label: "Kunde", bg: "#E7F1E9", color: "#2E7D52" },
  eigentuemer: { label: "Eigentümer", bg: "#EDE7F6", color: "#5B3FA8" },
  handwerker: { label: "Handwerker", bg: "#FBF1D6", color: "#8A5A06" },
};

/** Nav-/Auth-Rollen → Badge-Rolle. */
export function toPortalRoleBadgeRole(
  role: string | null | undefined
): PortalRoleBadgeRole {
  if (role === "mieter") return "mieter";
  if (role === "eigentuemer") return "eigentuemer";
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
