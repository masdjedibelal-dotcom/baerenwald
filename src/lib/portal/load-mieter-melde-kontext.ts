import type { PortalFunnelMeldeCtx } from "@/components/funnel/portal-funnel-types";
import { logDbError } from "@/lib/errors/log-db-error";
import { resolveMeldeLegalUrls } from "@/lib/org/melde-legal-urls";
import { resolveMeldeKontext } from "@/lib/org/resolve-melde-kontext";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Angemeldeter Mieter: Meldung läuft über die HV (wie Aushang/QR), nicht als Website-Anfrage.
 * Wohnung (einheit_bewohner) → Objekt (melde_slug) → HV (org_kennung).
 */
export async function loadMieterMeldeKontext(opts: {
  portalKundeId: string;
  email?: string | null;
}): Promise<PortalFunnelMeldeCtx | null> {
  const select = "kunde_id, objekt_einheit_id";
  let { data: bew, error } = await supabaseAdmin
    .from("einheit_bewohner")
    .select(select)
    .eq("aktiv", true)
    .eq("portal_kunde_id", opts.portalKundeId)
    .limit(1)
    .maybeSingle();
  if (!bew && !error && opts.email?.trim()) {
    ({ data: bew, error } = await supabaseAdmin
      .from("einheit_bewohner")
      .select(select)
      .eq("aktiv", true)
      .ilike("email", opts.email.trim())
      .limit(1)
      .maybeSingle());
  }
  if (error) logDbError("lib/portal/load-mieter-melde-kontext:einheit_bewohner", error);
  const hvId = (bew as { kunde_id?: string | null } | null)?.kunde_id?.trim();
  const einheitId = (bew as { objekt_einheit_id?: string | null } | null)?.objekt_einheit_id?.trim();
  if (!hvId || !einheitId) return null;

  const [{ data: einheit }, { data: hv }] = await Promise.all([
    supabaseAdmin.from("objekt_einheiten").select("kunde_objekt_id").eq("id", einheitId).maybeSingle(),
    supabaseAdmin.from("kunden").select("org_kennung").eq("id", hvId).maybeSingle(),
  ]);
  const kennung = (hv as { org_kennung?: string | null } | null)?.org_kennung?.trim();
  const objektId = (einheit as { kunde_objekt_id?: string | null } | null)?.kunde_objekt_id?.trim();
  if (!kennung || !objektId) return null;
  const { data: objekt } = await supabaseAdmin
    .from("kunden_objekte")
    .select("melde_slug")
    .eq("id", objektId)
    .maybeSingle();
  const slug = (objekt as { melde_slug?: string | null } | null)?.melde_slug?.trim();
  if (!slug) return null;

  const resolved = await resolveMeldeKontext(kennung, slug);
  if (!resolved.ok || !resolved.kontext.objekt) return null;
  const { org, objekt: obj } = resolved.kontext;
  const legal = resolveMeldeLegalUrls({
    meldeSlug: org.org_kennung,
    datenschutz_url: org.datenschutz_url,
    impressum_url: org.impressum_url,
  });
  return {
    orgKennung: org.org_kennung,
    objektSlug: obj.melde_slug ?? slug,
    orgName: org.org_anzeigename?.trim() || org.name?.trim() || org.org_kennung,
    sessionKey: `portal-mieter-${opts.portalKundeId}`,
    objektLocked: true,
    objektTitel: obj.display.name,
    objektAdresse: [obj.strasse, obj.hausnummer].filter(Boolean).join(" ") || null,
    datenschutzHref: legal.datenschutz,
    impressumHref: legal.impressum,
    akutFallIds: org.akut_fall_ids ?? [],
  };
}
