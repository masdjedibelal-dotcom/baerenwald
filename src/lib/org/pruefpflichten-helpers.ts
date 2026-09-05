import { createClient } from "@/lib/supabase/server";
import {
  pruefpflichtTypBySchluessel,
  type PruefpflichtTypSchluessel,
} from "@/lib/org/pruefpflichten-catalog";
import { resolveOrgActorName } from "@/lib/org/resolve-org-actor-name";
import type { OrganisationKunde } from "@/lib/org/types";
import { supabaseAdmin } from "@/lib/supabase";

export async function resolveGewerkIdByName(
  name: string | null | undefined
): Promise<string | null> {
  const q = name?.trim();
  if (!q) return null;
  const { data } = await supabaseAdmin
    .from("gewerke")
    .select("id, name")
    .ilike("name", q)
    .limit(1)
    .maybeSingle();
  if (data?.id) return String(data.id);
  const { data: partial } = await supabaseAdmin
    .from("gewerke")
    .select("id, name")
    .ilike("name", `%${q}%`)
    .limit(1)
    .maybeSingle();
  return partial?.id ? String(partial.id) : null;
}

export async function resolveActorFromSession(input: {
  kunde: OrganisationKunde;
  userId: string;
  email: string;
}): Promise<{ name: string; quelle: "hv" | "crm" }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const metaName =
    (userData.user?.user_metadata as { name?: string; full_name?: string } | undefined)
      ?.name ??
    (userData.user?.user_metadata as { full_name?: string } | undefined)?.full_name;
  return {
    name: resolveOrgActorName({
      kunde: input.kunde,
      email: input.email,
      personName: metaName,
    }),
    quelle: "hv",
  };
}

export function normalizeTypInput(body: {
  typSchluessel?: string;
  typLabel?: string;
  typ?: string;
}): {
  typ: string;
  typSchluessel: PruefpflichtTypSchluessel | null;
  gewerkName: string | null;
} | null {
  const schluessel = body.typSchluessel?.trim();
  if (schluessel) {
    const def = pruefpflichtTypBySchluessel(schluessel);
    if (!def) return null;
    if (schluessel === "sonstiges") {
      const label = body.typLabel?.trim() || body.typ?.trim();
      if (!label) return null;
      return { typ: label, typSchluessel: "sonstiges", gewerkName: null };
    }
    return {
      typ: def.label,
      typSchluessel: def.schluessel,
      gewerkName: def.gewerkName,
    };
  }
  const legacy = body.typ?.trim();
  if (!legacy) return null;
  return { typ: legacy, typSchluessel: null, gewerkName: null };
}

export async function assertNoDuplicatePruefpflicht(input: {
  objektId: string;
  typSchluessel: string;
  excludeId?: string;
}): Promise<boolean> {
  if (input.typSchluessel === "sonstiges") return true;
  let q = supabaseAdmin
    .from("objekt_pruefpflichten")
    .select("id")
    .eq("kunde_objekt_id", input.objektId)
    .eq("status", "aktiv")
    .eq("typ_schluessel", input.typSchluessel);
  if (input.excludeId) q = q.neq("id", input.excludeId);
  const { data } = await q.maybeSingle();
  return !data;
}
