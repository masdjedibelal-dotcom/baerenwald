import { NextResponse } from "next/server";

import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import { persistLead } from "@/lib/lead/persist-lead";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import {
  findServicepaket,
  SERVICEPAKET_KANAL_LIVE,
} from "@/lib/portal2/servicepakete";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type Body = {
  /** Paket-id oder Name aus Mock-Karten */
  paket?: string;
  paketName?: string;
  /** Optional — Mock weist Objekt später zu */
  objektId?: string | null;
};

/**
 * D5: Ein-Klick „Paket wählen“ → Lead an Organisation (CRM).
 * Kanal live: `org_service`; Spec-Vorschlag `servicepaket` → Migration ausstehend.
 */
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

  const key = String(body.paket ?? body.paketName ?? "").trim();
  const paket = findServicepaket(key);
  if (!paket) {
    return NextResponse.json({ error: "Unbekanntes Paket." }, { status: 400 });
  }

  const org = session.kunde;
  let objektId = String(body.objektId ?? "").trim() || null;
  let plz = "";
  let strasse: string | null = null;
  let hausnummer: string | null = null;

  if (objektId) {
    const { data: objekt } = await supabaseAdmin
      .from("kunden_objekte")
      .select("id, plz, strasse, hausnummer")
      .eq("id", objektId)
      .eq("kunde_id", org.id)
      .maybeSingle();
    if (!objekt) {
      return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
    }
    plz = String(objekt.plz ?? "");
    strasse = objekt.strasse;
    hausnummer = objekt.hausnummer;
  } else {
    const { data: first } = await supabaseAdmin
      .from("kunden_objekte")
      .select("id, plz, strasse, hausnummer")
      .eq("kunde_id", org.id)
      .order("titel", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (first) {
      objektId = first.id;
      plz = String(first.plz ?? "");
      strasse = first.strasse;
      hausnummer = first.hausnummer;
    }
  }

  const notizen = `Servicepaket „${paket.name}" angefragt (${paket.preis}${paket.zyklus}). Objekt-Zuordnung und Aktivierung durch Bärenwald.`;

  const result = await persistLead({
    kunde_id: org.id,
    auftraggeber_kunde_id: org.id,
    name: org.name?.trim() || org.org_anzeigename?.trim() || "Hausverwaltung",
    email: org.email?.trim() || undefined,
    plz,
    strasse: strasse ?? undefined,
    hausnummer: hausnummer ?? undefined,
    situation: "betreuung",
    bereiche: ["hausmeister"],
    preis_min: paket.preisEur,
    preis_max: paket.preisEur,
    kanal: SERVICEPAKET_KANAL_LIVE,
    anlass: "servicepaket",
    erfassung_von: "organisation",
    kunde_objekt_id: objektId,
    service_modus: "paket",
    kundentyp: "hausverwaltung",
    skipKundeMail: true,
    notizen,
    funnel_daten: {
      quelle: "screen_servicepakete",
      portal2_servicepaket: {
        id: paket.id,
        name: paket.name,
        preis: paket.preis,
        zyklus: paket.zyklus,
        preis_eur: paket.preisEur,
      },
    },
    funnel_quelle: "org_service",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  await writeAuditEvent({
    entityType: "lead",
    entityId: result.id,
    aktion: "servicepaket_angefragt",
    actorId: session.userId,
    kundeId: org.id,
    payload: {
      paketId: paket.id,
      paketName: paket.name,
      kanal: SERVICEPAKET_KANAL_LIVE,
      kanalVorschlag: "servicepaket",
      objektId,
    },
  });

  return NextResponse.json({
    ok: true,
    id: result.id,
    paketName: paket.name,
    kanal: SERVICEPAKET_KANAL_LIVE,
  });
}
