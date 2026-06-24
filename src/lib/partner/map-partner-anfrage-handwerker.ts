import type { PartnerAnfrageItem } from "@/lib/partner/get-partner-data";
import {
  buildPartnerLeadSource,
  type PartnerKundenObjektRow,
  type PartnerLeadDbRow,
} from "@/lib/partner/partner-lead-source";
import { parseAngebotPositionen } from "@/lib/partner/parse-angebot-positionen";
import { resolveAngebotTitel } from "@/lib/portal/portal-display";

export const PARTNER_LEAD_EMBED = `
  situation,
  bereiche,
  plz,
  strasse,
  hausnummer,
  zeitraum,
  funnel_daten,
  preis_min,
  preis_max,
  budget_ca,
  kontakt_nachricht,
  kunde_objekt_id,
  auftraggeber_kunde_id,
  org_freigabe_status
`;

export const PARTNER_ANGEBOT_EMBED = `
  id,
  angebotsnr,
  notizen,
  positionen,
  gesamt_fix,
  gesamt_min,
  gesamt_max,
  kunde_objekt_id,
  kunden(plz, ort),
  leads(${PARTNER_LEAD_EMBED})
`;

function one<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? (x[0] as T) ?? null : x;
}

type AnhaengeFields = Pick<
  PartnerAnfrageItem,
  | "hw_angebot_pdf_url"
  | "hw_angebot_pdf_signed_url"
  | "hw_angebot_anhang_urls"
  | "hw_angebot_anhang_signed_urls"
>;

export async function mapAngebotHandwerkerRow(
  row: Record<string, unknown>,
  objektById: Map<string, PartnerKundenObjektRow>,
  mapHwAngebotAnhaenge: (raw: Record<string, unknown>) => Promise<AnhaengeFields>,
  resolveRechnungUrl: (path: string | null) => Promise<string | null>
): Promise<PartnerAnfrageItem> {
  const angebote = one(row.angebote) as {
    angebotsnr?: string | null;
    notizen?: string | null;
    positionen: unknown;
    gesamt_fix?: number | null;
    gesamt_min?: number | null;
    gesamt_max?: number | null;
    kunde_objekt_id?: string | null;
    kunden: unknown;
    leads: unknown;
  } | null;
  const gewerkId = String(row.gewerk_id ?? "");
  const gw = one(row.gewerke) as { name: string } | null;
  const kunde = angebote
    ? (one(angebote.kunden) as { plz: string | null; ort: string | null } | null)
    : null;
  const leadRow = angebote
    ? (one(angebote.leads) as PartnerLeadDbRow | null)
    : null;
  const lead = buildPartnerLeadSource({
    lead: leadRow,
    angebotObjektId: angebote?.kunde_objekt_id,
    kundePlz: kunde?.plz,
    kundeOrt: kunde?.ort,
    objektById,
  });
  const pos = parseAngebotPositionen(angebote?.positionen).filter(
    (p) => !gewerkId || p.gewerk_id === gewerkId
  );

  const anhaenge = await mapHwAngebotAnhaenge(row);
  const rechnungPath = (row.hw_rechnung_pdf_url as string | null) ?? null;

  return {
    id: String(row.id),
    angebot_id: String(row.angebot_id),
    status: String(row.status ?? "ausstehend"),
    gewerk_name: gw?.name?.trim() || "Gewerk",
    angebot_titel: resolveAngebotTitel({
      angebotsnr: angebote?.angebotsnr,
      notizen: angebote?.notizen,
    }),
    gesendet_at: (row.gesendet_at as string | null) ?? undefined,
    antwort_at: (row.antwort_at as string | null) ?? undefined,
    antwort_notiz: (row.antwort_notiz as string | null) ?? undefined,
    ablehnung_grund: (row.ablehnung_grund as string | null) ?? undefined,
    aufgabe_notiz: (row.aufgabe_notiz as string | null) ?? undefined,
    plz: lead?.objekt?.plz?.trim() || kunde?.plz?.trim() || lead?.plz?.trim() || "—",
    ort: lead?.objekt?.ort?.trim() || kunde?.ort?.trim() || "—",
    zeitraum: lead?.zeitraum?.trim() || leadRow?.zeitraum?.trim() || "",
    positionen: pos.map((p) => ({
      beschreibung: (p.beschreibung || p.leistung).trim(),
      menge: p.menge,
      einheit: p.einheit,
    })),
    lead,
    crm_positionen_raw: angebote?.positionen,
    crm_gesamt_fix:
      angebote?.gesamt_fix != null ? Number(angebote.gesamt_fix) : null,
    crm_gesamt_min:
      angebote?.gesamt_min != null ? Number(angebote.gesamt_min) : null,
    crm_gesamt_max:
      angebote?.gesamt_max != null ? Number(angebote.gesamt_max) : null,
    hw_status: (row.hw_status as string | null) ?? undefined,
    hw_eingereicht_at: (row.hw_eingereicht_at as string | null) ?? undefined,
    hw_preis_netto: row.hw_preis_netto != null ? Number(row.hw_preis_netto) : null,
    hw_preis_brutto:
      row.hw_preis_brutto != null ? Number(row.hw_preis_brutto) : null,
    ...anhaenge,
    hw_rechnung_pdf_url: rechnungPath,
    hw_rechnung_pdf_signed_url: rechnungPath
      ? await resolveRechnungUrl(rechnungPath)
      : null,
    hw_rechnung_eingereicht_at:
      (row.hw_rechnung_eingereicht_at as string | null) ?? undefined,
    hw_notiz: (row.hw_notiz as string | null) ?? null,
    hw_crm_notiz: (row.hw_crm_notiz as string | null) ?? null,
    hw_crm_antwort_at: (row.hw_crm_antwort_at as string | null) ?? undefined,
  };
}
