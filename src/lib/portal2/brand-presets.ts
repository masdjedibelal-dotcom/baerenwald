import { PORTAL_C } from "@/lib/portal2/tokens";
import {
  formatPlzOrt,
  formatStrasseNr,
  splitPlzOrt,
  splitStrasseHausnummer,
} from "@/lib/partner/handwerker-anschrift";

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
    primary: "#2E7D52",
    primaryDk: "#1A3D2B",
    soft: "#E7F1E9",
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
  org_hausnummer?: string | null;
  org_plz?: string | null;
  org_ort?: string | null;
  strasse?: string | null;
  hausnummer?: string | null;
  plz?: string | null;
  ort?: string | null;
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

/** Leitet Dk/Soft ab. Ohne primary → Bärenwald-Grün (CRM-Default). */
export function resolveBrandPalette(input: {
  primary?: string | null;
  primaryDk?: string | null;
  soft?: string | null;
}): Pick<BrandPreset, "primary" | "primaryDk" | "soft"> {
  const raw = input.primary?.trim();
  if (!raw) {
    return {
      primary: PORTAL_C.primary,
      primaryDk: PORTAL_C.primaryDk,
      soft: PORTAL_C.primarySoft,
    };
  }
  const preset = findBrandPresetByPrimary(raw);
  return {
    primary: raw,
    primaryDk:
      input.primaryDk?.trim() || preset?.primaryDk || PORTAL_C.primaryDk,
    soft: input.soft?.trim() || preset?.soft || PORTAL_C.primarySoft,
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
      formatStrasseNr(
        src.org_strasse?.trim() || src.strasse,
        src.org_hausnummer?.trim() || src.hausnummer
      ) ||
      (opts?.useDemoFallback ? ORG_BRAND_DEFAULT.strasse : ""),
    ort:
      formatPlzOrt(
        src.org_plz?.trim() || src.plz,
        (() => {
          const rawOrt = src.org_ort?.trim() || src.ort?.trim() || "";
          if (src.org_plz?.trim() || src.plz?.trim()) return rawOrt;
          return splitPlzOrt(rawOrt).ort || rawOrt;
        })()
      ) ||
      (opts?.useDemoFallback ? ORG_BRAND_DEFAULT.ort : ""),
    logoUrl: src.org_logo_url ?? null,
  };
}

/** Adresse für HV-Profil-Editor — org_* mit Fallback auf CRM-Registrierung. */
export function orgAddressDraftFromKunde(src: OrgBrandSource): {
  strasse: string;
  hausnummer: string;
  plz: string;
  ort: string;
} {
  let strasse = src.org_strasse?.trim() || src.strasse?.trim() || "";
  let hausnummer = src.org_hausnummer?.trim() || src.hausnummer?.trim() || "";
  let plz = src.org_plz?.trim() || src.plz?.trim() || "";
  let ort = src.org_ort?.trim() || src.ort?.trim() || "";

  if (!hausnummer && strasse) {
    const split = splitStrasseHausnummer(strasse);
    strasse = split.strasse;
    hausnummer = split.hausnummer;
  }
  if (!plz && ort) {
    const split = splitPlzOrt(ort);
    plz = split.plz;
    ort = split.ort;
  }

  return { strasse, hausnummer, plz, ort };
}
