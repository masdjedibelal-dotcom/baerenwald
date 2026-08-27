import type { ObjektHistorieRowPortal } from "@/lib/org/objektakte/types";
import { loadObjektAktePortal } from "@/lib/org/objektakte/load-objekt-akte-portal";
import { kostentraegerLabel } from "@/lib/vorgang/kostentraeger";
import { supabaseAdmin } from "@/lib/supabase";
import { formatObjektAdresse } from "@/lib/portal2/objekte";

export type ObjektFinanzBelegRow = {
  id: string;
  datum: string;
  name: string;
  leadId: string;
  vorgangTitel: string;
  betragEuro: number | null;
  href: string | null;
  art: "rechnung" | "angebot" | "protokoll" | "dokument";
};

export type ObjektFinanzCsvRow = {
  vorgangId: string;
  vorgangTitel: string;
  vorgangDatum: string;
  status: string;
  gewerk: string;
  kostentraeger: string;
  betragEuro: number | null;
  kostenStatus: "rechnung" | "angebot" | "offen" | "storniert";
  rechnungNr: string;
  rechnungDatum: string;
  pdfVerfuegbar: "ja" | "nein";
  rechnungId: string;
};

export type ObjektFinanzPortalPayload = {
  objektTitel: string;
  objektAdresse: string;
  von: string;
  bis: string;
  gesamtKosten: number;
  rechnungenAnzahl: number;
  offenInArbeit: number;
  ohneBetrag: number;
  nachTraeger: Array<{ traeger: string; summe: number }>;
  nachGewerk: Array<{ gewerk: string; count: number }>;
  belege: ObjektFinanzBelegRow[];
  csvRows: ObjektFinanzCsvRow[];
};

function datumInRange(d: string, von: string, bis: string): boolean {
  const day = d.slice(0, 10);
  if (von && day < von) return false;
  if (bis && day > bis) return false;
  return true;
}

function istOffen(row: ObjektHistorieRowPortal): boolean {
  const s = row.statusLabel.toLowerCase();
  return !(s.includes("erledigt") || s.includes("storniert"));
}

function isWinningRechnung(r: {
  status: string;
  rechnung_art?: string | null;
}): boolean {
  const st = (r.status ?? "").trim().toLowerCase();
  if (!st || st === "storniert" || st === "entwurf") return false;
  return true;
}

