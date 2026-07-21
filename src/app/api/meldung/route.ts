import { NextResponse } from "next/server";

import {
  buildOrgNeueMeldungHtml,
  buildOrgNeueMeldungSubject,
} from "@/lib/email/meldung-mail-templates";
import { parseMeldeBereichId, persistMeldungLead } from "@/lib/org/persist-meldung-lead";
import { addressesMatch } from "@/lib/org/match-lead-objekt";
import { MELDE_ALLGEMEIN_SLUG } from "@/lib/org/melde-url";
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
  plz?: string;
  strasse?: string;
  hausnummer?: string;
  ort?: string;
  kategorie?: MeldeKategorie;
  bereichId?: string;
  fachdetailAnswers?: Record<string, string | string[]>;
  fachfragen?: {
    bereichKey: string;
    items: Array<{
      id: string;
      index: number;
      de: string;
      en: string;
      answer: boolean;
    }>;
  } | null;
  notfall?: boolean | null;
  terminwunsch?: string | null;
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
  const bodyPlz = String(body.plz ?? "").trim();
  const bodyStrasse = String(body.strasse ?? "").trim();
  const bodyHausnummer = String(body.hausnummer ?? "").trim();
  const bodyOrt = String(body.ort ?? "").trim();
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
  if (beschreibung.length < 10) {
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
  const isAllgemein = objektSlug.toLowerCase() === MELDE_ALLGEMEIN_SLUG;
  if (!objekt && !isAllgemein) {
    return NextResponse.json({ error: "Objekt fehlt." }, { status: 400 });
  }

  const leadStrasse = objekt?.strasse ?? (bodyStrasse || null);
  const leadHausnummer = objekt?.hausnummer ?? (bodyHausnummer || null);
  const leadPlz = objekt?.plz?.trim() || bodyPlz || "80331";
  const leadOrt = bodyOrt || objekt?.ort || null;

  /** Ohne Objekt-Link: gleiche Anschrift wie bestehendes Objekt → zuordnen. */
  let matchedObjektId = objekt?.id ?? null;
  let matchedObjektTitel = objekt?.titel?.trim() || null;
  if (!matchedObjektId && leadStrasse && leadHausnummer) {
    const { data: orgObjekte } = await supabaseAdmin
      .from("kunden_objekte")
      .select("id, titel, strasse, hausnummer, plz, ort")
      .eq("kunde_id", orgRow.id);
    const hit = (orgObjekte ?? []).find((o) =>
      addressesMatch(
        {
          strasse: leadStrasse,
          hausnummer: leadHausnummer,
          plz: leadPlz,
          ort: leadOrt,
        },
        o
      )
    );
    if (hit) {
      matchedObjektId = hit.id;
      matchedObjektTitel = hit.titel?.trim() || matchedObjektTitel;
    }
  }

  const objektTitel =
    matchedObjektTitel ||
    orgRow.org_anzeigename?.trim() ||
    orgRow.name?.trim() ||
    "Objekt";

  if (matchedObjektId) {
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("leads")
      .select("id, melde_tracking_token")
      .eq("kunde_objekt_id", matchedObjektId)
      .eq("auftraggeber_kunde_id", orgRow.id)
      .gte("created_at", since)
      .in("kanal", ["hv_melder_link", "hv_direkt"])
      .order("created_at", { ascending: false })
      .limit(1);
    if (recent?.[0]?.id) {
      return NextResponse.json({
        ok: true,
        id: recent[0].id,
        duplicateWarning:
          "Eine ähnliche Meldung wurde in den letzten 15 Minuten bereits erfasst.",
        statusLink: recent[0].melde_tracking_token
          ? meldeStatusUrl(String(recent[0].melde_tracking_token))
          : undefined,
        reused: true,
      });
    }
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
    fachfragen: body.fachfragen ?? null,
    notfall: body.notfall ?? null,
    terminwunsch: body.terminwunsch?.trim() || null,
    dringlichkeit: body.dringlichkeit,
    fotos,
    plz: leadPlz,
    strasse: leadStrasse,
    hausnummer: leadHausnummer,
    ort: leadOrt,
    auftraggeber_kunde_id: orgRow.id,
    kunde_objekt_id: matchedObjektId,
    kanal: "hv_melder_link",
    erfassung_von: "melder",
    skipInternMail: true,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const trackingToken =
    "meldeTrackingToken" in result && result.meldeTrackingToken
      ? String(result.meldeTrackingToken)
      : undefined;
  const statusLink = trackingToken ? meldeStatusUrl(trackingToken) : undefined;

  const resendKey = process.env.RESEND_API_KEY;
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
          subject: buildOrgNeueMeldungSubject(objektTitel),
          html: buildOrgNeueMeldungHtml({
            objektTitel,
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
          }),
        });
      } catch (e) {
        console.error("[meldung] org mail:", e);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    id: result.id,
    statusLink,
    meldeTrackingToken: trackingToken,
  });
}
