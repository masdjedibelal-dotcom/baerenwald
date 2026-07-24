import { NextResponse } from "next/server";

import {
  assertOrgEinheit,
  requireOrgWrite,
} from "@/lib/org/assert-org-objekt";
import { ensureObjektBewohner } from "@/lib/org/ensure-objekt-bewohner";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const objektId = new URL(req.url).searchParams.get("objektId")?.trim();
  const einheitId = new URL(req.url).searchParams.get("einheitId")?.trim();

  if (einheitId) {
    if (!(await assertOrgEinheit(session.kunde.id, einheitId))) {
      return NextResponse.json({ error: "Einheit nicht gefunden." }, { status: 404 });
    }
    const { data, error } = await supabaseAdmin
      .from("einheit_bewohner")
      .select("*")
      .eq("objekt_einheit_id", einheitId)
      .eq("aktiv", true)
      .is("anonymisiert_am", null)
      .order("created_at", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ bewohner: data ?? [] });
  }

  if (!objektId) {
    return NextResponse.json({ error: "objektId oder einheitId fehlt." }, { status: 400 });
  }

  const { data: einheiten } = await supabaseAdmin
    .from("objekt_einheiten")
    .select("id")
    .eq("kunde_objekt_id", objektId);

  const ids = (einheiten ?? []).map((e) => e.id);
  if (!ids.length) return NextResponse.json({ bewohner: [] });

  const { data, error } = await supabaseAdmin
    .from("einheit_bewohner")
    .select("*, objekt_einheiten(bezeichnung, etage)")
    .in("objekt_einheit_id", ids)
    .eq("kunde_id", session.kunde.id)
    .eq("aktiv", true)
    .is("anonymisiert_am", null);

  if (error) {
    if (/etage/i.test(error.message)) {
      const fallback = await supabaseAdmin
        .from("einheit_bewohner")
        .select("*, objekt_einheiten(bezeichnung)")
        .in("objekt_einheit_id", ids)
        .eq("kunde_id", session.kunde.id)
        .eq("aktiv", true)
        .is("anonymisiert_am", null);
      if (fallback.error) {
        return NextResponse.json({ error: fallback.error.message }, { status: 500 });
      }
      return NextResponse.json({ bewohner: fallback.data ?? [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ bewohner: data ?? [] });
}

type Body = {
  id?: string;
  einheitId?: string;
  /** Alternativ zu einheitId: Wohnung finden/anlegen am Objekt */
  objektId?: string;
  wohnung?: string;
  name?: string;
  telefon?: string;
  email?: string;
  /** Optional: Etage der Wohnung mitspeichern */
  etage?: string;
};

async function resolveEinheitId(opts: {
  kundeId: string;
  einheitId?: string;
  objektId?: string;
  wohnung?: string;
  etage?: string;
}): Promise<{ id: string } | { error: string; status: number }> {
  if (opts.einheitId) {
    if (!(await assertOrgEinheit(opts.kundeId, opts.einheitId))) {
      return { error: "Einheit nicht gefunden.", status: 404 };
    }
    if (opts.etage) {
      await supabaseAdmin
        .from("objekt_einheiten")
        .update({ etage: opts.etage })
        .eq("id", opts.einheitId);
    }
    return { id: opts.einheitId };
  }

  const objektId = opts.objektId?.trim() ?? "";
  if (!objektId) {
    return { error: "Objekt erforderlich.", status: 400 };
  }

  const wohnung = opts.wohnung?.trim() || "Allgemein";

  const { data: objekt } = await supabaseAdmin
    .from("kunden_objekte")
    .select("id")
    .eq("id", objektId)
    .eq("kunde_id", opts.kundeId)
    .maybeSingle();
  if (!objekt) {
    return { error: "Objekt nicht gefunden.", status: 404 };
  }

  const { data: existing } = await supabaseAdmin
    .from("objekt_einheiten")
    .select("id")
    .eq("kunde_objekt_id", objektId)
    .eq("aktiv", true)
    .ilike("bezeichnung", wohnung)
    .maybeSingle();

  if (existing?.id) {
    if (opts.etage) {
      await supabaseAdmin
        .from("objekt_einheiten")
        .update({ etage: opts.etage })
        .eq("id", existing.id);
    }
    return { id: existing.id };
  }

  const insertRow: Record<string, unknown> = {
    kunde_objekt_id: objektId,
    bezeichnung: wohnung,
    etage: opts.etage || null,
  };
  const { data: created, error } = await supabaseAdmin
    .from("objekt_einheiten")
    .insert(insertRow)
    .select("id")
    .single();

  if (error) {
    if (/etage/i.test(error.message)) {
      const retry = await supabaseAdmin
        .from("objekt_einheiten")
        .insert({
          kunde_objekt_id: objektId,
          bezeichnung: wohnung,
        })
        .select("id")
        .single();
      if (retry.error || !retry.data) {
        return {
          error: retry.error?.message ?? "Wohnung konnte nicht angelegt werden.",
          status: 500,
        };
      }
      return { id: retry.data.id };
    }
    return { error: error.message, status: 500 };
  }
  if (!created?.id) {
    return { error: "Wohnung konnte nicht angelegt werden.", status: 500 };
  }
  return { id: created.id };
}

export async function POST(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }
  const write = requireOrgWrite(session);
  if (!write.ok) return NextResponse.json({ error: write.error }, { status: write.status });

  const body = (await req.json()) as Body;
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name erforderlich." }, { status: 400 });
  }

  const objektId = String(body.objektId ?? "").trim();
  const einheitId = String(body.einheitId ?? "").trim();

  if (objektId && !einheitId) {
    const ensured = await ensureObjektBewohner({
      kundeId: session.kunde.id,
      objektId,
      name,
      wohnung: body.wohnung,
      etage: body.etage,
      email: body.email,
      telefon: body.telefon,
    });
    if (!ensured.ok) {
      return NextResponse.json({ error: ensured.error }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      id: ensured.bewohnerId,
      einheitId: ensured.einheitId,
    });
  }

  const resolved = await resolveEinheitId({
    kundeId: session.kunde.id,
    einheitId: einheitId || undefined,
    objektId: objektId || undefined,
    wohnung: String(body.wohnung ?? "").trim() || undefined,
    etage: body.etage?.trim() || undefined,
  });
  if ("error" in resolved) {
    return NextResponse.json(
      { error: resolved.error },
      { status: resolved.status }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("einheit_bewohner")
    .insert({
      kunde_id: session.kunde.id,
      objekt_einheit_id: resolved.id,
      name,
      telefon: body.telefon?.trim() || null,
      email: body.email?.trim() || null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }
  const write = requireOrgWrite(session);
  if (!write.ok) return NextResponse.json({ error: write.error }, { status: write.status });

  const body = (await req.json()) as Body;
  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "id fehlt." }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name != null) patch.name = String(body.name).trim();
  if (body.telefon != null) patch.telefon = body.telefon.trim() || null;
  if (body.email != null) patch.email = body.email.trim() || null;

  const { error } = await supabaseAdmin
    .from("einheit_bewohner")
    .update(patch)
    .eq("id", id)
    .eq("kunde_id", session.kunde.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }
  const write = requireOrgWrite(session);
  if (!write.ok) return NextResponse.json({ error: write.error }, { status: write.status });

  const id = new URL(req.url).searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "id fehlt." }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("einheit_bewohner")
    .update({ aktiv: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("kunde_id", session.kunde.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
