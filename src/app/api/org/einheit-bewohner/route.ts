import { NextResponse } from "next/server";

import {
  assertOrgEinheit,
  requireOrgWrite,
} from "@/lib/org/assert-org-objekt";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type ResolveEinheitInput = {
  kundeId: string;
  einheitId?: string;
  objektId?: string;
  wohnung?: string;
  etage?: string;
};

async function resolveOrCreateEinheit(
  input: ResolveEinheitInput
): Promise<{ id: string } | { error: string; status: number }> {
  if (input.einheitId) {
    const ok = await assertOrgEinheit(input.kundeId, input.einheitId);
    if (!ok) return { error: "Einheit nicht gefunden.", status: 404 };
    if (input.etage) {
      await supabaseAdmin
        .from("objekt_einheiten")
        .update({ etage: input.etage })
        .eq("id", input.einheitId);
    }
    return { id: input.einheitId };
  }

  const objektId = input.objektId?.trim() ?? "";
  if (!objektId) return { error: "Objekt erforderlich.", status: 400 };

  const bezeichnung = input.wohnung?.trim() || "Allgemein";
  const { data: objekt } = await supabaseAdmin
    .from("kunden_objekte")
    .select("id")
    .eq("id", objektId)
    .eq("kunde_id", input.kundeId)
    .maybeSingle();
  if (!objekt) return { error: "Objekt nicht gefunden.", status: 404 };

  const { data: existing } = await supabaseAdmin
    .from("objekt_einheiten")
    .select("id")
    .eq("kunde_objekt_id", objektId)
    .eq("aktiv", true)
    .ilike("bezeichnung", bezeichnung)
    .maybeSingle();

  if (existing?.id) {
    if (input.etage) {
      await supabaseAdmin
        .from("objekt_einheiten")
        .update({ etage: input.etage })
        .eq("id", existing.id);
    }
    return { id: existing.id };
  }

  const insertRow = {
    kunde_objekt_id: objektId,
    bezeichnung,
    etage: input.etage || null,
  };
  const { data: created, error } = await supabaseAdmin
    .from("objekt_einheiten")
    .insert(insertRow)
    .select("id")
    .single();

  if (error) {
    if (/etage/i.test(error.message)) {
      const fallback = await supabaseAdmin
        .from("objekt_einheiten")
        .insert({ kunde_objekt_id: objektId, bezeichnung })
        .select("id")
        .single();
      if (fallback.error || !fallback.data) {
        return {
          error:
            fallback.error?.message ?? "Wohnung konnte nicht angelegt werden.",
          status: 500,
        };
      }
      return { id: fallback.data.id };
    }
    return { error: error.message, status: 500 };
  }

  if (!created?.id) {
    return { error: "Wohnung konnte nicht angelegt werden.", status: 500 };
  }
  return { id: created.id };
}

/** Bewohner anlegen inkl. Wohnung (wenn noch nicht vorhanden). */
async function createBewohnerWithWohnung(input: {
  kundeId: string;
  objektId: string;
  name: string;
  wohnung?: string;
  etage?: string;
  email?: string;
  telefon?: string;
}): Promise<
  | { ok: true; bewohnerId: string; einheitId: string }
  | { ok: false; error: string }
> {
  const name = input.name.trim();
  const objektId = input.objektId.trim();
  if (!name || !objektId) {
    return { ok: false, error: "Name und Objekt erforderlich." };
  }

  const { data: objekt } = await supabaseAdmin
    .from("kunden_objekte")
    .select("id")
    .eq("id", objektId)
    .eq("kunde_id", input.kundeId)
    .maybeSingle();
  if (!objekt) return { ok: false, error: "Objekt nicht gefunden." };

  const bezeichnung = input.wohnung?.trim() || "Allgemein";
  const etage = input.etage?.trim() || null;

  const { data: existing } = await supabaseAdmin
    .from("objekt_einheiten")
    .select("id")
    .eq("kunde_objekt_id", objektId)
    .eq("aktiv", true)
    .ilike("bezeichnung", bezeichnung)
    .maybeSingle();

  let einheitId = existing?.id ?? "";
  if (einheitId) {
    if (etage) {
      await supabaseAdmin
        .from("objekt_einheiten")
        .update({ etage })
        .eq("id", einheitId);
    }
  } else {
    const { data: created, error } = await supabaseAdmin
      .from("objekt_einheiten")
      .insert({ kunde_objekt_id: objektId, bezeichnung, etage })
      .select("id")
      .single();
    if (error) {
      if (!/etage/i.test(error.message)) {
        return { ok: false, error: error.message };
      }
      const fallback = await supabaseAdmin
        .from("objekt_einheiten")
        .insert({ kunde_objekt_id: objektId, bezeichnung })
        .select("id")
        .single();
      if (fallback.error || !fallback.data) {
        return {
          ok: false,
          error:
            fallback.error?.message ?? "Wohnung konnte nicht angelegt werden.",
        };
      }
      einheitId = fallback.data.id;
    } else {
      if (!created?.id) {
        return { ok: false, error: "Wohnung konnte nicht angelegt werden." };
      }
      einheitId = created.id;
    }
  }

  const { data: bewohner, error: bewErr } = await supabaseAdmin
    .from("einheit_bewohner")
    .insert({
      kunde_id: input.kundeId,
      objekt_einheit_id: einheitId,
      name,
      telefon: input.telefon?.trim() || null,
      email: input.email?.trim() || null,
    })
    .select("id")
    .single();

  if (bewErr || !bewohner?.id) {
    return {
      ok: false,
      error: bewErr?.message ?? "Mieter konnte nicht angelegt werden.",
    };
  }
  return { ok: true, bewohnerId: bewohner.id, einheitId };
}

