import { NextResponse } from "next/server";

import {
  parseMeldeBereichId,
  persistMeldungLead,
} from "@/lib/org/persist-meldung-lead";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import type { MeldeKategorie } from "@/lib/org/types";
import { isValidEmail, isValidName } from "@/lib/validation";
import { supabaseAdmin } from "@/lib/supabase";

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
  /** Abrechnung über Versicherung */
  versicherung?: boolean;
  versicherungsNr?: string;
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

  const { finalizeOrgSelfCreatedLead } = await import(
    "@/lib/org/finalize-org-self-created-lead"
  );
  await finalizeOrgSelfCreatedLead(result.id);

  if (body.versicherung) {
    const versNr = String(body.versicherungsNr ?? "").trim() || null;
    await supabaseAdmin
      .from("leads")
      .update({
        kostentraeger: "versicherung",
        kostentraeger_vorgeschlagen: false,
        ...(versNr ? { versicherungs_nr: versNr } : {}),
      })
      .eq("id", result.id);
    void import("@/lib/org/ensure-versicherungsakte").then(
      ({ ensureVersicherungsakteForLead }) =>
        ensureVersicherungsakteForLead(result.id, {
          actorId: session.userId,
          actorRolle: session.rolle,
        }).catch((e) =>
          console.warn("[meldung-direkt] schadenakte:", e)
        )
    );
  } else {
    void import("@/lib/org/ensure-versicherungsakte").then(
      ({ applyAutomatischeSchadenakteIfEnabled }) =>
        applyAutomatischeSchadenakteIfEnabled(result.id, {
          actorId: session.userId,
          actorRolle: session.rolle,
        }).catch((e) =>
          console.warn("[meldung-direkt] auto-schadenakte:", e)
        )
    );
  }

  // Keine Self-Mail an die HV bei eigener Erfassung (kein „Neuer Vorgang“-Template).

  return NextResponse.json({ ok: true, id: result.id });
}
