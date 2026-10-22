import { orgBrandFromKunde, resolveBrandPalette } from "@/lib/portal2/brand-presets";
import type { MieterWlBrand } from "@/lib/portal2/mieter-wl";
import { supabaseAdmin } from "@/lib/supabase";

/** Whitelabel der Verwaltung für Mieter-Seiten (Meldungs-Status, MeinTEO). */
export async function loadOrgBrand(
  auftraggeberKundeId: string | null | undefined
): Promise<
  MieterWlBrand & {
    orgKennung: string | null;
    datenschutzUrl: string | null;
    impressumUrl: string | null;
  }
> {
  const fallbackPalette = resolveBrandPalette({});
  const fallback: MieterWlBrand & {
    orgKennung: string | null;
    datenschutzUrl: string | null;
    impressumUrl: string | null;
  } = {
    name: "Verwaltung",
    sub: "Verwaltung",
    logoUrl: null,
    logoKuerzel: null,
    primary: fallbackPalette.primary,
    primaryDk: fallbackPalette.primaryDk,
    soft: fallbackPalette.soft,
    tel: null,
    mail: null,
    orgKennung: null,
    datenschutzUrl: null,
    impressumUrl: null,
  };
  const id = String(auftraggeberKundeId ?? "").trim();
  if (!id) return fallback;

  let org: Record<string, unknown> | null = null;
  const full = await supabaseAdmin
    .from("kunden")
    .select(
      "name, org_anzeigename, org_kennung, mieter_kontakt_telefon, mieter_kontakt_email, mieter_kontakt_hinweis, datenschutz_url, impressum_url"
    )
    .eq("id", id)
    .maybeSingle();
  if (full.error) {
    const legacy = await supabaseAdmin
      .from("kunden")
      .select(
        "name, org_anzeigename, org_kennung, mieter_kontakt_telefon, mieter_kontakt_email, mieter_kontakt_hinweis, datenschutz_url, impressum_url"
      )
      .eq("id", id)
      .maybeSingle();
    org = (legacy.data as Record<string, unknown> | null) ?? null;
  } else {
    org = (full.data as Record<string, unknown> | null) ?? null;
  }
  if (!org) return fallback;

  const kennung = String(org.org_kennung ?? "")
    .trim()
    .toLowerCase();
  const mapped = orgBrandFromKunde(org);

  return {
    name: mapped.name,
    sub: mapped.sub,
    logoKuerzel: mapped.logo,
    primary: mapped.primary,
    primaryDk: mapped.primaryDk,
    soft: mapped.soft,
    tel: mapped.tel || null,
    mail: mapped.mail || null,
    orgKennung: kennung || null,
    datenschutzUrl: (org.datenschutz_url as string | null) ?? null,
    impressumUrl: (org.impressum_url as string | null) ?? null,
  };
}
