import { PORTAL_VAR } from "@/lib/portal2/tokens";

/**
 * White-Label Brand-Presets — Mock `BRAND_PRESETS` + Default-`ORG`
 * Quelle: Baerenwald Portale (5).html
 */

export type BrandPreset = {
  id: string;
  name: string;
  primary: string;
  primaryDk: string;
  soft: string;
};

/** Exakt Mock `BRAND_PRESETS`. */
export const BRAND_PRESETS: readonly BrandPreset[] = [
  {
    id: "blau",
    name: "Steiner-Blau",
    primary: "#22508C",
    primaryDk: "#1b426f",
    soft: "#E8EEF6",
  },
  {
    id: "anthra",
    name: "Anthrazit",
    primary: "#363B41",
    primaryDk: "#24282d",
    soft: "#ECEEF0",
  },
  {
    id: "gruen",
    name: "Waldgrün",
    primary: "#2E6B4F",
    primaryDk: "#245740",
    soft: "#E7F0EB",
  },
  {
    id: "bordeaux",
    name: "Bordeaux",
    primary: "#8C2F45",
    primaryDk: "#6f2537",
    soft: "#F6E9EC",
  },
  {
    id: "petrol",
    name: "Petrol",
    primary: "#1F6E78",
    primaryDk: "#17555d",
    soft: "#E6F0F1",
  },
] as const;

/**
 * Mock `ORG` — Fallback-Struktur (Demo-Werte nur wenn keine Org-Daten).
 * Live: `orgBrandFromKunde` / Melde-Kontext.
 */
export type OrgBrand = {
  name: string;
  sub: string;
  logo: string;
  primary: string;
  primaryDk: string;
  soft: string;
  tel: string;
  mail: string;
  strasse: string;
  ort: string;
  logoUrl?: string | null;
};

export const ORG_BRAND_DEFAULT: OrgBrand = {
  name: "Immobilien Steiner GmbH",
  sub: "Verwaltung",
  logo: "IS",
  primary: "#22508C",
  primaryDk: "#1b426f",
  soft: "#E8EEF6",
  tel: "030 555 12 00",
  mail: "service@steiner-immo.de",
  strasse: "Kurfürstendamm 210",
  ort: "10719 Berlin",
};

/** Untertitel Header/Sidebar — Legacy „Hausverwaltung“ → „Verwaltung“. */
export function resolveOrgSubLabel(raw?: string | null): string {
  const s = (raw ?? "").trim();
  if (!s) return "Verwaltung";
  if (/^hausverwaltung$/i.test(s)) return "Verwaltung";
  return s;
}

export type OrgBrandSource = {
  name?: string | null;
  email?: string | null;
  org_anzeigename?: string | null;
  org_logo_url?: string | null;
  org_logo_kuerzel?: string | null;
  org_sub?: string | null;
  org_primary_color?: string | null;
  org_primary_color_dk?: string | null;
  org_primary_color_soft?: string | null;
  org_telefon?: string | null;
  org_strasse?: string | null;
  org_ort?: string | null;
  mieter_kontakt_telefon?: string | null;
  mieter_kontakt_email?: string | null;
};

function logoKuerzelFromName(name: string): string {
  const parts = name
    .replace(/[^a-zA-ZäöüÄÖÜß0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "HV";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

export function findBrandPresetByPrimary(
  primary: string | null | undefined
): BrandPreset | null {
  if (!primary?.trim()) return null;
  const p = primary.trim().toLowerCase();
  return BRAND_PRESETS.find((x) => x.primary.toLowerCase() === p) ?? null;
}

/** Leitet Dk/Soft ab. Ohne primary → Portal-Default (`PORTAL_VAR`), nicht Steiner-Demo. */
export function resolveBrandPalette(input: {
  primary?: string | null;
  primaryDk?: string | null;
  soft?: string | null;
}): Pick<BrandPreset, "primary" | "primaryDk" | "soft"> {
  const raw = input.primary?.trim();
  if (!raw) {
    return {
      primary: PORTAL_VAR.primary,
      primaryDk: PORTAL_VAR.primaryDk,
      soft: PORTAL_VAR.primarySoft,
    };
  }
  const preset = findBrandPresetByPrimary(raw);
  return {
    primary: raw,
    primaryDk:
      input.primaryDk?.trim() || preset?.primaryDk || PORTAL_VAR.primaryDk,
    soft: input.soft?.trim() || preset?.soft || PORTAL_VAR.primarySoft,
  };
}

/** Kunden-/Org-Zeile → Mock-`ORG`-Form (ohne Demo-Stammdaten erfinden). */
export function orgBrandFromKunde(
  src: OrgBrandSource,
  opts?: { useDemoFallback?: boolean }
): OrgBrand {
  const name =
    src.org_anzeigename?.trim() ||
    src.name?.trim() ||
    (opts?.useDemoFallback ? ORG_BRAND_DEFAULT.name : "Verwaltung");
  const palette = resolveBrandPalette({
    primary: src.org_primary_color,
    primaryDk: src.org_primary_color_dk,
    soft: src.org_primary_color_soft,
  });
  const logo =
    src.org_logo_kuerzel?.trim() ||
    logoKuerzelFromName(name) ||
    ORG_BRAND_DEFAULT.logo;

  return {
    name,
    sub: resolveOrgSubLabel(src.org_sub),
    logo,
    primary: palette.primary,
    primaryDk: palette.primaryDk,
    soft: palette.soft,
    tel:
      src.org_telefon?.trim() ||
      src.mieter_kontakt_telefon?.trim() ||
      (opts?.useDemoFallback ? ORG_BRAND_DEFAULT.tel : ""),
    mail:
      src.mieter_kontakt_email?.trim() ||
      src.email?.trim() ||
      (opts?.useDemoFallback ? ORG_BRAND_DEFAULT.mail : ""),
    strasse:
      src.org_strasse?.trim() ||
      (opts?.useDemoFallback ? ORG_BRAND_DEFAULT.strasse : ""),
    ort:
      src.org_ort?.trim() ||
      (opts?.useDemoFallback ? ORG_BRAND_DEFAULT.ort : ""),
    logoUrl: src.org_logo_url ?? null,
  };
}
