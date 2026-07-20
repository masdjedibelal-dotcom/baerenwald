import { buildMeldeUrl } from "@/lib/org/melde-url";
import { meldeAushangPdfPath as pdfPath } from "@/lib/portal2/aushang";
import { orgPortalToast } from "@/lib/shared/portal-toast";
import type { AushangBrand, AushangObjektView } from "@/lib/portal2/aushang";

export { meldeAushangPdfPath } from "@/lib/portal2/aushang";

/** PDF im Browser öffnen (Drucken / Speichern über Browser-PDF-Ansicht). */
export function openMeldeAushangPdf(objektId?: string | null) {
  window.open(pdfPath(objektId ?? undefined), "_blank", "noopener,noreferrer");
  orgPortalToast.aushangPdfGeoeffnet();
}

export async function copyMeldeLink(meldeUrl: string) {
  await navigator.clipboard.writeText(meldeUrl);
  orgPortalToast.linkKopiert();
}

export function toAushangObjektView(o: {
  id: string;
  titel: string;
  strasse?: string | null;
  hausnummer?: string | null;
  plz?: string | null;
  ort?: string | null;
  melde_slug?: string | null;
}): AushangObjektView {
  const adresse = [o.strasse, o.hausnummer, o.plz, o.ort]
    .filter(Boolean)
    .join(" ")
    .trim();
  return {
    id: o.id,
    titel: o.titel,
    adresse: adresse || o.titel,
    melde_slug: o.melde_slug,
  };
}

export function brandFromOrgKunde(kunde: {
  org_anzeigename?: string | null;
  name?: string | null;
  org_sub?: string | null;
  org_logo_kuerzel?: string | null;
  org_primary_color?: string | null;
  org_primary_color_dk?: string | null;
  org_primary_color_soft?: string | null;
  org_telefon?: string | null;
  email?: string | null;
  mieter_kontakt_telefon?: string | null;
  mieter_kontakt_email?: string | null;
}): AushangBrand {
  return {
    name:
      kunde.org_anzeigename?.trim() || kunde.name?.trim() || "Hausverwaltung",
    sub: kunde.org_sub,
    logoKuerzel: kunde.org_logo_kuerzel,
    primary: kunde.org_primary_color?.trim() || "#2E7D52",
    primaryDk: kunde.org_primary_color_dk,
    soft: kunde.org_primary_color_soft,
    telefon:
      kunde.mieter_kontakt_telefon?.trim() ||
      kunde.org_telefon?.trim() ||
      null,
    email: kunde.mieter_kontakt_email?.trim() || kunde.email?.trim() || null,
  };
}

export function buildObjektMeldeUrl(
  orgKennung: string,
  meldeSlug: string
): string {
  return buildMeldeUrl(orgKennung, meldeSlug);
}
