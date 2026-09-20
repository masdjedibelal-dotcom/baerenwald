import { logDbError } from '@/lib/errors/log-db-error'
import { NextResponse } from "next/server";

import { persistLead } from "@/lib/lead/persist-lead";
import { eigentuemerEinheitCreateAllowed } from "@/lib/portal2/eigentuemer";
import { requireEigentuemerSession } from "@/lib/portal/require-eigentuemer-session";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type Body = {
  objektId?: string;
  einheitId?: string;
  einheitLabel?: string;
  situation?: string | null;
  bereiche?: string[];
  preis_min?: number;
  preis_max?: number;
  zeitraum?: string | null;
  beschreibung?: string;
  funnel_daten?: unknown;
  name?: string;
  email?: string;
  telefon?: string;
};

async function assertEigentuemerMayCreate(opts: {
  kundeId: string;
  objektId: string;
  einheitId?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const {data: objekt, error: __dbErr229_1} = await supabaseAdmin
    .from("kunden_objekte")
    .select("id, kunde_id")
    .eq("id", opts.objektId)
    .maybeSingle();
  if (__dbErr229_1) logDbError('app/api/portal/eigentuemer/anfrage/route:kunden_objekte', __dbErr229_1)
  if (!objekt) return { ok: false, error: "Objekt nicht gefunden." };

  const objektEigen = String(objekt.kunde_id) === opts.kundeId;
  if (objektEigen) return { ok: true };

  const {data: link, error: __dbErr230_2} = await supabaseAdmin
    .from("eigentuemer_objekte")
    .select("id")
    .eq("kunde_id", opts.kundeId)
    .eq("kunde_objekt_id", opts.objektId)
    .maybeSingle();
  if (__dbErr230_2) logDbError('app/api/portal/eigentuemer/anfrage/route:eigentuemer_objekte', __dbErr230_2)
  if (!link) {
    return { ok: false, error: "Kein Zugriff auf dieses Objekt." };
  }

  if (opts.einheitId) {
    const {data: bew, error: __dbErr231_3} = await supabaseAdmin
      .from("einheit_bewohner")
      .select("sondereigentum_verwaltung")
      .eq("portal_kunde_id", opts.kundeId)
      .eq("objekt_einheit_id", opts.einheitId)
      .eq("rolle", "eigentuemer")
      .eq("aktiv", true)
      .maybeSingle();
    if (__dbErr231_3) logDbError('app/api/portal/eigentuemer/anfrage/route:einheit_bewohner', __dbErr231_3)
    if (
      !eigentuemerEinheitCreateAllowed({
        sondereigentumVerwaltung: bew?.sondereigentum_verwaltung,
        objektEigen: false,
      })
    ) {
      return {
        ok: false,
        error:
          "Für diese Einheit führt die Hausverwaltung das Sondereigentum — Anfragen laufen über die Verwaltung.",
      };
    }
    return { ok: true };
  }

  /** Ohne konkrete Einheit: Create ok, wenn mind. eine Einheit ohne SE-Verwaltung. */
  const {data: ehs, error: __dbErr232_4} = await supabaseAdmin
    .from("objekt_einheiten")
    .select("id")
    .eq("kunde_objekt_id", opts.objektId)
    .eq("aktiv", true);
  if (__dbErr232_4) logDbError('app/api/portal/eigentuemer/anfrage/route:objekt_einheiten', __dbErr232_4)
  const ehIds = (ehs ?? []).map((e) => String(e.id));
  if (!ehIds.length) return { ok: true };

  const {data: bews, error: __dbErr233_5} = await supabaseAdmin
    .from("einheit_bewohner")
    .select("objekt_einheit_id, sondereigentum_verwaltung")
    .eq("portal_kunde_id", opts.kundeId)
    .eq("rolle", "eigentuemer")
    .eq("aktiv", true)
    .in("objekt_einheit_id", ehIds);
  if (__dbErr233_5) logDbError('app/api/portal/eigentuemer/anfrage/route:einheit_bewohner', __dbErr233_5)
  const rows = bews ?? [];
  if (!rows.length) return { ok: true };
  const anyOpen = rows.some((b) => !Boolean(b.sondereigentum_verwaltung));
  if (!anyOpen) {
    return {
      ok: false,
      error:
        "Für alle Ihre Einheiten an diesem Objekt führt die Hausverwaltung das Sondereigentum.",
    };
  }
  return { ok: true };
}

/**
 * Eigentümer-Anfrage (wie Privat mit Preis) — nur wenn SE-Verwaltung aus
 * oder Objekt dem Eigentümer gehört.
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "DB nicht konfiguriert." }, { status: 503 });
  }

  const session = await requireEigentuemerSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = (await req.json()) as Body;
  const objektId = String(body.objektId ?? "").trim();
  if (!objektId) {
    return NextResponse.json({ error: "Bitte ein Objekt wählen." }, { status: 400 });
  }

  const gate = await assertEigentuemerMayCreate({
    kundeId: session.kundeId,
    objektId,
    einheitId: String(body.einheitId ?? "").trim() || undefined,
  });
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: 403 });
  }

  const {data: objekt, error: __dbErr234_6} = await supabaseAdmin
    .from("kunden_objekte")
    .select("id, plz, strasse, hausnummer, titel, ort")
    .eq("id", objektId)
    .maybeSingle();
  if (__dbErr234_6) logDbError('app/api/portal/eigentuemer/anfrage/route:kunden_objekte', __dbErr234_6)
  if (!objekt) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  const situation = body.situation?.trim() || null;
  const bereiche = Array.isArray(body.bereiche) ? body.bereiche : [];
  const anlass = situation === "kaputt" ? "meldung" : "projekt";

  const result = await persistLead({
    name: body.name?.trim() || session.name?.trim() || "Eigentümer",
    email: body.email?.trim() || session.email,
    telefon: body.telefon?.trim() || session.telefon || undefined,
    notizen: body.beschreibung?.trim() || undefined,
    situation,
    bereiche,
    preis_min: body.preis_min,
    preis_max: body.preis_max,
    plz: String(objekt.plz ?? "").trim() || undefined,
    strasse: objekt.strasse ? String(objekt.strasse) : undefined,
    hausnummer: objekt.hausnummer ? String(objekt.hausnummer) : undefined,
    ort: objekt.ort ? String(objekt.ort) : undefined,
    zeitraum: body.zeitraum ?? undefined,
    kundentyp: "eigentuemer",
    funnel_daten: body.funnel_daten,
    funnel_quelle: "portal_eigentuemer",
    kanal: "website",
    anlass,
    kunde_objekt_id: objektId,
    auftraggeber_kunde_id: session.kundeId,
    melder_einheit: body.einheitLabel?.trim() || null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ id: result.id });
}
