import {
  aggregateAuftragHandwerkerStatus,
  resolveAngebotHandwerkerPhase,
  resolveAuftragPortalPhase,
  type PartnerPortalPhase,
} from "@/lib/partner/partner-portal-phase";
import { parseAngebotPositionen } from "@/lib/partner/parse-angebot-positionen";
import {
  resolvePartnerFileUrl,
  resolvePartnerFileUrls,
} from "@/lib/partner/partner-storage";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type PartnerAnfrageItem = {
  id: string;
  angebot_id: string;
  status: string;
  gewerk_name: string;
  gesendet_at?: string | null;
  antwort_at?: string | null;
  antwort_notiz?: string;
  ablehnung_grund?: string;
  aufgabe_notiz?: string;
  plz: string;
  ort: string;
  zeitraum: string;
  positionen: Array<{
    beschreibung: string;
    menge: number;
    einheit?: string;
  }>;
  hw_status?: string;
  hw_eingereicht_at?: string;
  hw_preis_netto?: number | null;
  hw_preis_brutto?: number | null;
  hw_angebot_pdf_url?: string | null;
  hw_angebot_pdf_signed_url?: string | null;
  hw_rechnung_pdf_url?: string | null;
  hw_rechnung_pdf_signed_url?: string | null;
  hw_rechnung_eingereicht_at?: string;
  hw_notiz?: string | null;
};

export type PartnerAuftragPosition = {
  id: string;
  gewerk_name: string;
  leistung_name: string;
  beschreibung: string | null;
  menge: number | null;
  einheit: string | null;
};

export type PartnerBautagebuchItem = {
  id: string;
  titel: string;
  beschreibung: string | null;
  datum: string;
  foto_urls: string[];
  foto_signed_urls: string[];
  fuer_kunde_freigegeben: boolean;
  own: boolean;
  handwerker_id: string | null;
};

export type PartnerAuftragItem = {
  id: string;
  titel: string;
  status: string;
  fortschritt: number | null;
  start_datum: string | null;
  plz: string;
  ort: string;
  positionen: PartnerAuftragPosition[];
  bautagebuch: PartnerBautagebuchItem[];
  /** Server-seitige Menü-Zuordnung (anfrage | auftrag). */
  portalPhase: PartnerPortalPhase;
  /** Aggregierter Zuweisungs-Status dieses Handwerkers am Auftrag. */
  hwStatus: string;
};

function one<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? (x[0] as T) ?? null : x;
}

function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter(Boolean)));
}

