import { NextResponse } from "next/server";

import { findKundeIdByEmail } from "@/lib/kunden/kunde-email";
import {
  meldeKategorieToSituation,
  meldeKategorieToZeitraum,
} from "@/lib/org/melde-kategorien";
import { resolveEinladungKontext } from "@/lib/org/resolve-melde-kontext";
import type { MeldeKategorie } from "@/lib/org/types";
import { getClientIp } from "@/lib/request-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidEmail, isValidName } from "@/lib/validation";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, 6, 60 * 60 * 1000, "meldung_ergaenzen");
  if (!rl.allowed) {
    return NextResponse.json({ error: "Zu viele Anfragen." }, { status: 429 });
  }

  const body = (await req.json()) as {
    token?: string;
    name?: string;
    email?: string;
    telefon?: string;
    einheit?: string;
    kategorie?: MeldeKategorie;
    beschreibung?: string;
    fotos?: string[];
  };

  const token = String(body.token ?? "").trim();
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const telefon = String(body.telefon ?? "").trim();
  const einheit = String(body.einheit ?? "").trim();
  const beschreibung = String(body.beschreibung ?? "").trim();
  const kategorie = (body.kategorie ?? "reparatur") as MeldeKategorie;
  const fotos = Array.isArray(body.fotos)
    ? body.fotos.filter((u) => typeof u === "string")
    : [];

  if (!token) {
    return NextResponse.json({ error: "Token fehlt." }, { status: 400 });
  }

  const ctx = await resolveEinladungKontext(token);
  if (!ctx) {
    return NextResponse.json(
      { error: "Link ungültig oder abgelaufen." },
      { status: 404 }
    );
  }

  if (!isValidName(name)) {
    return NextResponse.json({ error: "Bitte Namen angeben." }, { status: 400 });
  }
  if (!isValidEmail(email) && telefon.length < 6) {
    return NextResponse.json(
      { error: "Bitte E-Mail oder Telefon angeben." },
      { status: 400 }
    );
  }
  if (beschreibung.length < 8) {
    return NextResponse.json({ error: "Bitte beschreiben." }, { status: 400 });
  }

  const leadId = String(ctx.lead.id);
  let kundeId: string | undefined;

  if (isValidEmail(email)) {
    kundeId = (await findKundeIdByEmail(email)) ?? undefined;
  }

  if (!kundeId) {
    const { data: created, error } = await supabaseAdmin
      .from("kunden")
      .insert({
        name,
        email: isValidEmail(email)
          ? email.toLowerCase()
          : `einladung-${token.slice(0, 8)}@pending.invalid`,
        telefon: telefon || null,
        typ: "privat",
      })
      .select("id")
      .single();
    if (error) {
      console.error("[ergaenzen] kunde:", error.message);
      return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
    }
    kundeId = String(created.id);
  }

  const situation = meldeKategorieToSituation(kategorie);
  const zeitraum = meldeKategorieToZeitraum(kategorie);
  const prevFunnel =
    typeof ctx.lead.funnel_daten === "object" && ctx.lead.funnel_daten
      ? (ctx.lead.funnel_daten as Record<string, unknown>)
      : {};

  const { error: updErr } = await supabaseAdmin
    .from("leads")
    .update({
      kunde_id: kundeId,
      einladung_status: "ergaenzt",
      erfassung_von: "melder",
      situation,
      zeitraum,
      bereiche: ["sanitaer"],
      melder_name: name,
      melder_einheit: einheit || null,
      melder_telefon: telefon || null,
      melder_email: isValidEmail(email) ? email : null,
      kontakt_name: name,
      kontakt_email: isValidEmail(email) ? email.toLowerCase() : null,
      kontakt_telefon: telefon || null,
      kontakt_nachricht: beschreibung,
      funnel_daten: {
        ...prevFunnel,
        melde_kategorie: kategorie,
        fotos,
        quelle: "einladung_ergaenzt",
      },
    })
    .eq("id", leadId);

  if (updErr) {
    return NextResponse.json({ error: "Speichern fehlgeschlagen." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: leadId });
}
