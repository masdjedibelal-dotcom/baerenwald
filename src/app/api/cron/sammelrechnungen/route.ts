import { logDbError } from '@/lib/errors/log-db-error'
import { NextResponse } from "next/server";

import { loadKatalogProdukte } from "@/lib/katalog/katalog-produkte";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

/** Monatliche Sammelrechnung für HV-Abos (Cron: Authorization Bearer CRON_SECRET). */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || auth !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const periode = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monatsAnfang = `${periode}-01`;
  const monatsEnde = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  const {data: abos, error: __dbErr134_1} = await supabaseAdmin
    .from("objekt_abos")
    .select("id, kunde_id, kunde_objekt_id, produkt_slug, monatspreis_netto, lohnanteil_prozent, end_am, status")
    .in("status", ["aktiv", "gekuendigt"])
    .lte("start_am", monatsEnde)
    .or(`end_am.is.null,end_am.gte.${monatsAnfang}`);
  if (__dbErr134_1) logDbError('app/api/cron/sammelrechnungen/route:objekt_abos', __dbErr134_1)
  if (!abos?.length) {
    return NextResponse.json({ ok: true, periode, rechnungen: 0 });
  }

  const produkte = await loadKatalogProdukte();
  const produktName = (slug: string) =>
    produkte.find((p) => p.slug === slug)?.bezeichnung ?? slug;

  const byKunde = new Map<string, typeof abos>();
  for (const abo of abos) {
    const list = byKunde.get(String(abo.kunde_id)) ?? [];
    list.push(abo);
    byKunde.set(String(abo.kunde_id), list);
  }

  let count = 0;
  for (const [kundeId, kundeAbos] of Array.from(byKunde.entries())) {
    const {data: existing, error: __dbErr135_2} = await supabaseAdmin
      .from("sammelrechnungen")
      .select("id")
      .eq("kunde_id", kundeId)
      .eq("periode", periode)
      .maybeSingle();
    if (__dbErr135_2) logDbError('app/api/cron/sammelrechnungen/route:sammelrechnungen', __dbErr135_2)
    if (existing?.id) continue;

    let gesamt = 0;
    const positionen: Array<Record<string, unknown>> = [];

    for (const abo of kundeAbos) {
      const netto = Number(abo.monatspreis_netto ?? 0);
      const lohnPct = Number(abo.lohnanteil_prozent ?? 85);
      const lohnEur = (netto * lohnPct) / 100;
      gesamt += netto;
      positionen.push({
        objekt_abo_id: abo.id,
        kunde_objekt_id: abo.kunde_objekt_id,
        beschreibung: `${produktName(String(abo.produkt_slug))} (${periode})`,
        netto,
        ust_satz: 19,
        lohnanteil_eur: lohnEur,
        lohnanteil_prozent: lohnPct,
        leistungszeitraum_von: monatsAnfang,
        leistungszeitraum_bis: monatsEnde,
      });
    }

    const { data: sr, error: srErr } = await supabaseAdmin
      .from("sammelrechnungen")
      .insert({
        kunde_id: kundeId,
        periode,
        status: "entwurf",
        gesamt_netto: gesamt,
      })
      .select("id")
      .single();
    if (srErr) logDbError('app/api/cron/sammelrechnungen/route:sammelrechnungen', srErr)

    if (srErr || !sr) continue;

    const { error: __dbErr136_3 } = await supabaseAdmin.from("sammelrechnung_positionen").insert(
      positionen.map((p, i) => ({
        ...p,
        sammelrechnung_id: sr.id,
        sort_order: i,
      }))
    );
    if (__dbErr136_3) logDbError('app/api/cron/sammelrechnungen/route:sammelrechnung_positionen', __dbErr136_3)
    count += 1;
  }

  return NextResponse.json({ ok: true, periode, rechnungen: count });
}