export async function getPartnerDataForHandwerker(handwerkerId: string) {
  if (!isSupabaseConfigured()) return null;

  const id = handwerkerId.trim();
  if (!id) return null;

  const { data: handwerker } = await supabaseAdmin
    .from("handwerker")
    .select("id, name, firma, email, telefon")
    .eq("id", id)
    .maybeSingle();

  if (!handwerker) return null;

  const { data: rows } = await supabaseAdmin
    .from("angebot_handwerker")
    .select(
      `
      id,
      angebot_id,
      gewerk_id,
      status,
      gesendet_at,
      antwort_at,
      antwort_notiz,
      ablehnung_grund,
      aufgabe_notiz,
      hw_status,
      hw_eingereicht_at,
      hw_preis_netto,
      hw_preis_brutto,
      hw_angebot_pdf_url,
      hw_rechnung_pdf_url,
      hw_rechnung_eingereicht_at,
      hw_notiz,
      gewerke(name),
      angebote(
        id,
        positionen,
        kunden(plz, ort),
        leads(zeitraum, plz)
      )
    `
    )
    .eq("handwerker_id", id)
    .order("gesendet_at", { ascending: false });

  const anfragen: PartnerAnfrageItem[] = await Promise.all(
    (rows ?? []).map(async (row) => {
      const raw = row as Record<string, unknown>;
      const angebote = one(raw.angebote) as {
        positionen: unknown;
        kunden: unknown;
        leads: unknown;
      } | null;
      const gewerkId = String(raw.gewerk_id ?? "");
      const gw = one(raw.gewerke) as { name: string } | null;
      const kunde = angebote
        ? (one(angebote.kunden) as { plz: string | null; ort: string | null } | null)
        : null;
      const lead = angebote
        ? (one(angebote.leads) as { zeitraum: string | null; plz: string | null } | null)
        : null;
      const pos = parseAngebotPositionen(angebote?.positionen).filter(
        (p) => !gewerkId || p.gewerk_id === gewerkId
      );

      const pdfPath = (raw.hw_angebot_pdf_url as string | null) ?? null;
      const rechnungPath = (raw.hw_rechnung_pdf_url as string | null) ?? null;

      return {
        id: String(raw.id),
        angebot_id: String(raw.angebot_id),
        status: String(raw.status ?? "ausstehend"),
        gewerk_name: gw?.name?.trim() || "Gewerk",
        gesendet_at: (raw.gesendet_at as string | null) ?? undefined,
        antwort_at: (raw.antwort_at as string | null) ?? undefined,
        antwort_notiz: (raw.antwort_notiz as string | null) ?? undefined,
        ablehnung_grund: (raw.ablehnung_grund as string | null) ?? undefined,
        aufgabe_notiz: (raw.aufgabe_notiz as string | null) ?? undefined,
        plz: kunde?.plz?.trim() || lead?.plz?.trim() || "—",
        ort: kunde?.ort?.trim() || "—",
        zeitraum: lead?.zeitraum?.trim() || "",
        positionen: pos.map((p) => ({
          beschreibung: (p.beschreibung || p.leistung).trim(),
          menge: p.menge,
          einheit: p.einheit,
        })),
        hw_status: (raw.hw_status as string | null) ?? undefined,
        hw_eingereicht_at: (raw.hw_eingereicht_at as string | null) ?? undefined,
        hw_preis_netto: raw.hw_preis_netto != null ? Number(raw.hw_preis_netto) : null,
        hw_preis_brutto: raw.hw_preis_brutto != null ? Number(raw.hw_preis_brutto) : null,
        hw_angebot_pdf_url: pdfPath,
        hw_angebot_pdf_signed_url: pdfPath
          ? await resolvePartnerFileUrl(pdfPath)
          : null,
        hw_rechnung_pdf_url: rechnungPath,
        hw_rechnung_pdf_signed_url: rechnungPath
          ? await resolvePartnerFileUrl(rechnungPath)
          : null,
        hw_rechnung_eingereicht_at:
          (raw.hw_rechnung_eingereicht_at as string | null) ?? undefined,
        hw_notiz: (raw.hw_notiz as string | null) ?? null,
      };
    })
  );

  const { data: hwAuftraege } = await supabaseAdmin
    .from("auftrag_handwerker")
    .select("auftrag_id, status")
    .eq("handwerker_id", id);

  const { data: posAuftraege } = await supabaseAdmin
    .from("auftrag_positionen")
    .select("auftrag_id, handwerker_status")
    .eq("handwerker_id", id);

  const hwStatusByAuftrag = new Map<string, string[]>();
  const posStatusByAuftrag = new Map<string, string[]>();

  for (const r of hwAuftraege ?? []) {
    const aid = String((r as { auftrag_id: string }).auftrag_id);
    const list = hwStatusByAuftrag.get(aid) ?? [];
    list.push(String((r as { status?: string }).status ?? "ausstehend"));
    hwStatusByAuftrag.set(aid, list);
  }
  for (const r of posAuftraege ?? []) {
    const aid = String((r as { auftrag_id: string }).auftrag_id);
    const st = (r as { handwerker_status?: string | null }).handwerker_status;
    if (!st?.trim()) continue;
    const list = posStatusByAuftrag.get(aid) ?? [];
    list.push(st);
    posStatusByAuftrag.set(aid, list);
  }

  const auftragIds = uniqueIds([
    ...(hwAuftraege ?? []).map((r) => String((r as { auftrag_id: string }).auftrag_id)),
    ...(posAuftraege ?? []).map((r) => String((r as { auftrag_id: string }).auftrag_id)),
  ]);

  let alleAuftraege: PartnerAuftragItem[] = [];

  if (auftragIds.length) {
    const { data: aufRows } = await supabaseAdmin
      .from("auftraege")
      .select(
        `
        id,
        angebot_id,
        titel,
        status,
        fortschritt,
        start_datum,
        kunden(plz, ort),
        auftrag_positionen(
          id,
          gewerk_name,
          leistung_name,
          beschreibung,
          menge,
          einheit,
          handwerker_id,
          handwerker_status
        )
      `
      )
      .in("id", auftragIds)
      .order("created_at", { ascending: false });

    const { data: btRows } = await supabaseAdmin
      .from("auftrag_bautagebuch_eintraege")
      .select(
        "id, auftrag_id, titel, beschreibung, datum, foto_urls, fuer_kunde_freigegeben, handwerker_id"
      )
      .in("auftrag_id", auftragIds)
      .order("datum", { ascending: false });

    const btByAuftrag = new Map<string, PartnerBautagebuchItem[]>();

    for (const bt of btRows ?? []) {
      const r = bt as Record<string, unknown>;
      const aid = String(r.auftrag_id);
      const paths = Array.isArray(r.foto_urls)
        ? (r.foto_urls as string[]).map((s) => String(s).trim()).filter(Boolean)
        : [];
      const signed = await resolvePartnerFileUrls(paths);
      const item: PartnerBautagebuchItem = {
        id: String(r.id),
        titel: String(r.titel ?? ""),
        beschreibung: (r.beschreibung as string | null) ?? null,
        datum: String(r.datum).slice(0, 10),
        foto_urls: paths,
        foto_signed_urls: signed,
        fuer_kunde_freigegeben: Boolean(r.fuer_kunde_freigegeben),
        own: String(r.handwerker_id ?? "") === id,
        handwerker_id: (r.handwerker_id as string | null) ?? null,
      };
      const list = btByAuftrag.get(aid) ?? [];
      list.push(item);
      btByAuftrag.set(aid, list);
    }

    alleAuftraege = (aufRows ?? []).map((row) => {
      const raw = row as Record<string, unknown>;
      const kunde = one(raw.kunden) as { plz: string | null; ort: string | null } | null;
      const allPos = (raw.auftrag_positionen ?? []) as Array<Record<string, unknown>>;
      const ownPos = allPos.filter((p) => String(p.handwerker_id ?? "") === id);
      const positionen = ownPos.map((p) => ({
        id: String(p.id),
        gewerk_name: String(p.gewerk_name ?? "Gewerk"),
        leistung_name: String(p.leistung_name ?? ""),
        beschreibung: (p.beschreibung as string | null) ?? null,
        menge: p.menge != null ? Number(p.menge) : null,
        einheit: (p.einheit as string | null) ?? null,
      }));

      const aid = String(raw.id);
      const auftragStatus = String(raw.status ?? "—");
      const hwStatus = aggregateAuftragHandwerkerStatus(
        hwStatusByAuftrag.get(aid) ?? [],
        ownPos.map((p) => p.handwerker_status as string | null | undefined)
      );
      const portalPhase = resolveAuftragPortalPhase(auftragStatus, hwStatus);

      return {
        id: aid,
        titel: String(raw.titel ?? "Auftrag").trim() || "Auftrag",
        status: auftragStatus,
        fortschritt:
          raw.fortschritt != null && Number.isFinite(Number(raw.fortschritt))
            ? Number(raw.fortschritt)
            : null,
        start_datum: (raw.start_datum as string | null) ?? null,
        plz: kunde?.plz?.trim() || "—",
        ort: kunde?.ort?.trim() || "—",
        positionen,
        bautagebuch: btByAuftrag.get(aid) ?? [],
        portalPhase,
        hwStatus,
      };
    });
  }

  const anfragenAngebot = anfragen.filter(
    (a) => resolveAngebotHandwerkerPhase(a) === "anfrage"
  );
  const angebote = anfragen.filter(
    (a) => resolveAngebotHandwerkerPhase(a) === "angebot"
  );
  const auftragAnfragen = alleAuftraege.filter((a) => a.portalPhase === "anfrage");
  const auftraege = alleAuftraege.filter((a) => a.portalPhase === "auftrag");

  return {
    handwerker: {
      name: String(handwerker.name ?? "Partner"),
      firma: handwerker.firma as string | null,
      email: handwerker.email as string | null,
    },
    anfragen: anfragenAngebot,
    angebote,
    auftragAnfragen,
    auftraege,
  };
}
