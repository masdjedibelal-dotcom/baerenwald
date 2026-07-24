import { NextResponse } from "next/server";

import {
  countOpenKundeVorgaenge,
  requireAccountSession,
} from "@/lib/account/require-account-session";
import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

type Body = {
  confirm?: boolean;
  password?: string;
  forceOpenVorgaenge?: boolean;
};

/**
 * B1 — Konto löschen (Self-Service).
 * Privat/Gewerbe/Mieter: Stammdaten anonymisieren + Auth löschen.
 * Org-HV-Stamm: nicht per Self-Service (Support).
 * Handwerker: Stammdaten anonymisieren + Auth löschen.
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Nicht konfiguriert." }, { status: 503 });
  }

  const ip = getClientIp(req);
  const rlIp = checkRateLimit(ip, 10, 60 * 60 * 1000, "account-delete-ip");
  if (!rlIp.allowed) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte später erneut." },
      { status: 429 }
    );
  }

  const session = await requireAccountSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const rlUser = checkRateLimit(
    session.userId,
    5,
    60 * 60 * 1000,
    "account-delete-user"
  );
  if (!rlUser.allowed) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte später erneut." },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.confirm) {
    return NextResponse.json(
      { error: "Bitte Löschung bestätigen." },
      { status: 400 }
    );
  }

  const password = String(body.password ?? "").trim();
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Passwort zur Bestätigung erforderlich." },
      { status: 400 }
    );
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: session.email,
    password,
  });
  if (reauthError) {
    return NextResponse.json(
      { error: "Passwort falsch." },
      { status: 403 }
    );
  }

  if (session.kind === "kunde") {
    const { data: kunde } = await supabaseAdmin
      .from("kunden")
      .select("id, portal_modus, typ")
      .eq("id", session.entityId)
      .maybeSingle();

    const modus = String(kunde?.portal_modus ?? "").toLowerCase();
    if (modus === "organisation" || modus === "hv") {
      return NextResponse.json(
        {
          error:
            "Organisationskonten können nicht selbst gelöscht werden. Bitte Support kontaktieren.",
        },
        { status: 403 }
      );
    }

    const open = await countOpenKundeVorgaenge(session.entityId);
    if (open > 0 && !body.forceOpenVorgaenge) {
      return NextResponse.json(
        {
          error: "open_vorgaenge",
          openVorgaenge: open,
          message: `Es gibt noch ${open} offene Vorgänge. Löschung anonymisiert Ihr Konto; Vorgänge bleiben für die Verwaltung erhalten.`,
        },
        { status: 409 }
      );
    }

    const tombstone = `gelöscht-${session.entityId.slice(0, 8)}@deleted.local`;
    const { error: anonErr } = await supabaseAdmin
      .from("kunden")
      .update({
        name: "Gelöschtes Konto",
        email: tombstone,
        telefon: null,
        auth_user_id: null,
        adresse: null,
      })
      .eq("id", session.entityId);

    if (anonErr) {
      return NextResponse.json({ error: anonErr.message }, { status: 500 });
    }

    await writeAuditEvent({
      entityType: "kunde",
      entityId: session.entityId,
      aktion: "konto_geloescht",
      actorId: session.userId,
      actorRolle: "portal",
      kundeId: session.entityId,
      payload: { openVorgaenge: open },
    });
  } else {
    const tombstone = `gelöscht-${session.entityId.slice(0, 8)}@deleted.local`;
    const { error: anonErr } = await supabaseAdmin
      .from("handwerker")
      .update({
        name: "Gelöschtes Konto",
        email: tombstone,
        telefon: null,
        auth_user_id: null,
        ist_portal_gesperrt: true,
      })
      .eq("id", session.entityId);

    if (anonErr) {
      return NextResponse.json({ error: anonErr.message }, { status: 500 });
    }

    await writeAuditEvent({
      entityType: "handwerker",
      entityId: session.entityId,
      aktion: "konto_geloescht",
      actorId: session.userId,
      actorRolle: "partner",
      payload: {},
    });
  }

  const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(
    session.userId
  );
  if (delErr) {
    console.error("[account/delete] deleteUser", delErr.message);
    return NextResponse.json(
      { error: "Konto anonymisiert, Auth-Löschung fehlgeschlagen. Support kontaktieren." },
      { status: 500 }
    );
  }

  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