export async function loadObjektFinanzPortal(input: {
  kundeId: string;
  objektId: string;
  von: string;
  bis: string;
}): Promise<ObjektFinanzPortalPayload | null> {
  const kid = input.kundeId.trim();
  const oid = input.objektId.trim();
  const von = input.von.trim();
  const bis = input.bis.trim();
  if (!kid || !oid) return null;

  const akte = await loadObjektAktePortal(kid, oid);
  if (!akte) return null;

  const { data: objekt } = await supabaseAdmin
    .from("kunden_objekte")
    .select("id, titel, strasse, hausnummer, plz, ort")
    .eq("id", oid)
    .eq("kunde_id", kid)
    .maybeSingle();

  if (!objekt) return null;

  const historieImZeitraum = akte.historie.filter((r) =>
    datumInRange(r.datum, von, bis)
  );

  const leadIds = historieImZeitraum.map((r) => r.leadId);
  const leadMeta = new Map(
    historieImZeitraum.map((r) => [r.leadId, r] as const)
  );

  type Rec = {
    id: string;
    lead_id?: string;
    auftrag_id?: string | null;
    angebot_id?: string | null;
    rechnungsnummer?: string | null;
    rechnungsdatum?: string | null;
    status: string;
    brutto?: number | null;
    pdf_url?: string | null;
    kostentraeger?: string | null;
    rechnung_art?: string | null;
    created_at: string;
  };

  let rechnungen: Rec[] = [];
  if (leadIds.length) {
    const { data: auftraege } = await supabaseAdmin
      .from("auftraege")
      .select("id, lead_id")
      .in("lead_id", leadIds);
    const auftragIds = (auftraege ?? []).map((a) => String(a.id));
    const auftragToLead = new Map(
      (auftraege ?? []).map((a) => [String(a.id), String(a.lead_id)] as const)
    );

    const { data: angebote } = await supabaseAdmin
      .from("angebote")
      .select("id, lead_id")
      .in("lead_id", leadIds);
    const angebotToLead = new Map(
      (angebote ?? []).map((a) => [String(a.id), String(a.lead_id)] as const)
    );

    if (auftragIds.length || (angebote ?? []).length) {
      let q = supabaseAdmin.from("rechnungen").select(
        "id, auftrag_id, angebot_id, rechnungsnummer, rechnungsdatum, status, brutto, pdf_url, kostentraeger, rechnung_art, created_at"
      );
      const angIds = (angebote ?? []).map((a) => String(a.id));
      if (auftragIds.length && angIds.length) {
        q = q.or(
          `auftrag_id.in.(${auftragIds.join(",")}),angebot_id.in.(${angIds.join(",")})`
        );
      } else if (auftragIds.length) {
        q = q.in("auftrag_id", auftragIds);
      } else {
        q = q.in("angebot_id", angIds);
      }
      const { data } = await q;
      rechnungen = (data ?? []).map((r) => {
        const lid =
          (r.auftrag_id
            ? auftragToLead.get(String(r.auftrag_id))
            : undefined) ??
          (r.angebot_id
            ? angebotToLead.get(String(r.angebot_id))
            : undefined) ??
          "";
        return { ...r, lead_id: lid };
      }) as Rec[];
    }
  }

  const rechnungenImZeitraum = rechnungen.filter((r) => {
    const d = (r.rechnungsdatum ?? r.created_at ?? "").slice(0, 10);
    return datumInRange(d, von, bis);
  });

  const winningRechnungen = rechnungenImZeitraum.filter(isWinningRechnung);
  const gesamtKosten = winningRechnungen.reduce((s, r) => {
    const b = Number(r.brutto);
    return Number.isFinite(b) && b > 0 ? s + Math.round(b) : s;
  }, 0);

  const traegerMap = new Map<string, number>();
  for (const r of winningRechnungen) {
    const key = kostentraegerLabel(r.kostentraeger) || "sonstiges";
    const b = Number(r.brutto);
    if (!Number.isFinite(b) || b <= 0) continue;
    traegerMap.set(key, (traegerMap.get(key) ?? 0) + Math.round(b));
  }

  const leadsMitRechnung = new Set<string>();
  for (const r of winningRechnungen) {
    if (r.lead_id) leadsMitRechnung.add(r.lead_id);
  }

  let ohneBetrag = 0;
  for (const row of historieImZeitraum) {
    if (leadsMitRechnung.has(row.leadId)) continue;
    if (row.kostenEuro == null) ohneBetrag++;
  }

  const belege: ObjektFinanzBelegRow[] = [];
  const csvRows: ObjektFinanzCsvRow[] = [];
  const csvLeadDone = new Set<string>();

  for (const r of rechnungenImZeitraum) {
    const lid = r.lead_id ?? "";
    const meta = leadMeta.get(lid);
    const st = (r.status ?? "").trim().toLowerCase();
    const isStorno = st === "storniert";
    const isEntwurf = st === "entwurf";
    const winning = isWinningRechnung(r) && !isStorno;
    const brutto = Number(r.brutto);
    const betrag =
      winning && Number.isFinite(brutto) && brutto > 0 ? Math.round(brutto) : null;

    const name = r.rechnungsnummer?.trim()
      ? `Rechnung ${r.rechnungsnummer.trim()}`
      : "Rechnung";
    const datum = (r.rechnungsdatum ?? r.created_at ?? "").slice(0, 10);

    if (winning) {
      belege.push({
        id: `rechnung-${r.id}`,
        datum,
        name,
        leadId: lid,
        vorgangTitel: meta?.titel ?? "Vorgang",
        betragEuro: betrag,
        href: r.pdf_url?.trim() || null,
        art: "rechnung",
      });
    }

    csvRows.push({
      vorgangId: lid.slice(0, 8),
      vorgangTitel: meta?.titel ?? "Vorgang",
      vorgangDatum: meta?.datum?.slice(0, 10) ?? "",
      status: meta?.statusLabel ?? "",
      gewerk: meta?.gewerkLabel ?? "",
      kostentraeger: kostentraegerLabel(r.kostentraeger) || "",
      betragEuro: isStorno || isEntwurf ? null : betrag,
      kostenStatus: isStorno ? "storniert" : winning ? "rechnung" : "offen",
      rechnungNr: r.rechnungsnummer?.trim() ?? "",
      rechnungDatum: datum,
      pdfVerfuegbar: r.pdf_url?.trim() ? "ja" : "nein",
      rechnungId: r.id,
    });
    if (lid) csvLeadDone.add(lid);
  }

  for (const row of historieImZeitraum) {
    if (csvLeadDone.has(row.leadId) && leadsMitRechnung.has(row.leadId)) continue;
    if (leadsMitRechnung.has(row.leadId)) continue;
    const kostenStatus =
      row.kostenEuro != null && row.kostenLabel !== "offen" ? "angebot" : "offen";
    csvRows.push({
      vorgangId: row.leadId.slice(0, 8),
      vorgangTitel: row.titel,
      vorgangDatum: row.datum.slice(0, 10),
      status: row.statusLabel,
      gewerk: row.gewerkLabel ?? "",
      kostentraeger: "",
      betragEuro:
        kostenStatus === "angebot" && row.kostenEuro != null
          ? row.kostenEuro
          : null,
      kostenStatus,
      rechnungNr: "",
      rechnungDatum: "",
      pdfVerfuegbar: "nein",
      rechnungId: "",
    });
  }

  belege.sort((a, b) => b.datum.localeCompare(a.datum));

  return {
    objektTitel: objekt.titel?.trim() || "Objekt",
    objektAdresse: formatObjektAdresse(objekt) || "—",
    von,
    bis,
    gesamtKosten,
    rechnungenAnzahl: winningRechnungen.length,
    offenInArbeit: historieImZeitraum.filter(istOffen).length,
    ohneBetrag,
    nachTraeger: Array.from(traegerMap.entries())
      .map(([traeger, summe]) => ({ traeger, summe }))
      .sort((a, b) => b.summe - a.summe),
    nachGewerk: akte.kpis.nachGewerk,
    belege,
    csvRows,
  };
}
