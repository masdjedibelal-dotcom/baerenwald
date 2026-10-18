import { logDbError } from '@/lib/errors/log-db-error'
import { NextResponse } from "next/server";

import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import { ensureOrgKennung } from "@/lib/org/ensure-org-kennung";
import { normalizeOrgHttpUrl, orgMeldeLegalUrlsReady } from "@/lib/org/melde-legal-urls";
import { requireOrgAdminSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type Body = {
  /** Impressum/Datenschutz der Verwaltung — Pflicht für das Mieter-Meldeformular */
  impressum_url?: string | null;
  datenschutz_url?: string | null;
};

function normalizeHttpUrlOrNull(v: unknown): string | null | "invalid" {
  const s = String(v ?? "").trim();
  if (!s) return null;
  return normalizeOrgHttpUrl(s) ?? "invalid";
}

/** Rechtliche Links der Verwaltung für die Mieter-Schadenmeldung speichern. */
export async function PATCH(req: Request) {
  const session = await requireOrgAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.impressum_url !== undefined) {
    const u = normalizeHttpUrlOrNull(body.impressum_url);
    if (u === "invalid") {
      return NextResponse.json({ error: "Impressum-URL ungültig (z. B. www.firma.de/impressum)." }, { status: 400 });
    }
    patch.impressum_url = u;
  }
  if (body.datenschutz_url !== undefined) {
    const u = normalizeHttpUrlOrNull(body.datenschutz_url);
    if (u === "invalid") {
      return NextResponse.json({ error: "Datenschutz-URL ungültig (z. B. www.firma.de/datenschutz)." }, { status: 400 });
    }
    patch.datenschutz_url = u;
  }
  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Keine Änderungen." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("kunden")
    .update(patch)
    .eq("id", session.kunde.id)
    .select("org_anzeigename, impressum_url, datenschutz_url, org_kennung")
    .single();
  if (error) {
    logDbError("app/api/org/melde-links/route:kunden", error);
    return NextResponse.json({ error: error.message || "Speichern fehlgeschlagen." }, { status: 500 });
  }

  await writeAuditEvent({
    entityType: "kunde",
    entityId: session.kunde.id,
    aktion: "melde_links_geaendert",
    actorId: session.userId,
    actorRolle: session.rolle,
    kundeId: session.kunde.id,
    payload: patch,
  });

  // Erst mit beiden Links bekommt die Verwaltung ihre Melde-Kennung (Link/QR)
  let links = data;
  if (
    orgMeldeLegalUrlsReady({ impressum_url: data?.impressum_url, datenschutz_url: data?.datenschutz_url }) &&
    !String(data?.org_kennung ?? "").trim()
  ) {
    const kennung = await ensureOrgKennung({
      id: session.kunde.id,
      org_anzeigename: data?.org_anzeigename ?? session.kunde.org_anzeigename,
      name: session.kunde.name,
    });
    if (kennung) links = { ...data, org_kennung: kennung };
  }

  return NextResponse.json({ ok: true, branding: links });
}
