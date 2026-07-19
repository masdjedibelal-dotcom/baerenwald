import { NextResponse } from "next/server";

import { buildEinladungUrl } from "@/lib/org/melde-url";
import { parseMeldeBereichId, persistMeldungLead } from "@/lib/org/persist-meldung-lead";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import type { MeldeKategorie } from "@/lib/org/types";
import { supabaseAdmin } from "@/lib/supabase";
import { isValidEmail } from "@/lib/validation";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

type Body = {
  objektId: string;
  melderName: string;
  melderEmail?: string;
  melderTelefon?: string;
  melderEinheit?: string;
  kategorie?: string;
  bereichId?: string;
  beschreibung?: string;
};

export async function POST(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = (await req.json()) as Body;
  const objektId = String(body.objektId ?? "").trim();
  const melderName = String(body.melderName ?? "").trim();
  const melderEmail = String(body.melderEmail ?? "").trim();
  const melderTelefon = String(body.melderTelefon ?? "").trim();
  const melderEinheit = String(body.melderEinheit ?? "").trim();
  const beschreibung = String(body.beschreibung ?? "").trim();
  const kategorie = (body.kategorie ?? "reparatur") as MeldeKategorie;
  const bereichId = parseMeldeBereichId(body.bereichId);

  if (!objektId || !melderName) {
    return NextResponse.json({ error: "Pflichtfelder fehlen." }, { status: 400 });
  }

  const { data: objekt } = await supabaseAdmin
    .from("kunden_objekte")
    .select("id, titel, plz, strasse, hausnummer")
    .eq("id", objektId)
    .eq("kunde_id", session.kunde.id)
    .maybeSingle();

  if (!objekt) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  const token = randomUUID();
  const org = session.kunde;

  const result = await persistMeldungLead({
    name: melderName,
    email: isValidEmail(melderEmail) ? melderEmail : undefined,
    telefon: melderTelefon || undefined,
    einheit: melderEinheit,
    beschreibung:
      beschreibung || "Meldung vorerfasst — wartet auf Ergänzung durch Melder.",
    kategorie,
    bereichId,
    plz: String(objekt.plz ?? ""),
    strasse: objekt.strasse,
    hausnummer: objekt.hausnummer,
    auftraggeber_kunde_id: org.id,
    kunde_objekt_id: objektId,
    kanal: "hv_einladung",
    erfassung_von: "organisation",
    einladung_token: token,
    einladung_status: "offen",
    skipInternMail: true,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const link = buildEinladungUrl(token);

  return NextResponse.json({ ok: true, id: result.id, link, token });
}
