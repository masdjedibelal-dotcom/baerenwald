import { NextResponse } from "next/server";

import {
  buildMelderBestaetigungHtml,
  buildMelderBestaetigungSubject,
  buildOrgNeueMeldungHtml,
  buildOrgNeueMeldungSubject,
} from "@/lib/email/meldung-mail-templates";
import { AUTOMATED_CUSTOMER_EMAIL_BCC } from "@/lib/email/resend-bcc";
import { parseMeldeBereichId, persistMeldungLead } from "@/lib/org/persist-meldung-lead";
import { resolveMeldeKontext } from "@/lib/org/resolve-melde-kontext";
import type { MeldeKategorie } from "@/lib/org/types";
import { getClientIp } from "@/lib/request-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidEmail, isValidName } from "@/lib/validation";
import { meldeStatusUrl } from "@/lib/melde/melde-tracking";
import { supabaseAdmin } from "@/lib/supabase";
import { Resend } from "resend";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

type MeldungBody = {
  org: string;
  objekt: string;
  name?: string;
  email?: string;
  telefon?: string;
  einheit?: string;
  kategorie?: MeldeKategorie;
  bereichId?: string;
  fachdetailAnswers?: Record<string, string | string[]>;
  dringlichkeit?: string | null;
  beschreibung?: string;
  fotos?: string[];
  website?: string;
};

const KATEGORIEN = new Set<MeldeKategorie>([
  "notfall",
  "schaden",
  "reparatur",
  "sonstiges",
]);

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, 8, 60 * 60 * 1000, "meldung");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte später erneut." },
      { status: 429 }
    );
  }

  let body: MeldungBody;
  try {
    body = (await req.json()) as MeldungBody;
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  if (body.website?.trim()) {
    return NextResponse.json({ ok: true, id: randomUUID() });
  }

  const org = String(body.org ?? "").trim();
  const objektSlug = String(body.objekt ?? "").trim();
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const telefon = String(body.telefon ?? "").trim();
  const einheit = String(body.einheit ?? "").trim();
  const beschreibung = String(body.beschreibung ?? "").trim();
  const kategorie = (body.kategorie ?? "reparatur") as MeldeKategorie;
  const bereichId = parseMeldeBereichId(body.bereichId);
  const fotos = Array.isArray(body.fotos)
    ? body.fotos.filter((u) => typeof u === "string" && /^https?:\/\//i.test(u))
    : [];

  if (!org || !objektSlug) {
    return NextResponse.json({ error: "Link ungültig." }, { status: 400 });
  }
  if (!isValidName(name)) {
    return NextResponse.json({ error: "Bitte Namen angeben." }, { status: 400 });
  }
  if (!isValidEmail(email) && telefon.length < 6) {
    return NextResponse.json(
      { error: "Bitte E-Mail oder Telefonnummer angeben." },
      { status: 400 }
    );
  }
  if (!KATEGORIEN.has(kategorie)) {
    return NextResponse.json({ error: "Kategorie ungültig." }, { status: 400 });
  }
  if (beschreibung.length < 8) {
    return NextResponse.json(
      { error: "Bitte kurz beschreiben, was passiert ist." },
      { status: 400 }
    );
  }

  const resolved = await resolveMeldeKontext(org, objektSlug);
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.message },
      { status: resolved.code === "not_found" ? 404 : 403 }
    );
  }

  const { org: orgRow, objekt } = resolved.kontext;
  if (!objekt) {
    return NextResponse.json({ error: "Objekt fehlt." }, { status: 400 });
  }

  const result = await persistMeldungLead({
    name,
    email: isValidEmail(email) ? email : undefined,
    telefon: telefon || undefined,
    einheit,
    beschreibung,
    kategorie,
    bereichId,
    fachdetailAnswers: body.fachdetailAnswers,
    dringlichkeit: body.dringlichkeit,
    fotos,
    plz: objekt.plz ?? "",
    strasse: objekt.strasse,
    hausnummer: objekt.hausnummer,
    auftraggeber_kunde_id: orgRow.id,
    kunde_objekt_id: objekt.id,
    kanal: "hv_melder_link",
    erfassung_von: "melder",
    skipInternMail: true,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const orgDisplay =
    orgRow.org_anzeigename?.trim() || orgRow.name?.trim() || "Hausverwaltung";

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && isValidEmail(email)) {
    const resend = new Resend(resendKey);
    try {
      await resend.emails.send({
        from:
          process.env.RESEND_FROM_CUSTOMER ??
          "Bärenwald München <anfragen@baerenwaldmuenchen.de>",
        to: email.toLowerCase(),
        bcc: AUTOMATED_CUSTOMER_EMAIL_BCC,
        subject: buildMelderBestaetigungSubject(kategorie),
        html: buildMelderBestaetigungHtml({
          melderName: name,
          orgName: orgDisplay,
          objektTitel: objekt.titel,
          kategorie,
          referenz: result.id.slice(0, 8).toUpperCase(),
          statusLink:
            "meldeTrackingToken" in result && result.meldeTrackingToken
              ? meldeStatusUrl(String(result.meldeTrackingToken))
              : undefined,
        }),
      });
    } catch (e) {
      console.error("[meldung] melder mail:", e);
    }
  }

  if (resendKey) {
    const { data: orgKunde } = await supabaseAdmin
      .from("kunden")
      .select("email")
      .eq("id", orgRow.id)
      .maybeSingle();
    const orgEmail = String(orgKunde?.email ?? "").trim();
    if (orgEmail && isValidEmail(orgEmail)) {
      const resend = new Resend(resendKey);
      try {
        await resend.emails.send({
          from:
            process.env.RESEND_FROM_SYSTEM ??
            "System <system@baerenwaldmuenchen.de>",
          to: orgEmail,
          subject: buildOrgNeueMeldungSubject(objekt.titel),
          html: buildOrgNeueMeldungHtml({
            objektTitel: objekt.titel,
            melderName: name,
            melderEinheit: einheit,
            melderTelefon: telefon || undefined,
            melderEmail: isValidEmail(email) ? email : undefined,
            kategorie,
            bereichId,
            beschreibung,
            fotoCount: fotos.length,
            dringlichkeit: body.dringlichkeit,
            quelle: "mieter",
            portalPath: `/portal?section=freigabe&id=${result.id}`,
            referenz: result.id.slice(0, 8).toUpperCase(),
          }),
        });
      } catch (e) {
        console.error("[meldung] org mail:", e);
      }
    }
  }

  return NextResponse.json({ ok: true, id: result.id });
}
