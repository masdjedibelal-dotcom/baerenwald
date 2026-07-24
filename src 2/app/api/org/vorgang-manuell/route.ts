import { NextResponse } from "next/server";

import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import { persistLead } from "@/lib/lead/persist-lead";
import { initialHvMeldungState } from "@/lib/org/hv-meldung-workflow";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { isKostentraeger } from "@/lib/vorgang/kostentraeger";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type Body = {
  titel?: string;
  beschreibung?: string;
  kundeObjektId?: string;
  kostentraeger?: string;
  versicherungsNr?: string;
  preisNetto?: number;
};

/** HV-initiierter Vorgang ohne Mieter (kein Status-Link, gleiche Freigabe-Logik). */
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

  const titel = String(body.titel ?? "").trim();
  const beschreibung = String(body.beschreibung ?? "").trim();
  const kundeObjektId = String(body.kundeObjektId ?? "").trim();
  const kostentraeger = String(body.kostentraeger ?? "gemeinschaft").trim();
  const versicherungsNr = String(body.versicherungsNr ?? "").trim() || null;
  const preisNetto = Number(body.preisNetto ?? 0);

  if (!titel || titel.length < 4) {
    return NextResponse.json({ error: "Titel fehlt (mind. 4 Zeichen)." }, { status: 400 });
  }
  if (!beschreibung || beschreibung.length < 8) {
    return NextResponse.json({ error: "Beschreibung fehlt (mind. 8 Zeichen)." }, { status: 400 });
  }
  if (!kundeObjektId) {
    return NextResponse.json({ error: "Objekt fehlt." }, { status: 400 });
  }
  if (!isKostentraeger(kostentraeger)) {
    return NextResponse.json({ error: "Kostenträger ungültig." }, { status: 400 });
  }

  const { data: objekt } = await supabaseAdmin
    .from("kunden_objekte")
    .select("id, titel, plz, strasse, hausnummer, freigabe_schwelle_eur")
    .eq("id", kundeObjektId)
    .eq("kunde_id", session.kunde.id)
    .maybeSingle();

  if (!objekt) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  const schwelle =
    objekt.freigabe_schwelle_eur != null
      ? Number(objekt.freigabe_schwelle_eur)
      : session.kunde.freigabe_schwelle_eur ?? 2500;
  const freigabeModus = session.kunde.freigabe_modus ?? "freigabe";
  const initial = initialHvMeldungState();
  const orgFreigabe =
    freigabeModus !== "freigabe" || preisNetto <= schwelle
      ? "nicht_noetig"
      : "ausstehend";

  const result = await persistLead({
    kunde_id: session.kunde.id,
    name: session.kunde.name?.trim() || "Verwaltung",
    email: session.kunde.email?.trim() || undefined,
    plz: String(objekt.plz ?? ""),
    strasse: String(objekt.strasse ?? ""),
    hausnummer: String(objekt.hausnummer ?? ""),
    situation: "kaputt",
    bereiche: ["sonstiges"],
    zeitraum: "flexibel",
    kanal: "hv_manuell",
    anlass: "meldung",
    erfassung_von: "organisation",
    auftraggeber_kunde_id: session.kunde.id,
    kunde_objekt_id: kundeObjektId,
    org_freigabe_status: orgFreigabe,
    hv_meldung_status: initial.hv_meldung_status,
    preis_min: preisNetto || null,
    preis_max: preisNetto || null,
    skipKundeMail: true,
    skipInternMail: true,
    notizen: `${titel}\n\n${beschreibung}`,
    funnel_quelle: "hv_manuell",
    funnel_daten: { quelle: "hv_manuell", titel },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const leadPatch: Record<string, unknown> = {
    melde_tracking_token: null,
    melder_name: null,
    melder_email: null,
    melder_telefon: null,
    melder_einheit: null,
    kontakt_nachricht: beschreibung,
    vorgang_phase: "eingegangen",
    kostentraeger: kostentraeger,
    kostentraeger_vorgeschlagen: false,
  };
  if (kostentraeger === "versicherung" && versicherungsNr) {
    leadPatch.versicherungs_nr = versicherungsNr;
  }

  await supabaseAdmin.from("leads").update(leadPatch).eq("id", result.id);

  await writeAuditEvent({
    entityType: "lead",
    entityId: result.id,
    aktion: "hv_vorgang_manuell",
    actorId: session.userId,
    kundeId: session.kunde.id,
    payload: { titel, kostentraeger, preisNetto, orgFreigabe },
  });

  return NextResponse.json({
    ok: true,
    leadId: result.id,
    orgFreigabe,
    hasMieterStatusLink: false,
  });
}
