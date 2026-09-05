import { NextResponse } from "next/server";

import {
  findRecentDuplicateMeldungLead,
  parseMeldeBereichId,
  persistMeldungLead,
} from "@/lib/org/persist-meldung-lead";
import { addressesMatch } from "@/lib/org/match-lead-objekt";
import { MELDE_ALLGEMEIN_SLUG } from "@/lib/org/melde-url";
import { resolveMeldeKontext } from "@/lib/org/resolve-melde-kontext";
import type { MeldeKategorie } from "@/lib/org/types";
import { getClientIp } from "@/lib/request-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidEmail, isValidName } from "@/lib/validation";
import { meldeStatusUrl } from "@/lib/melde/melde-tracking";
import { supabaseAdmin } from "@/lib/supabase";
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
  direktauftrag?: boolean | null;
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

  // Mieter-Angaben haben Vorrang (Objekt nur Prefill / Fallback)
  const leadStrasse = bodyStrasse || objekt?.strasse?.trim() || null;
  const leadHausnummer = bodyHausnummer || objekt?.hausnummer?.trim() || null;
  const leadPlz = bodyPlz || objekt?.plz?.trim() || "80331";
  const leadOrt = bodyOrt || objekt?.ort?.trim() || null;

  /** Ohne Objekt-Link: gleiche Anschrift wie bestehendes Objekt → zuordnen. */
  let matchedObjektId = objekt?.id ?? null;
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
    }
  }

  // Doppel-Submit / Retry: gleicher Melder + Beschreibung innerhalb 60s → bestehendes Lead.
  const dup = await findRecentDuplicateMeldungLead({
    auftraggeber_kunde_id: orgRow.id,
    kunde_objekt_id: matchedObjektId,
    name,
    email: isValidEmail(email) ? email : null,
    telefon: telefon || null,
    beschreibung,
  });
  if (dup) {
    const trackingToken = dup.meldeTrackingToken || undefined;
    return NextResponse.json({
      ok: true,
      id: dup.id,
      statusLink: trackingToken ? meldeStatusUrl(trackingToken) : undefined,
      meldeTrackingToken: trackingToken,
      reused: true,
    });
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
    direktauftrag: body.direktauftrag ?? body.notfall ?? null,
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

  // HV-Mail nur über notifyHvNeueMeldung (persistMeldungLead) —
  // kein zweites „Neuer Vorgang“-Template mit Summary-Tabelle.

  return NextResponse.json({
    ok: true,
    id: result.id,
    statusLink,
    meldeTrackingToken: trackingToken,
  });
}
