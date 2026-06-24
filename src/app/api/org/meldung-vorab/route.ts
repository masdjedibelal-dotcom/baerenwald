import { NextResponse } from "next/server";

import { buildMelderEinladungHtml } from "@/lib/email/meldung-mail-templates";
import { persistLead } from "@/lib/lead/persist-lead";
import { buildEinladungUrl } from "@/lib/org/melde-url";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { isValidEmail } from "@/lib/validation";
import { supabaseAdmin } from "@/lib/supabase";
import { Resend } from "resend";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

type Body = {
  objektId: string;
  melderName: string;
  melderEmail?: string;
  melderTelefon?: string;
  melderEinheit?: string;
  kategorie?: string;
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
  const kategorie = String(body.kategorie ?? "reparatur").trim();

  if (!objektId || !melderName) {
    return NextResponse.json({ error: "Pflichtfelder fehlen." }, { status: 400 });
  }

  const { data: objekt } = await supabaseAdmin
    .from("kunden_objekte")
    .select("id, titel, plz, strasse, hausnummer, ort")
    .eq("id", objektId)
    .eq("kunde_id", session.kunde.id)
    .maybeSingle();

  if (!objekt) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  const token = randomUUID();
  const org = session.kunde;

  const result = await persistLead({
    name: melderName,
    email: isValidEmail(melderEmail) ? melderEmail : undefined,
    telefon: melderTelefon || undefined,
    plz: String(objekt.plz ?? ""),
    strasse: String(objekt.strasse ?? ""),
    hausnummer: String(objekt.hausnummer ?? ""),
    situation: kategorie === "notfall" ? "kaputt" : "kaputt",
    bereiche: ["sanitaer"],
    zeitraum: kategorie === "notfall" ? "sofort" : "flexibel",
    kanal: "hv_einladung",
    auftraggeber_kunde_id: org.id,
    kunde_objekt_id: objektId,
    anlass: "meldung",
    erfassung_von: "organisation",
    melder_name: melderName,
    melder_einheit: melderEinheit || null,
    melder_telefon: melderTelefon || null,
    melder_email: isValidEmail(melderEmail) ? melderEmail : null,
    einladung_token: token,
    einladung_status: "offen",
    skipKundeMail: true,
    skipInternMail: false,
    notizen: beschreibung || "Meldung vorerfasst — wartet auf Ergänzung durch Melder.",
    funnel_daten: { melde_kategorie: kategorie, quelle: "org_vorab" },
    funnel_quelle: "meldung",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const link = buildEinladungUrl(token);
  const orgName =
    org.org_anzeigename?.trim() || org.name?.trim() || "Auftraggeber";

  if (isValidEmail(melderEmail) && process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    try {
      await resend.emails.send({
        from:
          process.env.RESEND_FROM_CUSTOMER ??
          "Bärenwald München <anfragen@baerenwaldmuenchen.de>",
        to: melderEmail.toLowerCase(),
        subject: `Meldung ergänzen — ${objekt.titel}`,
        html: buildMelderEinladungHtml({
          melderName,
          orgName,
          objektTitel: String(objekt.titel),
          link,
        }),
      });
    } catch (e) {
      console.error("[meldung-vorab] mail:", e);
    }
  }

  return NextResponse.json({ ok: true, id: result.id, link, token });
}
