import { NextResponse } from "next/server";

import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import { persistLead } from "@/lib/lead/persist-lead";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import {
  berechneMieterwechselPreis,
  findMieterwechselGroesse,
  findMieterwechselStufe,
  isMieterwechselGroesseId,
  isMieterwechselModulId,
  isMieterwechselStufeId,
  isMieterwechselZubuchId,
  MIETERWECHSEL_MODULE,
  MIETERWECHSEL_ZUBUCH,
  mieterwechselRichtwert,
  type MieterwechselGroesseId,
  type MieterwechselModulId,
  type MieterwechselStufeId,
  type MieterwechselZubuchId,
} from "@/lib/portal2/mieterwechsel";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type Body = {
  stufe?: number;
  groesse?: string;
  m2?: number | null;
  objektId?: string;
  zubuch?: string[];
  module?: string[];
  /** Client-Anzeige; Server rechnet verbindlich nach. */
  preisMin?: number;
  preisMax?: number;
  isFix?: boolean;
};

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

  const stufeNum = Number(body.stufe);
  if (!isMieterwechselStufeId(stufeNum)) {
    return NextResponse.json({ error: "Ungültige Stufe." }, { status: 400 });
  }
  const stufe = stufeNum as MieterwechselStufeId;
  const stufeCard = findMieterwechselStufe(stufe);
  if (!stufeCard) {
    return NextResponse.json({ error: "Stufe nicht gefunden." }, { status: 400 });
  }

  const groesseRaw = String(body.groesse ?? "").trim();
  if (!isMieterwechselGroesseId(groesseRaw)) {
    return NextResponse.json({ error: "Ungültige Größenklasse." }, { status: 400 });
  }
  const groesse = groesseRaw as MieterwechselGroesseId;
  const groesseOpt = findMieterwechselGroesse(groesse)!;

  const m2Raw = body.m2 != null ? Number(body.m2) : null;
  const m2 = m2Raw != null && Number.isFinite(m2Raw) && m2Raw > 0 ? m2Raw : null;

  const zubuch: MieterwechselZubuchId[] = [];
  for (const z of body.zubuch ?? []) {
    if (isMieterwechselZubuchId(String(z))) zubuch.push(z as MieterwechselZubuchId);
  }

  const module: MieterwechselModulId[] = [];
  if (stufe === 3) {
    for (const m of body.module ?? []) {
      if (isMieterwechselModulId(String(m))) module.push(m as MieterwechselModulId);
    }
  }

  const objektId = String(body.objektId ?? "").trim();
  if (!objektId) {
    return NextResponse.json({ error: "Objekt erforderlich." }, { status: 400 });
  }

  const { data: objekt } = await supabaseAdmin
    .from("kunden_objekte")
    .select("id, plz, strasse, hausnummer, titel")
    .eq("id", objektId)
    .eq("kunde_id", session.kunde.id)
    .maybeSingle();

  if (!objekt) {
    return NextResponse.json({ error: "Objekt nicht gefunden." }, { status: 404 });
  }

  const preis = berechneMieterwechselPreis({
    stufe,
    groesse,
    m2,
    zubuch,
    module,
  });
  const richtwert = mieterwechselRichtwert(preis);
  const modus = preis.isFix && stufe !== 3 ? "direkt" : "angebot";

  const zubuchLabels = zubuch.map(
    (id) => MIETERWECHSEL_ZUBUCH.find((z) => z.id === id)?.label ?? id
  );
  const modulLabels = module.map(
    (id) => MIETERWECHSEL_MODULE.find((m) => m.id === id)?.label ?? id
  );

  const notizen = [
    `Turn-Paket Mieterwechsel — Stufe ${stufe} „${stufeCard.name}"`,
    `Objekt: ${objekt.titel ?? objektId}`,
    `Größe: ${groesseOpt.label}${m2 != null ? ` · ${m2} m²` : ""}`,
    `Preis: ${preis.label} netto (${preis.isFix ? "Fixpreis" : "Indikation"})`,
    zubuchLabels.length ? `Zubuch: ${zubuchLabels.join(", ")}` : null,
    modulLabels.length ? `Module: ${modulLabels.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const org = session.kunde;
  const result = await persistLead({
    kunde_id: org.id,
    auftraggeber_kunde_id: org.id,
    name: org.name?.trim() || org.org_anzeigename?.trim() || "Hausverwaltung",
    email: org.email?.trim() || undefined,
    plz: String(objekt.plz ?? ""),
    strasse: objekt.strasse ?? undefined,
    hausnummer: objekt.hausnummer ?? undefined,
    situation: "betreuung",
    bereiche: ["hausmeister"],
    preis_min: preis.min,
    preis_max: preis.max,
    preis_unsicher: !preis.isFix,
    kanal: "hv_katalog",
    anlass: "servicepaket",
    erfassung_von: "organisation",
    kunde_objekt_id: objektId,
    service_modus: "paket",
    kundentyp: "hausverwaltung",
    skipKundeMail: true,
    notizen,
    funnel_daten: {
      quelle: "screen_mieterwechsel",
      turn_paket: {
        name: "Mieterwechsel",
        stufe,
        stufe_name: stufeCard.name,
        produkt_slug: stufeCard.produktSlug,
        groesse,
        groesse_label: groesseOpt.label,
        m2,
        zubuch,
        zubuch_labels: zubuchLabels,
        module,
        modul_labels: modulLabels,
        preis_min: preis.min,
        preis_max: preis.max,
        preis_richtwert: richtwert,
        is_fix: preis.isFix,
        modus,
      },
    },
    funnel_quelle: "org_mieterwechsel",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  await writeAuditEvent({
    entityType: "lead",
    entityId: result.id,
    aktion: "mieterwechsel_angefragt",
    actorId: session.userId,
    kundeId: org.id,
    payload: {
      stufe,
      groesse,
      m2,
      zubuch,
      module,
      preisMin: preis.min,
      preisMax: preis.max,
      isFix: preis.isFix,
      modus,
      objektId,
    },
  });

  return NextResponse.json({
    ok: true,
    id: result.id,
    stufe,
    stufeName: stufeCard.name,
    preisMin: preis.min,
    preisMax: preis.max,
    isFix: preis.isFix,
    modus,
  });
}
