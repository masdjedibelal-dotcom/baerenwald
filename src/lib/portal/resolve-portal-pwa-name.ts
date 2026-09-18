import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import { loadMieterHvBrand } from "@/lib/portal/load-mieter-hv-brand";
import { resolvePortalKundeTyp } from "@/lib/portal2/kunde-typ";

const NEUTRAL = "Portal";
const PRIVAT = "MeinBärenwald";

/**
 * PWA applicationName — Whitelabel: Org-Name; sonst Portal / MeinBärenwald.
 * Nie „Bärenwald“ allein für Org-gebrandete Nutzer.
 */
export async function resolvePortalPwaApplicationName(): Promise<string> {
  if (!isSupabaseConfigured()) return NEUTRAL;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return NEUTRAL;

    const { data: kunde } = await supabaseAdmin
      .from("kunden")
      .select("id, name, org_anzeigename, typ, portal_modus")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!kunde) return NEUTRAL;

    const tip = String((kunde as { typ?: string | null }).typ ?? "")
      .trim()
      .toLowerCase();
    const portalModus = String(
      (kunde as { portal_modus?: string | null }).portal_modus ?? ""
    )
      .trim()
      .toLowerCase();
    const typ = resolvePortalKundeTyp({
      typ: (kunde as { typ?: string | null }).typ,
      portal_modus: (kunde as { portal_modus?: string | null }).portal_modus,
    });

    if (tip === "hv" || typ === "hv" || portalModus === "organisation") {
      const orgName = String(
        (kunde as { org_anzeigename?: string | null }).org_anzeigename ??
          (kunde as { name?: string | null }).name ??
          ""
      ).trim();
      return orgName || NEUTRAL;
    }

    const brand = await loadMieterHvBrand({
      portalKundeId: String((kunde as { id: string }).id),
      portalKundeEmail: user.email,
      leads: [],
    });
    if (brand?.name?.trim()) return brand.name.trim();

    if (typ === "privat" || portalModus === "privat" || !portalModus) {
      return PRIVAT;
    }

    return NEUTRAL;
  } catch {
    return NEUTRAL;
  }
}
