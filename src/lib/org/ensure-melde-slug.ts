import {
  isValidMeldeSlug,
  suggestMeldeSlugFromAddress,
} from "@/lib/org/slug";
import { supabaseAdmin } from "@/lib/supabase";

export async function allocateMeldeSlug(
  kundeId: string,
  base: string
): Promise<string> {
  let candidate = base.trim().toLowerCase();
  let suffix = 2;
  for (let i = 0; i < 50; i++) {
    const { data } = await supabaseAdmin
      .from("kunden_objekte")
      .select("id")
      .eq("kunde_id", kundeId)
      .ilike("melde_slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return `${base}-${Date.now().toString(36).slice(-4)}`;
}

type ObjektRow = {
  id: string;
  titel: string;
  strasse?: string | null;
  hausnummer?: string | null;
  plz?: string | null;
  melde_slug?: string | null;
  melde_aktiv?: boolean | null;
};

/** Objekte ohne melde_slug bekommen automatisch einen Link-Slug. */
export async function ensureMeldeSlugsForKunde(
  kundeId: string,
  rows: ObjektRow[]
): Promise<void> {
  const needsSlug = rows.filter((o) => !String(o.melde_slug ?? "").trim());
  if (!needsSlug.length) return;

  await Promise.all(
    needsSlug.map(async (o) => {
      const base =
        suggestMeldeSlugFromAddress(o.strasse, o.hausnummer, o.plz) ||
        suggestMeldeSlugFromAddress(o.titel, null, null);
      const melde_slug = await allocateMeldeSlug(kundeId, base);
      if (!isValidMeldeSlug(melde_slug)) return;

      await supabaseAdmin
        .from("kunden_objekte")
        .update({ melde_slug, updated_at: new Date().toISOString() })
        .eq("id", o.id)
        .eq("kunde_id", kundeId);
    })
  );
}
