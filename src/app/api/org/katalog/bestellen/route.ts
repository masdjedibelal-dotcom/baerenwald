import { NextResponse } from "next/server";

import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import {
  istDirektbestellung,
  loadEinheitFlaeche,
  loadKatalogProdukte,
  loadObjektFlaeche,
  resolveBestellBetragAsync,
} from "@/lib/katalog/katalog-produkte";
import { initialHvMeldungState } from "@/lib/org/hv-meldung-workflow";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type Body = {
  produktSlug?: string;
  kundeObjektId?: string;
  einheitId?: string;
  groessenklasse?: string;
  m2?: number;
  notiz?: string;
};

function naechsterMonatsanfang(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const produktSlug = String(body.produktSlug ?? "").trim();
  const kundeObjektId = String(body.kundeObjektId ?? "").trim();
  if (!produktSlug || !kundeObjektId) {
    return NextResponse.json({ error: "Produkt und Objekt erforderlich." }, { status: 400 });
  }

  const { data: objekt } = await supabaseAdmin
    .from("kunden_objekte")
    .select("id, kunde_id, titel, plz, strasse, hausnummer")
    .eq("id", kundeObjektId)
    .eq("kunde_id", session.kunde.id)
    .maybeSingle();

  if (!objekt) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  const produkte = await loadKatalogProdukte();
  const produkt = produkte.find((p) => p.slug === produktSlug);
  if (!produkt) {
    return NextResponse.json({ error: "Produkt nicht gefunden." }, { status: 404 });
  }

  const einheitId = String(body.einheitId ?? "").trim();
  let m2 = body.m2 != null && body.m2 > 0 ? Number(body.m2) : undefined;
  if (!m2 && einheitId) {
    const flaeche = await loadEinheitFlaeche(einheitId);
    if (flaeche != null && flaeche > 0) m2 = flaeche;
  }
  if (!m2) {
    const flaeche = await loadObjektFlaeche(kundeObjektId);
    if (flaeche != null && flaeche > 0) m2 = flaeche;
  }

  const { betrag, preisUnsicher } = await resolveBestellBetragAsync(produkt, {
    groessenklasse: body.groessenklasse,
    m2,
  });
  const betragNetto = betrag ?? 0;
  const schwelle = session.kunde.freigabe_schwelle_eur ?? null;
  const direkt =
    !preisUnsicher &&
    betrag != null &&
    istDirektbestellung(
      produkt,
      betragNetto,
      schwelle,
      session.kunde.freigabe_modus ?? "freigabe"
    );

  if (produkt.familie === "service") {
    const startAm = naechsterMonatsanfang();
    const { data: abo, error: aboErr } = await supabaseAdmin
      .from("objekt_abos")
      .insert({
        kunde_id: session.kunde.id,
        kunde_objekt_id: kundeObjektId,
        produkt_slug: produktSlug,
        service_modus: "abo",
        status: "aktiv",
        start_am: startAm,
        monatspreis_netto: betragNetto || 149,
        lohnanteil_prozent: produkt.lohnanteil_prozent,
      })
      .select("id")
      .single();
    if (aboErr) {
      return NextResponse.json({ error: aboErr.message }, { status: 500 });
    }
    await writeAuditEvent({
      entityType: "objekt_abo",
      entityId: String(abo.id),
      aktion: "abo_gestartet",
      actorId: session.userId,
      kundeId: session.kunde.id,
      payload: { produktSlug, startAm, monatspreis: betragNetto || 149 },
    });
    return NextResponse.json({ ok: true, modus: "abo", aboId: abo.id, startAm });
  }

  const initial = initialHvMeldungState();
  const orgFreigabe =
    direkt || session.kunde.freigabe_modus !== "freigabe" ? "nicht_noetig" : "ausstehend";

  const { data: lead, error: leadErr } = await supabaseAdmin
    .from("leads")
    .insert({
      kunde_id: session.kunde.id,
      auftraggeber_kunde_id: session.kunde.id,
      kunde_objekt_id: kundeObjektId,
      kanal: "hv_katalog",
      status: "neu",
      anlass: "servicepaket",
      erfassung_von: "organisation",
      org_freigabe_status: orgFreigabe,
      hv_meldung_status: initial.hv_meldung_status,
      vorgang_phase: "eingegangen",
      preis_min: betrag,
      preis_max: betrag,
      preis_unsicher: preisUnsicher,
      plz: objekt.plz,
      strasse: objekt.strasse,
      hausnummer: objekt.hausnummer,
      kontakt_name: session.kunde.name,
      kontakt_email: session.kunde.email,
      kontakt_nachricht: body.notiz?.trim() || null,
      funnel_daten: {
        quelle: "hv_katalog",
        produkt: {
          produkt_slug: produktSlug,
          groessenklasse: body.groessenklasse ?? null,
          m2: m2 ?? null,
          lohnanteil_prozent: produkt.lohnanteil_prozent,
        },
      },
      produkt_slug: produktSlug,
    })
    .select("id")
    .single();

  if (leadErr || !lead) {
    return NextResponse.json({ error: leadErr?.message ?? "Lead fehlgeschlagen." }, { status: 500 });
  }

  await writeAuditEvent({
    entityType: "lead",
    entityId: String(lead.id),
    aktion: direkt ? "katalog_direkt" : "katalog_angebot",
    actorId: session.userId,
    kundeId: session.kunde.id,
    payload: { produktSlug, betrag, direkt, m2, preisUnsicher },
  });

  return NextResponse.json({
    ok: true,
    modus: direkt ? "direkt" : "angebot",
    leadId: lead.id,
    betrag,
    preisUnsicher,
  });
}
