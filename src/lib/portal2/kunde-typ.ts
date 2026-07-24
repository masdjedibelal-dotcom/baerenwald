/**
 * Portal 2.0 D7 / ENTSCHEIDUNG 2 — `kundeTyp` aus Kundenstamm.
 * Gleiches Portal (Rolle kunde); Rendering per Kennung hv | privat | gewerbe.
 */

export type PortalKundeTyp = "hv" | "privat" | "gewerbe";

export type PortalKundeTypSource = {
  portal_modus?: string | null;
  /** Optional CRM-Feld `kunden.typ` (privat|gewerbe), falls vorhanden */
  typ?: string | null;
  kundentyp?: string | null;
};

/**
 * Kennung aus Stamm:
 * - `portal_modus=organisation` → hv
 * - sonst privat; gewerbe wenn typ/kundentyp = gewerbe
 */
export function resolvePortalKundeTyp(
  src: PortalKundeTypSource
): PortalKundeTyp {
  const modus = (src.portal_modus ?? "").trim().toLowerCase();
  if (modus === "organisation") return "hv";

  const tip = (src.typ ?? src.kundentyp ?? "").trim().toLowerCase();
  if (tip === "gewerbe" || tip === "b2b" || tip === "business") {
    return "gewerbe";
  }
  return "privat";
}

/** Mock-Nav-Rolle für Shell (gewerbe teilt privat-Nav). */
export function portalNavRoleForKundeTyp(
  typ: PortalKundeTyp
): "kunde_hv" | "kunde_privat" {
  return typ === "hv" ? "kunde_hv" : "kunde_privat";
}

export function portalKundeTypRoleLabel(typ: PortalKundeTyp): string {
  if (typ === "hv") return "Verwaltung";
  if (typ === "gewerbe") return "Gewerbe";
  return "Privatkunde";
}

export function portalKundeListeTitle(typ: PortalKundeTyp): string {
  if (typ === "hv") return "Vorgänge";
  return "Meine Vorgänge";
}

export function portalKundeDashboardHello(
  typ: PortalKundeTyp,
  name: string | null | undefined
): string {
  if (typ === "hv") {
    return name?.trim() || "Verwaltung";
  }
  const n = name?.trim();
  if (!n) return typ === "gewerbe" ? "Hallo" : "Hallo";
  const short = n.split(/\s+/)[0] || n;
  return `Hallo ${short}`;
}

/** Mock `listFor()` — Privat/Gewerbe sehen nur „eigene“ Vorgänge (Portal-Daten sind bereits kundenbezogen). */
export function listForOwnsAllPortalRows(_typ: PortalKundeTyp): boolean {
  return true;
}
