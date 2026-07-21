import { NextResponse } from "next/server";

import {
  buildOrgNeueMeldungHtml,
  buildOrgNeueMeldungSubject,
} from "@/lib/email/meldung-mail-templates";
import {
  parseMeldeBereichId,
  persistMeldungLead,
} from "@/lib/org/persist-meldung-lead";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import type { MeldeKategorie } from "@/lib/org/types";
import { isValidEmail, isValidName } from "@/lib/validation";
import { supabaseAdmin } from "@/lib/supabase";
import { Resend } from "resend";

type Body = {
  objektId: string;
  melderName: string;
  melderEmail?: string;
  melderTelefon?: string;
  melderEinheit?: string;
  kategorie?: MeldeKategorie;
  bereichId?: string;
  fachdetailAnswers?: Record<string, string | string[]>;
  beschreibung?: string;
};

const KATEGORIEN = new Set<MeldeKategorie>([
  "notfall",
  "schaden",
  "reparatur",
  "sonstiges",
]);

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

  if (!objektId || !isValidName(melderName)) {
    return NextResponse.json({ error: "Pflichtfelder fehlen." }, { status: 400 });
  }
  if (!KATEGORIEN.has(kategorie)) {
    return NextResponse.json({ error: "Kategorie ungültig." }, { status: 400 });
  }
  if (beschreibung.length < 8) {
    return NextResponse.json(
      { error: "Bitte kurz beschreiben (mind. 8 Zeichen)." },
      { status: 400 }
    );
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

  const result = await persistMeldungLead({
    name: melderName,
    email: isValidEmail(melderEmail) ? melderEmail : undefined,
    telefon: melderTelefon || undefined,
    einheit: melderEinheit,
    beschreibung,
    kategorie,
    bereichId,
    fachdetailAnswers: body.fachdetailAnswers,
    plz: String(objekt.plz ?? ""),
    strasse: objekt.strasse,
    hausnummer: objekt.hausnummer,
    auftraggeber_kunde_id: session.kunde.id,
    kunde_objekt_id: objektId,
    kanal: "hv_direkt",
    erfassung_von: "organisation",
    skipInternMail: true,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const orgEmail = session.kunde.email?.trim() ?? "";
  const portalPath = `/portal?section=freigabe&id=${result.id}`;

  if (process.env.RESEND_API_KEY && isValidEmail(orgEmail)) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    try {
      await resend.emails.send({
        from:
          process.env.RESEND_FROM_SYSTEM ??
          "System <system@baerenwaldmuenchen.de>",
        to: orgEmail,
        subject: buildOrgNeueMeldungSubject(String(objekt.titel)),
        html: buildOrgNeueMeldungHtml({
          objektTitel: String(objekt.titel),
          melderName,
          melderEinheit: melderEinheit || undefined,
          melderTelefon: melderTelefon || undefined,
          melderEmail: isValidEmail(melderEmail) ? melderEmail : undefined,
          kategorie,
          bereichId,
          beschreibung,
          quelle: "hausverwaltung",
          portalPath,
        }),
      });
    } catch (e) {
      console.error("[meldung-direkt] mail:", e);
    }
  }

  return NextResponse.json({ ok: true, id: result.id });
}
