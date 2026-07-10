import { NextResponse } from "next/server";

import { persistLead } from "@/lib/lead/persist-lead";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type OrgAnfrageBody = {
  anlass: "projekt" | "servicepaket" | "meldung";
  objektId: string;
  situation?: string | null;
  bereiche?: string[];
  preis_min?: number;
  preis_max?: number;
  zeitraum?: string | null;
  funnel_daten?: unknown;
  service_modus?: "paket" | "einzeln";
  beschreibung?: string;
  name?: string;
  email?: string;
  telefon?: string;
};

export async function POST(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = (await req.json()) as OrgAnfrageBody;
  const anlass = body.anlass;
  const objektId = String(body.objektId ?? "").trim();

  if (!objektId || !anlass) {
    return NextResponse.json({ error: "Pflichtfelder fehlen." }, { status: 400 });
  }

  const { data: objekt } = await supabaseAdmin
    .from("kunden_objekte")
    .select("id, plz, strasse, hausnummer, titel")
    .eq("id", objektId)
    .eq("kunde_id", session.kunde.id)
    .maybeSingle();

  if (!objekt) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  const org = session.kunde;
  const kanal =
    anlass === "servicepaket"
      ? "org_service"
      : anlass === "projekt"
        ? "org_funnel"
        : "org_portal";

  const result = await persistLead({
    kunde_id: org.id,
    name: body.name?.trim() || org.name?.trim() || "Auftraggeber",
    email: body.email?.trim() || org.email?.trim() || undefined,
    telefon: body.telefon?.trim() || undefined,
    plz: String(objekt.plz ?? ""),
    strasse: String(objekt.strasse ?? ""),
    hausnummer: String(objekt.hausnummer ?? ""),
    situation: body.situation ?? (anlass === "servicepaket" ? "betreuung" : "erneuern"),
    bereiche: body.bereiche ?? [],
    preis_min: body.preis_min ?? 0,
    preis_max: body.preis_max ?? 0,
    zeitraum: body.zeitraum ?? null,
    kanal,
    anlass,
    erfassung_von: "organisation",
    kunde_objekt_id: objektId,
    service_modus: body.service_modus ?? null,
    kundentyp: "hausverwaltung",
    skipKundeMail: false,
    notizen: body.beschreibung?.trim(),
    funnel_daten: body.funnel_daten,
    funnel_quelle: anlass === "servicepaket" ? "org_service" : "org_funnel",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, id: result.id });
}
