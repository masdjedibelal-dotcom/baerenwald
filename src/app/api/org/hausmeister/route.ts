import { NextResponse } from "next/server";

import {
  assignHausmeisterToObjekt,
  createHausmeisterEinladung,
  listOrgHausmeister,
  loadHausmeisterForObjekt,
  unassignHausmeisterFromObjekt,
  upsertOrgHausmeister,
  buildHausmeisterEinladungMailto,
} from "@/lib/org/org-hausmeister";
import {
  ensureHausmeisterPortalActivation,
  isBaerenwaldPrimaryStaffEmail,
} from "@/lib/org/ensure-hausmeister-portal";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { requireOrgWrite } from "@/lib/org/assert-org-objekt";
import { orgDisplayName } from "@/lib/org/org-mieter-kontakt";
import { supabaseAdmin } from "@/lib/supabase";

/** Liste aller HM der Org (+ optional HM eines Objekts). */
export async function GET(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }
  const url = new URL(req.url);
  const objektId = url.searchParams.get("objektId")?.trim() || "";

  const list = await listOrgHausmeister(session.kunde.id);
  const amObjekt = objektId
    ? await loadHausmeisterForObjekt(objektId)
    : null;

  return NextResponse.json({
    hausmeister: list,
    amObjekt,
  });
}

/**
 * Anlegen/Updaten HM und/oder Objekt zuweisen.
 * Body: { name?, email?, portalZugang?, hausmeisterId?, objektId?, invite?: boolean }
 */
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
    hausmeisterId?: string | null;
    name?: string;
    email?: string | null;
    portalZugang?: boolean;
    objektId?: string | null;
    invite?: boolean;
  };

  const objektId = body.objektId?.trim() || "";
  let hmId = body.hausmeisterId?.trim() || "";

  if (body.name?.trim() || !hmId) {
    if (!body.name?.trim() && !hmId) {
      return NextResponse.json(
        { error: "Hausmeister Name oder ID erforderlich." },
        { status: 400 }
      );
    }
    if (body.name?.trim() || body.email !== undefined || body.portalZugang !== undefined) {
      const existing = hmId
        ? (
            await listOrgHausmeister(session.kunde.id)
          ).find((h) => h.id === hmId)
        : null;
      const up = await upsertOrgHausmeister({
        orgKundeId: session.kunde.id,
        id: hmId || null,
        name: body.name?.trim() || existing?.name || "",
        email:
          body.email !== undefined
            ? body.email
            : existing?.email ?? null,
        portalZugang:
          body.portalZugang !== undefined
            ? Boolean(body.portalZugang)
            : existing?.portal_zugang ?? false,
      });
      if (!up.ok) {
        return NextResponse.json({ error: up.error }, { status: 400 });
      }
      hmId = up.hm.id;
    }
  }

  if (!hmId) {
    return NextResponse.json({ error: "Hausmeister fehlt." }, { status: 400 });
  }

  if (objektId) {
    const { data: obj } = await supabaseAdmin
      .from("kunden_objekte")
      .select("id, titel")
      .eq("id", objektId)
      .eq("kunde_id", session.kunde.id)
      .maybeSingle();
    if (!obj?.id) {
      return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
    }
    const asg = await assignHausmeisterToObjekt({
      orgKundeId: session.kunde.id,
      objektId,
      orgHausmeisterId: hmId,
    });
    if (!asg.ok) {
      return NextResponse.json({ error: asg.error }, { status: 400 });
    }

    let inviteMailto: string | null = null;
    let inviteUrl: string | null = null;
    const hmRow = (await listOrgHausmeister(session.kunde.id)).find(
      (h) => h.id === hmId
    );
    const sharedLogin = isBaerenwaldPrimaryStaffEmail(hmRow?.email);

    if (hmRow?.portal_zugang && (sharedLogin || body.invite)) {
      const act = await ensureHausmeisterPortalActivation({
        orgHausmeisterId: hmId,
        orgKundeId: session.kunde.id,
      });
      if (!act.ok) {
        console.warn("[api/org/hausmeister] ensure:", act.error);
      }
    }

    if (body.invite && !sharedLogin) {
      const inv = await createHausmeisterEinladung({
        orgKundeId: session.kunde.id,
        orgHausmeisterId: hmId,
        objektId,
        createdBy: session.userId,
      });
      if (inv.ok) {
        inviteUrl = inv.url;
        if (hmRow?.email) {
          inviteMailto = buildHausmeisterEinladungMailto({
            toEmail: hmRow.email,
            link: inv.url,
            hvName: orgDisplayName(session.kunde),
            objektLabel: String(obj.titel ?? "Objekt"),
            hmName: hmRow.name,
          });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      hausmeisterId: hmId,
      inviteUrl,
      inviteMailto,
    });
  }

  return NextResponse.json({ ok: true, hausmeisterId: hmId });
}

/** Zuordnung vom Objekt entfernen: DELETE ?objektId= */
export async function DELETE(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }
  const write = requireOrgWrite(session);
  if (!write.ok) {
    return NextResponse.json({ error: write.error }, { status: write.status });
  }

  const objektId = new URL(req.url).searchParams.get("objektId")?.trim() || "";
  if (!objektId) {
    return NextResponse.json({ error: "objektId fehlt." }, { status: 400 });
  }

  const res = await unassignHausmeisterFromObjekt({
    orgKundeId: session.kunde.id,
    objektId,
  });
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
