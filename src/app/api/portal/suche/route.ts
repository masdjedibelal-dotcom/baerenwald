import { logDbError } from "@/lib/errors/log-db-error";
import { NextResponse } from "next/server";

import { requireAccountSession } from "@/lib/account/require-account-session";
import type { PortalSearchHit } from "@/lib/search/portal-search-types";
import { portalSearchPattern } from "@/lib/search/portal-search-types";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Kunde / Eigentümer / Hausmeister — Suche in eigenen Vorgängen (kunde_id).
 * Kein ⌘K; Header-Suche nutzt diese API.
 */
export async function GET(req: Request) {
  const session = await requireAccountSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }
  if (session.kind !== "kunde") {
    return NextResponse.json(
      { error: "Partner bitte über /api/partner/suche suchen." },
      { status: 400 }
    );
  }

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ hits: [] });
  }

  const pattern = portalSearchPattern(q);
  const kundeId = session.entityId;
  const hits: PortalSearchHit[] = [];

  const { data: leads, error } = await supabaseAdmin
    .from("leads")
    .select(
      "id, kontakt_name, melder_name, anlass, status, situation, plz, ort, created_at"
    )
    .eq("kunde_id", kundeId)
    .is("geloescht_am", null)
    .or(
      [
        `kontakt_name.ilike.${pattern}`,
        `melder_name.ilike.${pattern}`,
        `anlass.ilike.${pattern}`,
        `situation.ilike.${pattern}`,
        `plz.ilike.${pattern}`,
        `ort.ilike.${pattern}`,
        `status.ilike.${pattern}`,
      ].join(",")
    )
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) logDbError("api/portal/suche:leads", error);

  for (const l of leads ?? []) {
    const label =
      (l.melder_name as string | null)?.trim() ||
      (l.kontakt_name as string | null)?.trim() ||
      (l.situation as string | null)?.trim() ||
      "Vorgang";
    const sub = [
      l.anlass,
      [l.plz, l.ort].filter(Boolean).join(" "),
      l.status,
    ]
      .filter(Boolean)
      .join(" · ");
    hits.push({
      id: `v-${l.id}`,
      group: "vorgaenge",
      icon: "clipboard-list",
      label,
      sub: sub || undefined,
      href: `/portal?section=vorgaenge&id=${encodeURIComponent(String(l.id))}`,
    });
  }

  return NextResponse.json({ hits });
}
