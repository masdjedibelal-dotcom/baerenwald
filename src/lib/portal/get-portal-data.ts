import { buildAngebotPortalDisplay } from "@/lib/portal/portal-display";
import {
  dokumenteFromAngebot,
  dokumenteFromAuftrag,
  dokumenteFromUrls,
} from "@/lib/portal/portal-dokumente";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

type PortalPositionRow = {
  id: string;
  auftrag_id: string;
  gewerk_name: string | null;
  leistung_name: string | null;
  beschreibung: string | null;
  status: string | null;
};

type PortalBautagebuchRow = {
  id: string;
  auftrag_id: string;
  datum: string | null;
  titel: string | null;
  notizen: string | null;
  fotos_urls: string[] | null;
};

type PortalAngebotRow = {
  id: string;
  angebotsnr: string | null;
  lead_id: string | null;
  status_einfach: string | null;
  gesamt_fix: number | null;
  gesamt_min: number | null;
  gesamt_max: number | null;
  gueltig_bis: string | null;
  leistungsumfang: string | null;
  notizen: string | null;
  created_at: string | null;
  gesendet_am: string | null;
  pdf_url: string | null;
};

type PortalRechnungRow = {
  id: string;
  auftrag_id: string;
  rechnungsnummer: string | null;
  pdf_url: string | null;
  status: string | null;
  rechnungsdatum: string | null;
  gesendet_at: string | null;
};

type PortalTimelineRow = {
  id: string;
  auftrag_id: string;
  titel: string | null;
  beschreibung: string | null;
  foto_urls: string[] | null;
  created_at: string | null;
  fuer_kunde_freigegeben: boolean | null;
};

