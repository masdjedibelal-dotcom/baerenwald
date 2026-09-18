import { NextResponse } from "next/server";

import { requireEigentuemerSession } from "@/lib/portal/require-eigentuemer-session";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type Body = {
  titel?: string;
  strasse?: string;
  hausnummer?: string;
  plz?: string;
  ort?: string;
  /** Optional: erste Einheit (sonst „Wohnung 1“). */
  einheit?: string;
};

/**
 * Eigentümer legt eigenes Objekt + Einheit an (ohne HV).
 * → kunden_objekte (kunde_id = Eigentümer) + einheit_bewohner + eigentuemer_objekte.
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
  const titel = String(body.titel ?? "").trim();
  const plz = String(body.plz ?? "").trim();
  if (!titel || !plz) {
    return NextResponse.json(
      { error: "Titel und PLZ sind Pflicht." },
      { status: 400 }
    );
  }

  const strasse = String(body.strasse ?? "").trim() || null;
  const hausnummer = String(body.hausnummer ?? "").trim() || null;
  const ort = String(body.ort ?? "").trim() || null;
  const einheitBez =
    String(body.einheit ?? "").trim() || "Wohnung / Einheit";

  const { data: objekt, error: objErr } = await supabaseAdmin
    .from("kunden_objekte")
    .insert({
      kunde_id: session.kundeId,
      titel,
      strasse,
      hausnummer,
      plz,
      ort,
      melde_aktiv: false,
    })
    .select("id, titel, strasse, hausnummer, plz, ort")
    .single();

  if (objErr || !objekt) {
    return NextResponse.json(
      { error: objErr?.message ?? "Objekt nicht angelegt." },
      { status: 500 }
    );
  }

  const objektId = String(objekt.id);

  await supabaseAdmin.from("eigentuemer_objekte").upsert(
    { kunde_id: session.kundeId, kunde_objekt_id: objektId },
    { onConflict: "kunde_id,kunde_objekt_id" }
  );

  let einheitId: string | null = null;
  {
    const { data: eh, error: ehErr } = await supabaseAdmin
      .from("objekt_einheiten")
      .insert({
        kunde_objekt_id: objektId,
        bezeichnung: einheitBez,
        aktiv: true,
      })
      .select("id")
      .single();
    if (!ehErr && eh) einheitId = String(eh.id);
  }

  if (einheitId) {
    await supabaseAdmin.from("einheit_bewohner").insert({
      objekt_einheit_id: einheitId,
      name: session.name?.trim() || "Eigentümer",
      email: session.email,
      telefon: session.telefon,
      rolle: "eigentuemer",
      portal_kunde_id: session.kundeId,
      sondereigentum_verwaltung: false,
      aktiv: true,
    });
  }

  return NextResponse.json({
    objekt: {
      id: objektId,
      titel: String(objekt.titel ?? titel),
      strasse: objekt.strasse ?? strasse ?? "",
      hausnummer: objekt.hausnummer ?? hausnummer ?? "",
      plz: String(objekt.plz ?? plz),
      ort: objekt.ort ?? ort ?? "",
    },
    einheitId,
  });
}
