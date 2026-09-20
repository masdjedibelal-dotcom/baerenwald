import { logDbError } from "@/lib/errors/log-db-error";
import { NextResponse } from "next/server";

import { requireOrganisationSession } from "@/lib/org/require-org-session";
import type { PortalSearchHit } from "@/lib/search/portal-search-types";
import { portalSearchPattern } from "@/lib/search/portal-search-types";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/** HV-Suche: Vorgänge · Objekte · Dokumente (server-side ilike, org-scoped). */
export async function GET(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ hits: [] });
  }

  const pattern = portalSearchPattern(q);
  const kundeId = session.kunde.id;
  const hits: PortalSearchHit[] = [];

  const [leadsRes, objekteRes] = await Promise.all([
    supabaseAdmin
      .from("leads")
      .select(
        "id, kontakt_name, melder_name, melder_einheit, anlass, status, hv_meldung_status, kunde_objekt_id, created_at, situation"
      )
      .eq("auftraggeber_kunde_id", kundeId)
      .is("geloescht_am", null)
      .or(
        [
          `kontakt_name.ilike.${pattern}`,
          `melder_name.ilike.${pattern}`,
          `melder_einheit.ilike.${pattern}`,
          `anlass.ilike.${pattern}`,
          `situation.ilike.${pattern}`,
          `status.ilike.${pattern}`,
          `hv_meldung_status.ilike.${pattern}`,
        ].join(",")
      )
      .order("created_at", { ascending: false })
      .limit(12),
    supabaseAdmin
      .from("kunden_objekte")
      .select("id, titel, kostenstelle_nr")
      .eq("kunde_id", kundeId)
      .or(`titel.ilike.${pattern},kostenstelle_nr.ilike.${pattern}`)
      .limit(8),
  ]);

  const dokRes = await supabaseAdmin
    .from("kunden_dokumente")
    .select("id, titel, dateiname, kunde_objekt_id")
    .eq("kunde_id", kundeId)
    .or(`titel.ilike.${pattern},dateiname.ilike.${pattern}`)
    .limit(6);

  if (leadsRes.error) logDbError("api/org/suche:leads", leadsRes.error);
  if (objekteRes.error) logDbError("api/org/suche:objekte", objekteRes.error);
  if (dokRes.error) {
    // Tabelle/RLS ggf. nicht für Portal — Treffergruppe optional
    logDbError("api/org/suche:dokumente", dokRes.error);
  }

  const objektIds = [
    ...new Set(
      (leadsRes.data ?? [])
        .map((l) => (l.kunde_objekt_id ? String(l.kunde_objekt_id) : null))
        .filter(Boolean) as string[]
    ),
  ];
  let objMap = new Map<string, { titel?: string | null; kostenstelle_nr?: string | null }>();
  if (objektIds.length) {
    const { data: objs, error } = await supabaseAdmin
      .from("kunden_objekte")
      .select("id, titel, kostenstelle_nr")
      .in("id", objektIds);
    if (error) logDbError("api/org/suche:lead-objekte", error);
    objMap = new Map(
      (objs ?? []).map((o) => [String(o.id), o])
    );
  }

  for (const l of leadsRes.data ?? []) {
    const obj = l.kunde_objekt_id
      ? objMap.get(String(l.kunde_objekt_id))
      : null;
    const label =
      (l.melder_name as string | null)?.trim() ||
      (l.kontakt_name as string | null)?.trim() ||
      "Vorgang";
    const sub = [obj?.titel, l.anlass, l.hv_meldung_status ?? l.status]
      .filter(Boolean)
      .join(" · ");
    hits.push({
      id: `v-${l.id}`,
      group: "vorgaenge",
      icon: "clipboard-list",
      label,
      sub: sub || undefined,
      href: `/portal?section=vorgaenge&filter=alle&id=${encodeURIComponent(String(l.id))}`,
    });
  }

  for (const o of objekteRes.data ?? []) {
    hits.push({
      id: `o-${o.id}`,
      group: "objekte",
      icon: "building",
      label: (o.titel as string | null)?.trim() || "Objekt",
      sub: o.kostenstelle_nr
        ? `Kostenstelle ${o.kostenstelle_nr}`
        : "Objekt",
      href: `/portal?section=objekte&id=${encodeURIComponent(String(o.id))}`,
    });
  }

  for (const d of dokRes.error ? [] : dokRes.data ?? []) {
    const label =
      (d.titel as string | null)?.trim() ||
      (d.dateiname as string | null)?.trim() ||
      "Dokument";
    const href = d.kunde_objekt_id
      ? `/portal?section=objekte&id=${encodeURIComponent(String(d.kunde_objekt_id))}`
      : `/portal?section=objekte`;
    hits.push({
      id: `d-${d.id}`,
      group: "dokumente",
      icon: "file-text",
      label,
      sub: "Dokument",
      href,
    });
  }

  return NextResponse.json({ hits });
}
