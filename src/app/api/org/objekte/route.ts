import { NextResponse } from "next/server";

import { requireOrganisationSession } from "@/lib/org/require-org-session";
import {
  isValidMeldeSlug,
  suggestMeldeSlugFromAddress,
} from "@/lib/org/slug";
import { allocateMeldeSlug, ensureMeldeSlugsForKunde } from "@/lib/org/ensure-melde-slug";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { data, error } = await supabaseAdmin
    .from("kunden_objekte")
    .select(
      "id, titel, strasse, hausnummer, plz, ort, melde_slug, melde_aktiv, einheiten_hinweis, notizen_intern, kostenstelle_nr, created_at"
    )
    .eq("kunde_id", session.kunde.id)
    .order("titel", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  await ensureMeldeSlugsForKunde(session.kunde.id, rows);

  const { data: healed, error: reloadErr } = await supabaseAdmin
    .from("kunden_objekte")
    .select(
      "id, titel, strasse, hausnummer, plz, ort, melde_slug, melde_aktiv, einheiten_hinweis, notizen_intern, kostenstelle_nr, created_at"
    )
    .eq("kunde_id", session.kunde.id)
    .order("titel", { ascending: true });

  if (reloadErr) {
    return NextResponse.json({ error: reloadErr.message }, { status: 500 });
  }

  return NextResponse.json({ objekte: healed ?? [] });
}

type ObjektBody = {
  id?: string;
  titel?: string;
  strasse?: string;
  hausnummer?: string;
  plz?: string;
  ort?: string;
  melde_slug?: string;
  kostenstelle_nr?: string;
  melde_aktiv?: boolean;
  einheiten_hinweis?: string;
  freigabe_schwelle_eur?: number | null;
};

export async function POST(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = (await req.json()) as ObjektBody;
  const titel = String(body.titel ?? "").trim();
  if (!titel) {
    return NextResponse.json({ error: "Titel fehlt." }, { status: 400 });
  }

  const baseSlug =
    suggestMeldeSlugFromAddress(body.strasse, body.hausnummer, body.plz) ||
    suggestMeldeSlugFromAddress(titel, null, null);

  const melde_slug = await allocateMeldeSlug(session.kunde.id, baseSlug);

  if (!isValidMeldeSlug(melde_slug)) {
    return NextResponse.json({ error: "Link konnte nicht erzeugt werden." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("kunden_objekte")
    .insert({
      kunde_id: session.kunde.id,
      titel,
      strasse: body.strasse?.trim() || null,
      hausnummer: body.hausnummer?.trim() || null,
      plz: body.plz?.trim() || null,
      ort: body.ort?.trim() || null,
      melde_slug,
      melde_aktiv: body.melde_aktiv !== false,
      einheiten_hinweis: body.einheiten_hinweis?.trim() || null,
      created_by: "portal",
    })
    .select("id, titel, melde_slug")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, objekt: data });
}

export async function PATCH(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = (await req.json()) as ObjektBody;
  const id = String(body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "ID fehlt." }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from("kunden_objekte")
    .select("id, titel, strasse, hausnummer, plz, ort, melde_slug, melde_aktiv")
    .eq("id", id)
    .eq("kunde_id", session.kunde.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};
  if (body.titel !== undefined) patch.titel = String(body.titel).trim();
  if (body.strasse !== undefined) patch.strasse = body.strasse?.trim() || null;
  if (body.hausnummer !== undefined) {
    patch.hausnummer = body.hausnummer?.trim() || null;
  }
  if (body.plz !== undefined) patch.plz = body.plz?.trim() || null;
  if (body.ort !== undefined) patch.ort = body.ort?.trim() || null;
  if (body.melde_aktiv !== undefined) patch.melde_aktiv = Boolean(body.melde_aktiv);
  if (body.einheiten_hinweis !== undefined) {
    patch.einheiten_hinweis = body.einheiten_hinweis?.trim() || null;
  }
  if (body.kostenstelle_nr !== undefined) {
    patch.kostenstelle_nr = body.kostenstelle_nr?.trim() || null;
  }
  if (body.freigabe_schwelle_eur !== undefined) {
    patch.freigabe_schwelle_eur =
      body.freigabe_schwelle_eur == null ? null : Number(body.freigabe_schwelle_eur);
  }

  const willBeActive =
    body.melde_aktiv !== undefined ? Boolean(body.melde_aktiv) : existing.melde_aktiv !== false;
  if (willBeActive && !String(existing.melde_slug ?? "").trim()) {
    const baseSlug =
      suggestMeldeSlugFromAddress(
        body.strasse ?? existing.strasse,
        body.hausnummer ?? existing.hausnummer,
        body.plz ?? existing.plz
      ) || suggestMeldeSlugFromAddress(body.titel ?? existing.titel, null, null);
    patch.melde_slug = await allocateMeldeSlug(session.kunde.id, baseSlug);
  }

  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("kunden_objekte")
    .update(patch)
    .eq("id", id)
    .eq("kunde_id", session.kunde.id)
    .select("id, titel, melde_slug, melde_aktiv")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, objekt: data });
}
