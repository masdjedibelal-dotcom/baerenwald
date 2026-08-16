/**
 * Kundentyp bei MeinBärenwald-Selbstregistrierung → CRM `kunden.typ`.
 * (Einladungen Mieter/Eigentümer/Hausmeister nutzen das nicht.)
 */

export type PortalRegisterKundeTyp = "privat" | "gewerbe" | "hausverwaltung";

export const PORTAL_REGISTER_KUNDE_TYP_OPTIONS: {
  value: PortalRegisterKundeTyp;
  label: string;
  hint: string;
}[] = [
  {
    value: "privat",
    label: "Privat",
    hint: "Privatperson / Eigentümer / Mieter",
  },
  {
    value: "gewerbe",
    label: "Gewerbe",
    hint: "Firma, Praxis, Gastronomie",
  },
  {
    value: "hausverwaltung",
    label: "Hausverwaltung",
    hint: "Verwaltung von Wohn- oder Gewerbeobjekten",
  },
];

export function normalizePortalRegisterKundeTyp(
  raw: unknown
): PortalRegisterKundeTyp | null {
  const t = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (t === "privat" || t === "gewerbe" || t === "hausverwaltung") return t;
  return null;
}

/** HV-Org im Portal; Privat/Gewerbe bleiben `privat`. */
export function portalModusForRegisterKundeTyp(
  typ: PortalRegisterKundeTyp
): "privat" | "organisation" {
  return typ === "hausverwaltung" ? "organisation" : "privat";
}
