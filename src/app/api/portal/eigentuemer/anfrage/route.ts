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
  const { data: objekt } = await supabaseAdmin
    .from("kunden_objekte")
    .select("id, kunde_id")
    .eq("id", opts.objektId)
    .maybeSingle();

  if (!objekt) return { ok: false, error: "Objekt nicht gefunden." };

  const objektEigen = String(objekt.kunde_id) === opts.kundeId;
  if (objektEigen) return { ok: true };

  const { data: link } = await supabaseAdmin
    .from("eigentuemer_objekte")
    .select("id")
    .eq("kunde_id", opts.kundeId)
    .eq("kunde_objekt_id", opts.objektId)
    .maybeSingle();

  if (!link) {
    return { ok: false, error: "Kein Zugriff auf dieses Objekt." };
  }

  if (opts.einheitId) {
    const { data: bew } = await supabaseAdmin
      .from("einheit_bewohner")
      .select("sondereigentum_verwaltung")
      .eq("portal_kunde_id", opts.kundeId)
      .eq("objekt_einheit_id", opts.einheitId)
      .eq("rolle", "eigentuemer")
      .eq("aktiv", true)
      .maybeSingle();
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
  const { data: ehs } = await supabaseAdmin
    .from("objekt_einheiten")
    .select("id")
    .eq("kunde_objekt_id", opts.objektId)
    .eq("aktiv", true);
  const ehIds = (ehs ?? []).map((e) => String(e.id));
  if (!ehIds.length) return { ok: true };

  const { data: bews } = await supabaseAdmin
    .from("einheit_bewohner")
    .select("objekt_einheit_id, sondereigentum_verwaltung")
    .eq("portal_kunde_id", opts.kundeId)
    .eq("rolle", "eigentuemer")
    .eq("aktiv", true)
    .in("objekt_einheit_id", ehIds);

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

  const { data: objekt } = await supabaseAdmin
    .from("kunden_objekte")
    .select("id, plz, strasse, hausnummer, titel, ort")
    .eq("id", objektId)
    .maybeSingle();

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
