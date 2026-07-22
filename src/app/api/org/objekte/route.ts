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

  const selectCols =
    "id, titel, strasse, hausnummer, plz, ort, melde_slug, melde_aktiv, einheiten_hinweis, notizen_intern, kostenstelle_nr, freigabe_schwelle_eur, versicherer, versicherungs_nr, selbstbehalt_eur, cover_url, created_at";

  const { data, error } = await supabaseAdmin
    .from("kunden_objekte")
    .select(selectCols)
    .eq("kunde_id", session.kunde.id)
    .order("titel", { ascending: true });

  if (error && /cover_url|versicherer|versicherungs_nr|selbstbehalt/i.test(error.message)) {
    const fallbackCols =
      "id, titel, strasse, hausnummer, plz, ort, melde_slug, melde_aktiv, einheiten_hinweis, notizen_intern, kostenstelle_nr, freigabe_schwelle_eur, created_at";
    const { data: healed, error: reloadErr } = await supabaseAdmin
      .from("kunden_objekte")
      .select(fallbackCols)
      .eq("kunde_id", session.kunde.id)
      .order("titel", { ascending: true });
    if (reloadErr) {
      return NextResponse.json({ error: reloadErr.message }, { status: 500 });
    }
    const rows = healed ?? [];
    await ensureMeldeSlugsForKunde(session.kunde.id, rows);
    return NextResponse.json({ objekte: rows });
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  await ensureMeldeSlugsForKunde(session.kunde.id, rows);

  const { data: healed, error: reloadErr } = await supabaseAdmin
    .from("kunden_objekte")
    .select(selectCols)
    .eq("kunde_id", session.kunde.id)
    .order("titel", { ascending: true });

  if (reloadErr && /cover_url/i.test(reloadErr.message)) {
    return NextResponse.json({ objekte: rows });
  }

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
  typ?: string;
  melde_slug?: string;
  kostenstelle_nr?: string;
  melde_aktiv?: boolean;
  einheiten_hinweis?: string;
  notizen_intern?: string | null;
  freigabe_schwelle_eur?: number | null;
  versicherer?: string | null;
  versicherungs_nr?: string | null;
  selbstbehalt_eur?: number | null;
};

/** Spec E2: aktive Vorgänge blockieren Löschen. */
async function countAktiveVorgaengeAmObjekt(objektId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("leads")
    .select("id, status, vorgang_phase, hv_meldung_status")
    .eq("kunde_objekt_id", objektId);

  if (error || !data) return 0;

  let n = 0;
  for (const row of data) {
    const status = String(row.status ?? "")
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
    if (status === "storniert" || status === "abgelehnt") continue;
    const phase = String(row.vorgang_phase ?? "")
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
    if (phase === "abgeschlossen" || phase === "erledigt") continue;
    const hv = String(row.hv_meldung_status ?? "")
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
    if (hv === "abgeschlossen") continue;
    n += 1;
  }
  return n;
}

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

  const insertRow: Record<string, unknown> = {
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
  };
  if (body.notizen_intern !== undefined) {
    insertRow.notizen_intern = body.notizen_intern?.trim() || null;
  }
  if (body.freigabe_schwelle_eur !== undefined) {
    insertRow.freigabe_schwelle_eur =
      body.freigabe_schwelle_eur == null
        ? null
        : Number(body.freigabe_schwelle_eur);
  }
  if (body.kostenstelle_nr !== undefined) {
    insertRow.kostenstelle_nr = body.kostenstelle_nr?.trim() || null;
  }
  if (body.typ !== undefined) {
    insertRow.typ = body.typ?.trim() || null;
  }

  let { data, error } = await supabaseAdmin
    .from("kunden_objekte")
    .insert(insertRow)
    .select("id, titel, melde_slug")
    .single();

  if (error && /typ/i.test(error.message) && "typ" in insertRow) {
    const { typ: _t, ...withoutTyp } = insertRow;
    ({ data, error } = await supabaseAdmin
      .from("kunden_objekte")
      .insert(withoutTyp)
      .select("id, titel, melde_slug")
      .single());
  }

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
  if (body.notizen_intern !== undefined) {
    patch.notizen_intern = body.notizen_intern?.trim() || null;
  }
  if (body.kostenstelle_nr !== undefined) {
    patch.kostenstelle_nr = body.kostenstelle_nr?.trim() || null;
  }
  if (body.freigabe_schwelle_eur !== undefined) {
    patch.freigabe_schwelle_eur =
      body.freigabe_schwelle_eur == null ? null : Number(body.freigabe_schwelle_eur);
  }
  if (body.versicherer !== undefined) {
    patch.versicherer = body.versicherer?.trim() || null;
  }
  if (body.versicherungs_nr !== undefined) {
    patch.versicherungs_nr = body.versicherungs_nr?.trim() || null;
  }
  if (body.selbstbehalt_eur !== undefined) {
    const n =
      body.selbstbehalt_eur == null ? NaN : Number(body.selbstbehalt_eur);
    patch.selbstbehalt_eur = Number.isFinite(n) ? n : null;
  }
  if (body.typ !== undefined) {
    patch.typ = body.typ?.trim() || null;
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

  let { data, error } = await supabaseAdmin
    .from("kunden_objekte")
    .update(patch)
    .eq("id", id)
    .eq("kunde_id", session.kunde.id)
    .select("id, titel, melde_slug, melde_aktiv")
    .maybeSingle();

  if (error && /typ/i.test(error.message) && "typ" in patch) {
    const { typ: _t, ...withoutTyp } = patch;
    ({ data, error } = await supabaseAdmin
      .from("kunden_objekte")
      .update(withoutTyp)
      .eq("id", id)
      .eq("kunde_id", session.kunde.id)
      .select("id, titel, melde_slug, melde_aktiv")
      .maybeSingle());
  }

  if (
    error &&
    /versicherer|versicherungs_nr|selbstbehalt/i.test(error.message)
  ) {
    const {
      versicherer: _v,
      versicherungs_nr: _vn,
      selbstbehalt_eur: _s,
      ...withoutVers
    } = patch;
    ({ data, error } = await supabaseAdmin
      .from("kunden_objekte")
      .update(withoutVers)
      .eq("id", id)
      .eq("kunde_id", session.kunde.id)
      .select("id, titel, melde_slug, melde_aktiv")
      .maybeSingle());
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, objekt: data });
}

export async function DELETE(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const url = new URL(req.url);
  let id = url.searchParams.get("id")?.trim() || "";
  if (!id) {
    try {
      const body = (await req.json()) as { id?: string };
      id = String(body.id ?? "").trim();
    } catch {
      /* empty body */
    }
  }
  if (!id) {
    return NextResponse.json({ error: "ID fehlt." }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from("kunden_objekte")
    .select("id, titel")
    .eq("id", id)
    .eq("kunde_id", session.kunde.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  const aktive = await countAktiveVorgaengeAmObjekt(id);
  if (aktive > 0) {
    return NextResponse.json(
      {
        error:
          "Objekt kann nicht gelöscht werden: Es hängen noch offene Vorgänge daran.",
        aktive,
      },
      { status: 409 }
    );
  }

  const { error } = await supabaseAdmin
    .from("kunden_objekte")
    .delete()
    .eq("id", id)
    .eq("kunde_id", session.kunde.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id });
}
