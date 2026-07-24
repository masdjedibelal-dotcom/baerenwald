import { NextResponse } from "next/server";

import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import { getOrgAvTextForVersion } from "@/lib/org/org-av-text";
import { ORG_AV_VERSION_CURRENT, orgHasMieterKontakt } from "@/lib/org/org-mieter-kontakt";
import { requireOrgAdminSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

type Body = {
  av_akzeptiert?: boolean;
  mieter_kontakt_telefon?: string | null;
  mieter_kontakt_email?: string | null;
  mieter_kontakt_hinweis?: string | null;
};

export async function PATCH(req: Request) {
  const session = await requireOrgAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = (await req.json()) as Body;
  const patch: Record<string, unknown> = {};

  if (body.mieter_kontakt_telefon !== undefined) {
    patch.mieter_kontakt_telefon = String(body.mieter_kontakt_telefon ?? "").trim() || null;
  }
  if (body.mieter_kontakt_email !== undefined) {
    patch.mieter_kontakt_email = String(body.mieter_kontakt_email ?? "").trim() || null;
  }
  if (body.mieter_kontakt_hinweis !== undefined) {
    patch.mieter_kontakt_hinweis = String(body.mieter_kontakt_hinweis ?? "").trim() || null;
  }
  if (body.av_akzeptiert === true) {
    const version = ORG_AV_VERSION_CURRENT;
    patch.av_akzeptiert_am = new Date().toISOString();
    patch.av_version = version;
    patch.av_akzeptiert_von = session.userId;
    patch.av_text_snapshot = getOrgAvTextForVersion(version);
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Keine Änderungen." }, { status: 400 });
  }

  const merged = {
    ...session.kunde,
    ...patch,
  };
  if (
    (patch.mieter_kontakt_telefon !== undefined ||
      patch.mieter_kontakt_email !== undefined) &&
    !orgHasMieterKontakt(merged)
  ) {
    return NextResponse.json(
      { error: "Bitte Telefon oder E-Mail für Mieter-Rückfragen angeben." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("kunden")
    .update(patch)
    .eq("id", session.kunde.id)
    .select(
      "mieter_kontakt_telefon, mieter_kontakt_email, mieter_kontakt_hinweis, av_akzeptiert_am, av_version, av_akzeptiert_von, av_text_snapshot"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeAuditEvent({
    entityType: "kunde",
    entityId: session.kunde.id,
    aktion: "whitelabel_setup",
    actorId: session.userId,
    actorRolle: session.rolle,
    kundeId: session.kunde.id,
    payload: patch,
  });

  return NextResponse.json({ ok: true, settings: data });
}