function extractUrlsFromUnknown(value: unknown): string[] {
  const out = new Set<string>();
  const visit = (node: unknown) => {
    if (!node) return;
    if (typeof node === "string") {
      const direct = node.trim();
      if (/^https?:\/\//i.test(direct)) out.add(direct);
      const matches = node.match(/https?:\/\/[^\s)"']+/gi) ?? [];
      matches.forEach((m) => out.add(m.trim()));
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (typeof node === "object") {
      Object.values(node as Record<string, unknown>).forEach(visit);
    }
  };
  visit(value);
  return Array.from(out);
}

export async function getPortalDataForKunde(kundeId: string) {
  if (!isSupabaseConfigured()) return null;

  const id = kundeId.trim();
  if (!id) return null;

  const { data: kunde } = await supabaseAdmin
    .from("kunden")
    .select("id, name, email, plz, auth_user_id")
    .eq("id", id)
    .maybeSingle();

  if (!kunde) return null;

  const { data: leads } = await supabaseAdmin
    .from("leads")
    .select(
      "id, situation, bereiche, status, created_at, plz, preis_min, preis_max, budget_ca, kontakt_nachricht, funnel_daten"
    )
    .eq("kunde_id", kunde.id)
    .order("created_at", { ascending: false });

  const leadIds = (leads ?? []).map((l) => l.id);

  const auftragSelect =
    "id, titel, status, fortschritt, budget, start_datum, end_datum, abnahme_datum, abnahme_protokoll_url, naechster_schritt, phasen, created_at, lead_id, kunde_id, angebot_id, updated_at";

  const { data: auftraegeByKunde } = await supabaseAdmin
    .from("auftraege")
    .select(auftragSelect)
    .eq("kunde_id", kunde.id)
    .order("created_at", { ascending: false });

  const { data: auftraegeByLead } =
    leadIds.length > 0
      ? await supabaseAdmin
          .from("auftraege")
          .select(auftragSelect)
          .in("lead_id", leadIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const auftraegeById = new Map<string, Record<string, unknown>>();
  for (const row of [...(auftraegeByKunde ?? []), ...(auftraegeByLead ?? [])]) {
    auftraegeById.set(String(row.id), row as Record<string, unknown>);
  }
  const auftraege = Array.from(auftraegeById.values()).sort((a, b) => {
    const ta = new Date(String(a.created_at ?? 0)).getTime();
    const tb = new Date(String(b.created_at ?? 0)).getTime();
    return tb - ta;
  });

  const auftragIds = auftraege.map((a) => String(a.id));

  const { data: positionen } =
    auftragIds.length > 0
      ? await supabaseAdmin
          .from("auftrag_positionen")
          .select(
            "id, auftrag_id, gewerk_name, leistung_name, beschreibung, status, menge, einheit, fuer_kunde_sichtbar"
          )
          .in("auftrag_id", auftragIds)
          .eq("fuer_kunde_sichtbar", true)
      : { data: [] as PortalPositionRow[] };

  const { data: bautagebuch } =
    auftragIds.length > 0
      ? await supabaseAdmin
          .from("bautagebuch")
          .select(
            "id, auftrag_id, datum, titel, notizen, fotos_urls, fuer_kunde_sichtbar"
          )
          .in("auftrag_id", auftragIds)
          .eq("fuer_kunde_sichtbar", true)
          .order("datum", { ascending: false })
      : { data: [] as PortalBautagebuchRow[] };

  const { data: angebote } =
    leadIds.length > 0
      ? await supabaseAdmin
          .from("angebote")
          .select(
            "id, angebotsnr, lead_id, status_einfach, gesamt_fix, gesamt_min, gesamt_max, gueltig_bis, leistungsumfang, notizen, created_at, gesendet_am, pdf_url"
          )
          .in("lead_id", leadIds)
          .order("created_at", { ascending: false })
      : { data: [] as PortalAngebotRow[] };

  const { data: rechnungen } =
    auftragIds.length > 0
      ? await supabaseAdmin
          .from("rechnungen")
          .select(
            "id, auftrag_id, rechnungsnummer, pdf_url, status, rechnungsdatum, gesendet_at"
          )
          .in("auftrag_id", auftragIds)
      : { data: [] as PortalRechnungRow[] };

  const { data: timeline } =
    auftragIds.length > 0
      ? await supabaseAdmin
          .from("auftrag_timeline")
          .select(
            "id, auftrag_id, titel, beschreibung, foto_urls, created_at, fuer_kunde_freigegeben"
          )
          .in("auftrag_id", auftragIds)
          .eq("fuer_kunde_freigegeben", true)
      : { data: [] as PortalTimelineRow[] };

  const angeboteById = new Map(
    (angebote ?? []).map((a) => [String(a.id), a])
  );

  return {
    kunde,
    auftraege: auftraege.map((a) => {
      const auftragId = String(a.id);
      const bautagebuchFotos = (bautagebuch ?? [])
        .filter((b) => String(b.auftrag_id) === auftragId)
        .flatMap((b) => (Array.isArray(b.fotos_urls) ? b.fotos_urls : []));
      const angebotId =
        typeof a.angebot_id === "string" ? a.angebot_id : undefined;
      const angebot = angebotId ? angeboteById.get(angebotId) : undefined;

      return {
        ...a,
        id: auftragId,
        titel: typeof a.titel === "string" ? a.titel : "Auftrag",
        status: typeof a.status === "string" ? a.status : undefined,
        dokumente: dokumenteFromAuftrag(
          {
            id: auftragId,
            abnahme_protokoll_url:
              typeof a.abnahme_protokoll_url === "string"
                ? a.abnahme_protokoll_url
                : null,
            abnahme_datum:
              typeof a.abnahme_datum === "string" ? a.abnahme_datum : null,
            updated_at:
              typeof a.updated_at === "string" ? a.updated_at : null,
            created_at:
              typeof a.created_at === "string" ? a.created_at : null,
          },
          {
            angebot: angebot ?? null,
            rechnungen: (rechnungen ?? []).filter(
              (r) => String(r.auftrag_id) === auftragId
            ),
            timeline: (timeline ?? []).filter(
              (t) => String(t.auftrag_id) === auftragId
            ),
            bautagebuchFotoUrls: bautagebuchFotos,
          }
        ),
        positionen: (positionen ?? [])
          .filter((p) => String(p.auftrag_id) === String(a.id))
          .map((p) => ({
            id: String(p.id),
            titel: String(p.leistung_name ?? p.gewerk_name ?? "Leistung"),
            beschreibung:
              typeof p.beschreibung === "string" ? p.beschreibung : undefined,
            status: typeof p.status === "string" ? p.status : undefined,
            gewerk_name:
              typeof p.gewerk_name === "string" ? p.gewerk_name : undefined,
            datum: undefined,
            fotos_urls: [],
            bautagebuch: [],
          })),
        bautagebuch: (bautagebuch ?? [])
          .filter((b) => String(b.auftrag_id) === String(a.id))
          .map((b) => ({
            id: String(b.id),
            datum: typeof b.datum === "string" ? b.datum : undefined,
            titel: typeof b.titel === "string" ? b.titel : "Update",
            notiz: typeof b.notizen === "string" ? b.notizen : undefined,
            fotos_urls: Array.isArray(b.fotos_urls) ? b.fotos_urls : [],
          })),
      };
    }),
    angebote: (angebote ?? []).map((a) => {
      const display = buildAngebotPortalDisplay(a);
      return {
        ...a,
        titel: display.titel,
        leistungen: display.leistungen,
        hinweise: display.hinweise,
        betrag:
          typeof a.gesamt_fix === "number"
            ? a.gesamt_fix
            : typeof a.gesamt_max === "number"
              ? a.gesamt_max
              : typeof a.gesamt_min === "number"
                ? a.gesamt_min
                : undefined,
        dokumente: dokumenteFromAngebot({
          id: String(a.id),
          angebotsnr: a.angebotsnr,
          angebotstitel: display.titel,
          pdf_url: a.pdf_url,
          gesendet_am: a.gesendet_am,
          status_einfach: a.status_einfach,
          created_at: a.created_at,
        }),
      };
    }),
    leads: (leads ?? []).map((lead) => ({
      ...lead,
      dokumente: dokumenteFromUrls([
        ...extractUrlsFromUnknown(
          (lead as { funnel_daten?: unknown }).funnel_daten
        ),
        ...extractUrlsFromUnknown(
          (lead as { kontakt_nachricht?: unknown }).kontakt_nachricht
        ),
      ]),
    })),
  };
}
