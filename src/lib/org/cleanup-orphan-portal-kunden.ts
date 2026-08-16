import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Nach Objekt-Löschung: Portal-Stubs (Eigentümer/Mieter-Login) aufräumen.
 * CRM-Privatkunden (portal_modus=privat) bleiben erhalten.
 */
export async function cleanupOrphanHvPortalKunden(
  db: SupabaseClient,
  portalKundeIds: string[]
): Promise<{ deleted: string[] }> {
  const ids = [...new Set(portalKundeIds.map((x) => x.trim()).filter(Boolean))];
  if (!ids.length) return { deleted: [] };

  const deleted: string[] = [];

  for (const kid of ids) {
    const { data: kunde } = await db
      .from("kunden")
      .select("id, portal_modus, typ")
      .eq("id", kid)
      .maybeSingle();
    if (!kunde) continue;

    const modus = String(kunde.portal_modus ?? "").toLowerCase();
    if (modus !== "eigentuemer" && modus !== "mieter") continue;

    const [
      { count: bew },
      { count: eo },
      { count: leads },
      { count: auftraege },
      { count: rechnungen },
    ] = await Promise.all([
      db
        .from("einheit_bewohner")
        .select("id", { count: "exact", head: true })
        .eq("portal_kunde_id", kid)
        .eq("aktiv", true),
      db
        .from("eigentuemer_objekte")
        .select("id", { count: "exact", head: true })
        .eq("kunde_id", kid),
      db
        .from("leads")
        .select("id", { count: "exact", head: true })
        .or(`kunde_id.eq.${kid},auftraggeber_kunde_id.eq.${kid}`),
      db
        .from("auftraege")
        .select("id", { count: "exact", head: true })
        .eq("kunde_id", kid),
      db
        .from("rechnungen")
        .select("id", { count: "exact", head: true })
        .eq("kunde_id", kid),
    ]);

    if ((bew ?? 0) > 0 || (eo ?? 0) > 0) continue;
    if ((leads ?? 0) > 0 || (auftraege ?? 0) > 0 || (rechnungen ?? 0) > 0) continue;

    const { error } = await db.from("kunden").delete().eq("id", kid);
    if (!error) deleted.push(kid);
  }

  return { deleted };
}

export async function collectPortalKundeIdsForObjekt(
  db: SupabaseClient,
  objektId: string
): Promise<string[]> {
  const { data: einheiten } = await db
    .from("objekt_einheiten")
    .select("id")
    .eq("kunde_objekt_id", objektId);
  const einheitIds = (einheiten ?? []).map((e) => e.id as string).filter(Boolean);
  if (!einheitIds.length) return [];

  const { data: bewohner } = await db
    .from("einheit_bewohner")
    .select("portal_kunde_id")
    .in("objekt_einheit_id", einheitIds)
    .not("portal_kunde_id", "is", null);

  return [
    ...new Set(
      (bewohner ?? [])
        .map((b) => (b.portal_kunde_id as string | null)?.trim() || "")
        .filter(Boolean)
    ),
  ];
}
