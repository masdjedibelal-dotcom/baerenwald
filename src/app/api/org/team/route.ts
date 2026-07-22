import { NextResponse } from "next/server";

import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import { requireOrgAdminSession, requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";
import { isValidEmail } from "@/lib/validation";

export const runtime = "nodejs";

const ROLLEN = new Set(["admin", "sachbearbeiter", "lesen"]);

export async function GET() {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const { data, error } = await supabaseAdmin
    .from("kunden_mitglieder")
    .select("id, auth_user_id, rolle, aktiv, eingeladen_am")
    .eq("kunde_id", session.kunde.id)
    .order("eingeladen_am", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = (data ?? []).map((m) => m.auth_user_id).filter(Boolean);
  const emailByUser = new Map<string, string>();
  const nameByUser = new Map<string, string>();
  if (userIds.length) {
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    for (const u of users?.users ?? []) {
      if (!u.id) continue;
      if (u.email) emailByUser.set(u.id, u.email);
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      const display =
        (typeof meta.name === "string" && meta.name.trim()) ||
        (typeof meta.full_name === "string" && meta.full_name.trim()) ||
        (typeof meta.display_name === "string" && meta.display_name.trim()) ||
        "";
      if (display) nameByUser.set(u.id, display);
    }
  }

  return NextResponse.json({
    mitglieder: (data ?? []).map((m) => ({
      id: m.id,
      email: emailByUser.get(String(m.auth_user_id)) ?? null,
      name: nameByUser.get(String(m.auth_user_id)) ?? null,
      rolle: m.rolle,
      aktiv: m.aktiv,
      eingeladen_am: m.eingeladen_am,
    })),
    isOwner: session.rolle === "admin",
    rolle: session.rolle,
  });
}

type PostBody = { email?: string; name?: string; rolle?: string };

export async function POST(req: Request) {
  const session = await requireOrgAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim();
  const rolle = String(body.rolle ?? "sachbearbeiter").trim();
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Gültige E-Mail erforderlich." }, { status: 400 });
  }
  if (!ROLLEN.has(rolle)) {
    return NextResponse.json({ error: "Ungültige Rolle." }, { status: 400 });
  }

  const { data: listed } = await supabaseAdmin.auth.admin.listUsers();
  let authUserId = listed?.users?.find((u) => u.email?.toLowerCase() === email)?.id;

  if (!authUserId) {
    const { data: invited, error: invErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/portal`,
        data: name
          ? { name, full_name: name, display_name: name }
          : undefined,
      }
    );
    if (invErr || !invited.user?.id) {
      return NextResponse.json(
        { error: invErr?.message ?? "Einladung fehlgeschlagen." },
        { status: 500 }
      );
    }
    authUserId = invited.user.id;
  } else if (name) {
    await supabaseAdmin.auth.admin.updateUserById(authUserId, {
      user_metadata: { name, full_name: name, display_name: name },
    });
  }

  const { error } = await supabaseAdmin.from("kunden_mitglieder").upsert(
    {
      kunde_id: session.kunde.id,
      auth_user_id: authUserId,
      rolle,
      aktiv: true,
    },
    { onConflict: "kunde_id,auth_user_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditEvent({
    entityType: "kunden_mitglieder",
    entityId: authUserId,
    aktion: "team_eingeladen",
    actorId: session.userId,
    actorRolle: session.rolle,
    kundeId: session.kunde.id,
    payload: { email, name: name || null, rolle },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await requireOrgAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "Mitglied-ID fehlt." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("kunden_mitglieder")
    .update({ aktiv: false })
    .eq("id", id)
    .eq("kunde_id", session.kunde.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditEvent({
    entityType: "kunden_mitglieder",
    entityId: id,
    aktion: "team_entfernt",
    actorId: session.userId,
    actorRolle: session.rolle,
    kundeId: session.kunde.id,
    payload: { mitglied_id: id },
  });

  return NextResponse.json({ ok: true });
}
