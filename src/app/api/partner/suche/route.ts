import { logDbError } from "@/lib/errors/log-db-error";
import { NextResponse } from "next/server";

import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import type { PortalSearchHit } from "@/lib/search/portal-search-types";
import { portalSearchPattern } from "@/lib/search/portal-search-types";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/** Partner-Suche: eigene Aufträge + Anfragen (handwerker_id-scoped). */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const link = await linkPortalHandwerkerToAuthUser({
    userId: user.id,
    email: user.email,
  });
  if (!link.ok) {
    return NextResponse.json({ error: link.error }, { status: 403 });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ hits: [] });
  }

  const pattern = portalSearchPattern(q);
  const hwId = link.handwerkerId;
  const hits: PortalSearchHit[] = [];

  const [auftraegeRes, anfragenRes] = await Promise.all([
    supabaseAdmin
      .from("auftraege")
      .select(
        "id, titel, status, plz, ort, auftrag_positionen!inner(handwerker_id)"
      )
      .eq("auftrag_positionen.handwerker_id", hwId)
      .or(`titel.ilike.${pattern},plz.ilike.${pattern},ort.ilike.${pattern}`)
      .order("updated_at", { ascending: false })
      .limit(10),
    supabaseAdmin
      .from("angebot_handwerker")
      .select(
        "id, status, angebote(id, notizen, leads(kontakt_name, situation, plz, ort))"
      )
      .eq("handwerker_id", hwId)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  if (auftraegeRes.error)
    logDbError("api/partner/suche:auftraege", auftraegeRes.error);
  if (anfragenRes.error)
    logDbError("api/partner/suche:anfragen", anfragenRes.error);

  const seen = new Set<string>();

  for (const a of auftraegeRes.data ?? []) {
    const id = String(a.id);
    if (seen.has(id)) continue;
    seen.add(id);
    const label = (a.titel as string | null)?.trim() || "Auftrag";
    const sub = [a.status, [a.plz, a.ort].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(" · ");
    hits.push({
      id: `a-${id}`,
      group: "vorgaenge",
      icon: "wrench",
      label,
      sub: sub || "Auftrag",
      href: `/partner?section=vorgaenge&id=${encodeURIComponent(id)}`,
    });
  }

  const needle = q.toLowerCase();
  for (const row of anfragenRes.data ?? []) {
    const angebot = row.angebote as
      | {
          id?: string;
          notizen?: string | null;
          leads?: {
            kontakt_name?: string | null;
            situation?: string | null;
            plz?: string | null;
            ort?: string | null;
          } | null;
        }
      | null
      | Array<unknown>;
    const ang = Array.isArray(angebot) ? null : angebot;
    const lead = ang?.leads ?? null;
    const hay = [
      row.id,
      ang?.id,
      ang?.notizen,
      lead?.kontakt_name,
      lead?.situation,
      lead?.plz,
      lead?.ort,
      row.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!hay.includes(needle)) continue;

    const id = String(row.id);
    if (seen.has(id)) continue;
    seen.add(id);
    const label =
      lead?.kontakt_name?.trim() ||
      lead?.situation?.trim() ||
      "Anfrage";
    const sub = ["Anfrage", row.status, lead?.plz].filter(Boolean).join(" · ");
    hits.push({
      id: `ah-${id}`,
      group: "vorgaenge",
      icon: "clipboard-list",
      label,
      sub,
      href: `/partner?section=vorgaenge&id=${encodeURIComponent(id)}`,
    });
    if (hits.length >= 14) break;
  }

  return NextResponse.json({ hits: hits.slice(0, 14) });
}
