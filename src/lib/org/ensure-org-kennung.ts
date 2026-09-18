import {
  isValidMeldeSlug,
  suggestOrgKennungFromName,
} from "@/lib/org/slug";
import { supabaseAdmin } from "@/lib/supabase";

async function isOrgKennungTaken(
  slug: string,
  excludeKundeId: string
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("kunden")
    .select("id")
    .ilike("org_kennung", slug)
    .neq("id", excludeKundeId)
    .limit(1)
    .maybeSingle();
  return Boolean(data?.id);
}

async function allocateOrgKennung(
  kundeId: string,
  baseRaw: string
): Promise<string> {
  const base = suggestOrgKennungFromName(baseRaw);
  let candidate = isValidMeldeSlug(base) ? base : `org-${kundeId.slice(0, 8)}`;
  let suffix = 2;
  for (let i = 0; i < 40; i++) {
    if (!(await isOrgKennungTaken(candidate, kundeId))) return candidate;
    const next = `${base.slice(0, 40)}-${suffix}`;
    candidate = isValidMeldeSlug(next)
      ? next
      : `org-${kundeId.slice(0, 6)}-${suffix}`;
    suffix += 1;
  }
  return `org-${kundeId.replace(/-/g, "").slice(0, 12)}`;
}

/**
 * Stellt sicher, dass die HV eine URL-Kennung für /melden/{slug} hat.
 * Wird still aus dem Firmennamen vergeben — kein manuelles CRM nötig.
 */
export async function ensureOrgKennung(input: {
  id: string;
  org_kennung?: string | null;
  org_anzeigename?: string | null;
  name?: string | null;
}): Promise<string | null> {
  const { data: current } = await supabaseAdmin
    .from("kunden")
    .select("org_kennung, org_anzeigename, name")
    .eq("id", input.id)
    .maybeSingle();

  const existing =
    current?.org_kennung?.trim().toLowerCase() ||
    input.org_kennung?.trim().toLowerCase() ||
    "";
  if (existing && isValidMeldeSlug(existing)) return existing;

  const seed =
    current?.org_anzeigename?.trim() ||
    input.org_anzeigename?.trim() ||
    current?.name?.trim() ||
    input.name?.trim() ||
    `org-${input.id.slice(0, 8)}`;

  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = await allocateOrgKennung(input.id, seed);
    const { error } = await supabaseAdmin
      .from("kunden")
      .update({ org_kennung: slug })
      .eq("id", input.id);

    if (!error) return slug;

    const { data: again } = await supabaseAdmin
      .from("kunden")
      .select("org_kennung")
      .eq("id", input.id)
      .maybeSingle();
    const recovered = again?.org_kennung?.trim().toLowerCase() ?? "";
    if (recovered && isValidMeldeSlug(recovered)) return recovered;
  }

  return null;
}
