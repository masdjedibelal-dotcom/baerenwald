import {
  orgBrandFromKunde,
  type OrgBrand,
  type OrgBrandSource,
} from "@/lib/portal2/brand-presets";
import { supabaseAdmin } from "@/lib/supabase";

export type MieterHvBrand = {
  name: string;
  sub: string;
  logoUrl: string | null;
  logoKuerzel: string | null;
  primary: string | null;
  primaryDk: string | null;
  soft: string | null;
  mail: string | null;
};

const ORG_SELECTS = [
  "name, org_anzeigename, org_sub, org_logo_url, org_logo_kuerzel, org_primary_color, org_primary_color_dk, org_primary_color_soft, mieter_kontakt_email, mieter_kontakt_telefon, org_telefon, email",
  "name, org_anzeigename, org_logo_url, org_primary_color, mieter_kontakt_email, mieter_kontakt_telefon, email",
  "name, org_anzeigename, org_logo_url",
  "name",
] as const;

function mostFrequentAuftraggeberId(
  leads: Array<{ auftraggeber_kunde_id?: string | null }>,
  excludeId: string
): string | null {
  const counts = new Map<string, number>();
  for (const lead of leads) {
    const id = String(lead.auftraggeber_kunde_id ?? "").trim();
    if (!id || id === excludeId) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [id, count] of Array.from(counts)) {
    if (count > bestCount) {
      best = id;
      bestCount = count;
    }
  }
  return best;
}

async function hvIdFromEinladung(portalKundeId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("portal_einladungen")
    .select("kunde_id")
    .eq("portal_kunde_id", portalKundeId)
    .order("eingeloest_am", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  const id = String((data as { kunde_id?: string } | null)?.kunde_id ?? "").trim();
  return id || null;
}

async function hvIdFromBewohner(email: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("einheit_bewohner")
    .select("kunde_id")
    .ilike("email", email)
    .eq("aktiv", true)
    .limit(1)
    .maybeSingle();
  if (error) return null;
  const id = String((data as { kunde_id?: string } | null)?.kunde_id ?? "").trim();
  return id || null;
}

/** Eigentümer: HV = Eigentümer der zugeordneten `kunden_objekte`. */
async function hvIdFromEigentuemerObjekte(
  portalKundeId: string
): Promise<string | null> {
  const { data: zuordnung, error } = await supabaseAdmin
    .from("eigentuemer_objekte")
    .select("kunde_objekt_id")
    .eq("kunde_id", portalKundeId)
    .limit(20);
  if (error || !zuordnung?.length) return null;
  const objektIds = zuordnung
    .map((r) =>
      String((r as { kunde_objekt_id?: string }).kunde_objekt_id ?? "").trim()
    )
    .filter(Boolean);
  if (!objektIds.length) return null;
  const { data: objs, error: objErr } = await supabaseAdmin
    .from("kunden_objekte")
    .select("kunde_id")
    .in("id", objektIds)
    .limit(5);
  if (objErr || !objs?.length) return null;
  const counts = new Map<string, number>();
  for (const row of objs) {
    const id = String((row as { kunde_id?: string }).kunde_id ?? "").trim();
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [id, count] of Array.from(counts)) {
    if (count > bestCount) {
      best = id;
      bestCount = count;
    }
  }
  return best;
}

async function loadOrgKunde(hvId: string): Promise<OrgBrandSource | null> {
  for (const select of ORG_SELECTS) {
    const { data, error } = await supabaseAdmin
      .from("kunden")
      .select(select as string)
      .eq("id", hvId)
      .maybeSingle();
    if (error) continue;
    if (data) return data as OrgBrandSource;
  }
  return null;
}

function toMieterHvBrand(org: OrgBrand): MieterHvBrand {
  return {
    name: org.name.trim() || "Verwaltung",
    sub: org.sub.trim() || "Verwaltung",
    logoUrl: org.logoUrl ?? null,
    logoKuerzel: org.logo.trim() || null,
    primary: org.primary || null,
    primaryDk: org.primaryDk || null,
    soft: org.soft || null,
    mail: org.mail.trim() || null,
  };
}

async function hvIdFromHausmeisterPortal(
  portalKundeId: string
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("org_hausmeister")
    .select("org_kunde_id")
    .eq("portal_kunde_id", portalKundeId)
    .limit(1)
    .maybeSingle();
  if (error) return null;
  const id = String(
    (data as { org_kunde_id?: string } | null)?.org_kunde_id ?? ""
  ).trim();
  return id || null;
}

/**
 * White-Label der Hausverwaltung für Mieter- und Eigentümer-Portal
 * (Topbar/Sidebar statt „MeinBärenwald“).
 */
export async function loadMieterHvBrand(opts: {
  portalKundeId: string;
  portalKundeEmail?: string | null;
  leads: Array<{ auftraggeber_kunde_id?: string | null }>;
}): Promise<MieterHvBrand | null> {
  const portalKundeId = opts.portalKundeId.trim();
  if (!portalKundeId) return null;

  let hvId = mostFrequentAuftraggeberId(opts.leads, portalKundeId);
  if (!hvId) {
    hvId = await hvIdFromEinladung(portalKundeId);
  }
  if (!hvId) {
    hvId = await hvIdFromEigentuemerObjekte(portalKundeId);
  }
  if (!hvId) {
    hvId = await hvIdFromHausmeisterPortal(portalKundeId);
  }
  const email = opts.portalKundeEmail?.trim();
  if (!hvId && email) {
    hvId = await hvIdFromBewohner(email);
  }
  if (!hvId) return null;

  const orgRow = await loadOrgKunde(hvId);
  if (!orgRow) return null;

  return toMieterHvBrand(orgBrandFromKunde(orgRow));
}
