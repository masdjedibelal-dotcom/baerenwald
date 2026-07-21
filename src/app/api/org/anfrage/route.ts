import { NextResponse } from "next/server";

import { persistLead } from "@/lib/lead/persist-lead";
import { initialHvMeldungState } from "@/lib/org/hv-meldung-workflow";
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
    .select("id, plz, strasse, hausnummer, titel, ort")
    .eq("id", objektId)
    .eq("kunde_id", session.kunde.id)
    .maybeSingle();

  if (!objekt) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  const org = session.kunde;
  /** Enum `lead_kanal` — keine `org_portal`/`org_funnel` (führen zu Insert-Fehler). */
  const kanal =
    anlass === "servicepaket"
      ? "org_service"
      : anlass === "projekt"
        ? "hv_manuell"
        : "hv_direkt";

  const contactName = body.name?.trim() || org.name?.trim() || "Hausverwaltung";
  const contactEmail = body.email?.trim() || org.email?.trim() || undefined;
  const contactTel = body.telefon?.trim() || undefined;

  if (!contactEmail && !(contactTel && contactTel.length >= 3)) {
    return NextResponse.json(
      {
        error:
          "Für den Vorgang fehlt eine Kontakt-E-Mail der Hausverwaltung. Bitte in den Einstellungen hinterlegen.",
      },
      { status: 400 }
    );
  }

  const initial = initialHvMeldungState();
  const funnelDaten =
    body.funnel_daten && typeof body.funnel_daten === "object"
      ? {
          ...(body.funnel_daten as Record<string, unknown>),
          quelle: kanal,
          ...(objekt.ort ? { ort: String(objekt.ort) } : {}),
        }
      : {
          quelle: kanal,
          ...(objekt.ort ? { ort: String(objekt.ort) } : {}),
        };

  const result = await persistLead({
    kunde_id: org.id,
    auftraggeber_kunde_id: org.id,
    name: contactName,
    email: contactEmail,
    telefon: contactTel,
    plz: String(objekt.plz ?? ""),
    strasse: String(objekt.strasse ?? ""),
    hausnummer: String(objekt.hausnummer ?? ""),
    ort: objekt.ort ? String(objekt.ort) : undefined,
    situation:
      body.situation ?? (anlass === "servicepaket" ? "betreuung" : "erneuern"),
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
    hv_meldung_status:
      anlass === "meldung" ? initial.hv_meldung_status : null,
    org_freigabe_status: initial.org_freigabe_status,
    skipKundeMail: true,
    skipInternMail: true,
    notizen: body.beschreibung?.trim(),
    funnel_daten: funnelDaten,
    funnel_quelle:
      anlass === "servicepaket"
        ? "org_service"
        : anlass === "projekt"
          ? "hv_manuell"
          : "hv_direkt",
  });

  if (!result.ok) {
    console.error("[org/anfrage] persistLead:", result.error);
    return NextResponse.json(
      { error: result.error || "Speichern fehlgeschlagen." },
      { status: result.status ?? 500 }
    );
  }

  return NextResponse.json({ ok: true, id: result.id });
}
