import { NextResponse } from "next/server";

import { requireAccountSession } from "@/lib/account/require-account-session";
import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

/** B4 — Self-Service Datenexport (JSON). */
export async function GET(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Nicht konfiguriert." }, { status: 503 });
  }

  const ip = getClientIp(req);
  const rlIp = checkRateLimit(ip, 30, 60 * 60 * 1000, "account-export-ip");
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
    10,
    60 * 60 * 1000,
    "account-export-user"
  );
  if (!rlUser.allowed) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte später erneut." },
      { status: 429 }
    );
  }

  const exportedAt = new Date().toISOString();

  if (session.kind === "kunde") {
    const { data: profil } = await supabaseAdmin
      .from("kunden")
      .select(
        "id, name, email, telefon, plz, ort, adresse, typ, portal_modus, created_at"
      )
      .eq("id", session.entityId)
      .maybeSingle();

    const { data: leads } = await supabaseAdmin
      .from("leads")
      .select(
        "id, status, vorgang_phase, created_at, situation, plz, ort, strasse, kanal, hv_meldung_status"
      )
      .eq("kunde_id", session.entityId)
      .order("created_at", { ascending: false })
      .limit(500);

    const payload = {
      exportVersion: 1,
      exportedAt,
      role: "kunde" as const,
      profil: profil ?? null,
      vorgaenge: leads ?? [],
      hinweis:
        "Auskunft nach Art. 15 DSGVO. Offene Vorgänge können bei Ihrer Verwaltung weitergeführt werden.",
    };

    await writeAuditEvent({
      entityType: "kunde",
      entityId: session.entityId,
      aktion: "daten_exportiert",
      actorId: session.userId,
      actorRolle: "portal",
      kundeId: session.entityId,
      payload: { vorgaenge: (leads ?? []).length },
    });

    return NextResponse.json(payload);
  }

  const { data: profil } = await supabaseAdmin
    .from("handwerker")
    .select(
      "id, name, email, telefon, firma, strasse, ort, ustid, created_at"
    )
    .eq("id", session.entityId)
    .maybeSingle();

  const { data: positionen } = await supabaseAdmin
    .from("auftrag_positionen")
    .select("id, auftrag_id, leistung_name, leistung_status, handwerker_status")
    .eq("handwerker_id", session.entityId)
    .limit(500);

  const payload = {
    exportVersion: 1,
    exportedAt,
    role: "handwerker" as const,
    profil: profil ?? null,
    leistungen: positionen ?? [],
    hinweis:
      "Auskunft nach Art. 15 DSGVO. Auftragsdaten können beim Auftraggeber weiter vorliegen.",
  };

  await writeAuditEvent({
    entityType: "handwerker",
    entityId: session.entityId,
    aktion: "daten_exportiert",
    actorId: session.userId,
    actorRolle: "partner",
    payload: { leistungen: (positionen ?? []).length },
  });

  return NextResponse.json(payload);
}