export async function GET(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const url = new URL(req.url);
  const objektId = url.searchParams.get("objektId")?.trim();
  const einheitId = url.searchParams.get("einheitId")?.trim();

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
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ bewohner: data ?? [] });
  }

  if (!objektId) {
    return NextResponse.json(
      { error: "objektId oder einheitId fehlt." },
      { status: 400 }
    );
  }

  const { data: einheiten } = await supabaseAdmin
    .from("objekt_einheiten")
    .select("id")
    .eq("kunde_objekt_id", objektId);
  const ids = (einheiten ?? []).map((e) => e.id);
  if (!ids.length) {
    return NextResponse.json({ bewohner: [] });
  }

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
        return NextResponse.json(
          { error: fallback.error.message },
          { status: 500 }
        );
      }
      return NextResponse.json({ bewohner: fallback.data ?? [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ bewohner: data ?? [] });
}

export async function POST(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }
  const write = requireOrgWrite(session);
  if (!write.ok) {
    return NextResponse.json({ error: write.error }, { status: write.status });
  }

  const body = (await req.json()) as {
    name?: string;
    objektId?: string;
    einheitId?: string;
    wohnung?: string;
    etage?: string;
    email?: string;
    telefon?: string;
  };
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name erforderlich." }, { status: 400 });
  }

  const objektId = String(body.objektId ?? "").trim();
  const einheitId = String(body.einheitId ?? "").trim();

  if (objektId && !einheitId) {
    const created = await createBewohnerWithWohnung({
      kundeId: session.kunde.id,
      objektId,
      name,
      wohnung: body.wohnung,
      etage: body.etage,
      email: body.email,
      telefon: body.telefon,
    });
    if (!created.ok) {
      return NextResponse.json({ error: created.error }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      id: created.bewohnerId,
      einheitId: created.einheitId,
    });
  }

  const einheit = await resolveOrCreateEinheit({
    kundeId: session.kunde.id,
    einheitId: einheitId || undefined,
    objektId: objektId || undefined,
    wohnung: String(body.wohnung ?? "").trim() || undefined,
    etage: body.etage?.trim() || undefined,
  });
  if ("error" in einheit) {
    return NextResponse.json({ error: einheit.error }, { status: einheit.status });
  }

  const { data, error } = await supabaseAdmin
    .from("einheit_bewohner")
    .insert({
      kunde_id: session.kunde.id,
      objekt_einheit_id: einheit.id,
      name,
      telefon: body.telefon?.trim() || null,
      email: body.email?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }
  const write = requireOrgWrite(session);
  if (!write.ok) {
    return NextResponse.json({ error: write.error }, { status: write.status });
  }

  const body = (await req.json()) as {
    id?: string;
    name?: string;
    telefon?: string;
    email?: string;
  };
  const id = String(body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "id fehlt." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (body.name != null) patch.name = String(body.name).trim();
  if (body.telefon != null) patch.telefon = body.telefon.trim() || null;
  if (body.email != null) patch.email = body.email.trim() || null;

  const { error } = await supabaseAdmin
    .from("einheit_bewohner")
    .update(patch)
    .eq("id", id)
    .eq("kunde_id", session.kunde.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }
  const write = requireOrgWrite(session);
  if (!write.ok) {
    return NextResponse.json({ error: write.error }, { status: write.status });
  }

  const id = new URL(req.url).searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "id fehlt." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("einheit_bewohner")
    .update({ aktiv: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("kunde_id", session.kunde.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
