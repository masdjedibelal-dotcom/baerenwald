import { logDbError } from '@/lib/errors/log-db-error'
import { NextResponse } from "next/server";

import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

function csvEscape(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function formatDeNumber(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "";
  return n.toFixed(2).replace(".", ",");
}

/** Neutrale CSV (UTF-8, Semikolon, DE-Komma) für Rechnungen der HV. */
export async function GET(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const url = new URL(req.url);
  const von = url.searchParams.get("von")?.trim();
  const bis = url.searchParams.get("bis")?.trim();

  let q = supabaseAdmin
    .from("rechnungen")
    .select(
      "id, rechnungsnummer, status, netto, mwst_betrag, brutto, lohnanteil_eur, lohnanteil_prozent, leistungszeitraum_von, leistungszeitraum_bis, kostentraeger, rechnungsdatum, auftrag_id, kunde_id, kunde_objekt_id"
    )
    .eq("kunde_id", session.kunde.id)
    .order("created_at", { ascending: false });

  if (von) q = q.gte("created_at", von);
  if (bis) q = q.lte("created_at", `${bis}T23:59:59`);

  const { data: rows, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Objekt: an der Rechnung, sonst über den Vorgang (Auftrag → Anfrage).
  const auftragIds = Array.from(new Set((rows ?? []).map((r) => r.auftrag_id).filter(Boolean)));
  const leadObjektByAuftrag = new Map<string, string>();
  if (auftragIds.length) {
    const {data: auftraege, error: __dbErr173_1} = await supabaseAdmin
      .from("auftraege")
      .select("id, leads(kunde_objekt_id)")
      .in("id", auftragIds);
    if (__dbErr173_1) logDbError('app/api/org/export/rechnungen/route:auftraege', __dbErr173_1)
    for (const a of auftraege ?? []) {
      const lead = (Array.isArray(a.leads) ? a.leads[0] : a.leads) as
        | { kunde_objekt_id?: string | null }
        | null;
      if (lead?.kunde_objekt_id) leadObjektByAuftrag.set(String(a.id), String(lead.kunde_objekt_id));
    }
  }

  const objektIdByRechnung = new Map<string, string>();
  for (const r of rows ?? []) {
    const oid = r.kunde_objekt_id
      ? String(r.kunde_objekt_id)
      : r.auftrag_id
        ? leadObjektByAuftrag.get(String(r.auftrag_id))
        : undefined;
    if (oid) objektIdByRechnung.set(String(r.id), oid);
  }

  const objektMap = new Map<string, { titel: string; kostenstelle_nr: string | null }>();
  const objektIds = Array.from(new Set(objektIdByRechnung.values()));
  if (objektIds.length) {
    const {data: objekte, error: __dbErr174_2} = await supabaseAdmin
      .from("kunden_objekte")
      .select("id, titel, kostenstelle_nr")
      .in("id", objektIds);
    if (__dbErr174_2) logDbError('app/api/org/export/rechnungen/route:kunden_objekte', __dbErr174_2)
    for (const o of objekte ?? []) {
      objektMap.set(String(o.id), {
        titel: String(o.titel ?? ""),
        kostenstelle_nr: o.kostenstelle_nr as string | null,
      });
    }
  }

  const header = [
    "Rechnungsnummer",
    "Datum",
    "Objekt",
    "Kostenstelle",
    "Kostenträger",
    "Leistungszeitraum von",
    "Leistungszeitraum bis",
    "Netto EUR",
    "USt EUR",
    "Brutto EUR",
    "Lohnanteil EUR",
    "Lohnanteil %",
    "Status",
  ].join(";");

  const lines = (rows ?? []).flatMap((r) => {
    const oid = objektIdByRechnung.get(String(r.id));
    const obj = oid ? objektMap.get(oid) : null;
    const kt = String(r.kostentraeger ?? "").trim();
    const kostenstelle = obj?.kostenstelle_nr?.trim() || (r.auftrag_id ? String(r.auftrag_id).slice(0, 8) : "");
    const base = [
      csvEscape(r.rechnungsnummer),
      csvEscape(String(r.rechnungsdatum ?? "").slice(0, 10)),
      csvEscape(obj?.titel ?? ""),
      csvEscape(kostenstelle),
      csvEscape(kt),
      csvEscape(r.leistungszeitraum_von),
      csvEscape(r.leistungszeitraum_bis),
      csvEscape(formatDeNumber(Number(r.netto))),
      csvEscape(formatDeNumber(Number(r.mwst_betrag))),
      csvEscape(formatDeNumber(Number(r.brutto))),
      csvEscape(formatDeNumber(Number(r.lohnanteil_eur))),
      csvEscape(formatDeNumber(Number(r.lohnanteil_prozent))),
      csvEscape(r.status),
    ].join(";");

    if (String(r.status ?? "").toLowerCase() === "storniert") {
      const storno = [
        csvEscape(`${r.rechnungsnummer}-STORNO`),
        csvEscape(String(r.rechnungsdatum ?? "").slice(0, 10)),
        csvEscape(obj?.titel ?? ""),
        csvEscape(kostenstelle),
        csvEscape(kt),
        csvEscape(r.leistungszeitraum_von),
        csvEscape(r.leistungszeitraum_bis),
        csvEscape(formatDeNumber(-Math.abs(Number(r.netto)))),
        csvEscape(formatDeNumber(-Math.abs(Number(r.mwst_betrag)))),
        csvEscape(formatDeNumber(-Math.abs(Number(r.brutto)))),
        csvEscape(formatDeNumber(-Math.abs(Number(r.lohnanteil_eur)))),
        csvEscape(formatDeNumber(Number(r.lohnanteil_prozent))),
        csvEscape("storno"),
      ].join(";");
      return [base, storno];
    }
    return [base];
  });

  const bom = "\uFEFF";
  const csv = bom + [header, ...lines].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rechnungen-${session.kunde.id.slice(0, 8)}.csv"`,
    },
  });
}
