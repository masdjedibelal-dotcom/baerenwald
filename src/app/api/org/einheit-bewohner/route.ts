import { NextResponse } from "next/server";

import {
  assertOrgEinheit,
  requireOrgWrite,
} from "@/lib/org/assert-org-objekt";
import {
  assignExistingEigentuemerToEinheit,
  listOrgEigentuemer,
  syncEigentuemerObjekteForPortalKunde,
} from "@/lib/org/org-eigentuemer";
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
  rolle?: "mieter" | "eigentuemer";
  sondereigentum_verwaltung?: boolean;
  selbstbewohnt?: boolean;
  miete_hinweis?: string | null;
  notiz?: string | null;
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
  const rolle = input.rolle === "eigentuemer" ? "eigentuemer" : "mieter";

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

  const insertRow: Record<string, unknown> = {
    kunde_id: input.kundeId,
    objekt_einheit_id: einheitId,
    name,
    telefon: input.telefon?.trim() || null,
    email: input.email?.trim() || null,
    rolle,
    sondereigentum_verwaltung:
      rolle === "eigentuemer"
        ? Boolean(input.sondereigentum_verwaltung)
        : false,
    selbstbewohnt:
      rolle === "eigentuemer" ? Boolean(input.selbstbewohnt) : false,
    miete_hinweis:
      rolle === "mieter" ? input.miete_hinweis?.trim() || null : null,
    notiz: input.notiz?.trim() || null,
  };

  let { data: bewohner, error: bewErr } = await supabaseAdmin
    .from("einheit_bewohner")
    .insert(insertRow)
    .select("id")
    .single();

  if (
    bewErr &&
    /rolle|sondereigentum|miete_hinweis|notiz|selbstbewohnt/i.test(bewErr.message)
  ) {
    const legacy = await supabaseAdmin
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
    bewohner = legacy.data;
    bewErr = legacy.error;
  }

  if (bewErr || !bewohner?.id) {
    return {
      ok: false,
      error: bewErr?.message ?? "Person konnte nicht angelegt werden.",
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
  const scope = url.searchParams.get("scope")?.trim();
  const rolleFilter = url.searchParams.get("rolle")?.trim();

  if (scope === "org" && rolleFilter === "eigentuemer") {
    const eigentuemer = await listOrgEigentuemer(session.kunde.id);
    return NextResponse.json({ eigentuemer });
  }

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
    rolle?: "mieter" | "eigentuemer";
    sondereigentum_verwaltung?: boolean;
    selbstbewohnt?: boolean;
    miete_hinweis?: string;
    notiz?: string;
    /** Bestehenden Eigentümer an diese Einheit hängen. */
    existingBewohnerId?: string;
  };

  const existingBewohnerId = String(body.existingBewohnerId ?? "").trim();
  if (existingBewohnerId) {
    const einheitId = String(body.einheitId ?? "").trim();
    if (!einheitId) {
      return NextResponse.json(
        { error: "einheitId erforderlich." },
        { status: 400 }
      );
    }
    if (!(await assertOrgEinheit(session.kunde.id, einheitId))) {
      return NextResponse.json(
        { error: "Einheit nicht gefunden." },
        { status: 404 }
      );
    }
    const assigned = await assignExistingEigentuemerToEinheit({
      orgKundeId: session.kunde.id,
      einheitId,
      sourceBewohnerId: existingBewohnerId,
      sondereigentumVerwaltung: body.sondereigentum_verwaltung,
      selbstbewohnt: body.selbstbewohnt,
    });
    if (!assigned.ok) {
      return NextResponse.json({ error: assigned.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, id: assigned.bewohnerId });
  }

  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name erforderlich." }, { status: 400 });
  }

  const rolle = body.rolle === "eigentuemer" ? "eigentuemer" : "mieter";
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
      rolle,
      sondereigentum_verwaltung: body.sondereigentum_verwaltung,
      selbstbewohnt: body.selbstbewohnt,
      miete_hinweis: body.miete_hinweis,
      notiz: body.notiz,
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

  const insertRow: Record<string, unknown> = {
    kunde_id: session.kunde.id,
    objekt_einheit_id: einheit.id,
    name,
    telefon: body.telefon?.trim() || null,
    email: body.email?.trim() || null,
    rolle,
    sondereigentum_verwaltung:
      rolle === "eigentuemer" ? Boolean(body.sondereigentum_verwaltung) : false,
    selbstbewohnt:
      rolle === "eigentuemer" ? Boolean(body.selbstbewohnt) : false,
    miete_hinweis: rolle === "mieter" ? body.miete_hinweis?.trim() || null : null,
    notiz: body.notiz?.trim() || null,
  };

  let { data, error } = await supabaseAdmin
    .from("einheit_bewohner")
    .insert(insertRow)
    .select("id")
    .single();

  if (error && /rolle|sondereigentum|miete_hinweis|notiz|selbstbewohnt/i.test(error.message)) {
    ({ data, error } = await supabaseAdmin
      .from("einheit_bewohner")
      .insert({
        kunde_id: session.kunde.id,
        objekt_einheit_id: einheit.id,
        name,
        telefon: body.telefon?.trim() || null,
        email: body.email?.trim() || null,
      })
      .select("id")
      .single());
  }

  if (error || !data?.id) {
    return NextResponse.json(
      { error: error?.message ?? "Anlegen fehlgeschlagen." },
      { status: 500 }
    );
  }

  // Gleiche E-Mail wie bestehender Portal-Eigentümer → Portal-Link + Objekt-Sync
  if (rolle === "eigentuemer" && body.email?.trim()) {
    const emailNorm = body.email.trim().toLowerCase();
    const { data: sibling } = await supabaseAdmin
      .from("einheit_bewohner")
      .select("portal_kunde_id")
      .eq("kunde_id", session.kunde.id)
      .eq("rolle", "eigentuemer")
      .eq("aktiv", true)
      .not("portal_kunde_id", "is", null)
      .ilike("email", emailNorm)
      .neq("id", data.id)
      .limit(1)
      .maybeSingle();
    const portalId = sibling?.portal_kunde_id
      ? String(sibling.portal_kunde_id)
      : "";
    if (portalId) {
      await supabaseAdmin
        .from("einheit_bewohner")
        .update({ portal_kunde_id: portalId })
        .eq("id", data.id);
      await syncEigentuemerObjekteForPortalKunde(portalId);
    }
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
    rolle?: "mieter" | "eigentuemer";
    sondereigentum_verwaltung?: boolean;
    selbstbewohnt?: boolean;
    miete_hinweis?: string | null;
    notiz?: string | null;
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
  if (body.rolle === "mieter" || body.rolle === "eigentuemer") {
    patch.rolle = body.rolle;
  }
  if (body.sondereigentum_verwaltung !== undefined) {
    patch.sondereigentum_verwaltung = Boolean(body.sondereigentum_verwaltung);
  }
  if (body.selbstbewohnt !== undefined) {
    const rolleNext =
      body.rolle === "mieter" || body.rolle === "eigentuemer"
        ? body.rolle
        : undefined;
    patch.selbstbewohnt =
      (rolleNext ?? "eigentuemer") === "eigentuemer"
        ? Boolean(body.selbstbewohnt)
        : false;
  }
  if (body.miete_hinweis !== undefined) {
    patch.miete_hinweis = body.miete_hinweis?.trim() || null;
  }
  if (body.notiz !== undefined) {
    patch.notiz = body.notiz?.trim() || null;
  }

  // Rolle mieter → selbstbewohnt immer aus
  if (body.rolle === "mieter") {
    patch.selbstbewohnt = false;
  }

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
