import { notFound } from "next/navigation";

import { PortalClient } from "@/components/portal/PortalClient";
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

async function getPortalData(token: string) {
  if (!isSupabaseConfigured()) return null;

  const portalToken = token.trim();
  if (!portalToken) return null;

  const { data: kunde } = await supabaseAdmin
    .from("kunden")
    .select("id, name, email, plz")
    .eq("portal_token", portalToken)
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

  const { data: auftraege } = await supabaseAdmin
    .from("auftraege")
    .select(
      "id, titel, status, fortschritt, budget, start_datum, end_datum, naechster_schritt, phasen, created_at"
    )
    .eq("kunde_id", kunde.id)
    .order("created_at", { ascending: false });

  const auftragIds = (auftraege ?? []).map((a) => a.id);

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
            "id, angebotsnr, lead_id, status_einfach, gesamt_fix, gesamt_min, gesamt_max, gueltig_bis, leistungsumfang, notizen, created_at, gesendet_am"
          )
          .in("lead_id", leadIds)
          .order("created_at", { ascending: false })
      : { data: [] as PortalAngebotRow[] };

  return {
    kunde,
    auftraege: (auftraege ?? []).map((a) => ({
      ...a,
      positionen: (positionen ?? [])
        .filter((p) => p.auftrag_id === a.id)
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
        .filter((b) => b.auftrag_id === a.id)
        .map((b) => ({
          id: String(b.id),
          datum: typeof b.datum === "string" ? b.datum : undefined,
          titel: typeof b.titel === "string" ? b.titel : "Update",
          notiz: typeof b.notizen === "string" ? b.notizen : undefined,
          fotos_urls: Array.isArray(b.fotos_urls) ? b.fotos_urls : [],
        })),
      anhaenge: (bautagebuch ?? [])
        .filter((b) => b.auftrag_id === a.id)
        .flatMap((b) => (Array.isArray(b.fotos_urls) ? b.fotos_urls : [])),
    })),
    angebote: (angebote ?? []).map((a) => ({
      ...a,
      titel:
        (typeof a.leistungsumfang === "string" && a.leistungsumfang.trim()) ||
        `Angebot ${String(a.angebotsnr ?? a.id)}`,
      betrag:
        typeof a.gesamt_fix === "number"
          ? a.gesamt_fix
          : typeof a.gesamt_max === "number"
            ? a.gesamt_max
            : typeof a.gesamt_min === "number"
              ? a.gesamt_min
              : undefined,
      anhaenge: [
        ...extractUrlsFromUnknown(a.leistungsumfang),
        ...extractUrlsFromUnknown(a.notizen),
      ],
    })),
    leads: (leads ?? []).map((lead) => ({
      ...lead,
      anhaenge: [
        ...extractUrlsFromUnknown((lead as { funnel_daten?: unknown }).funnel_daten),
        ...extractUrlsFromUnknown((lead as { kontakt_nachricht?: unknown }).kontakt_nachricht),
      ],
    })),
  };
}

export default async function PortalPage({
  params,
}: {
  params: { token: string };
}) {
  const data = await getPortalData(params.token);

  if (!data) notFound();

  const { kunde, auftraege, angebote, leads } = data;

  return (
    <PortalClient
      kunde={kunde}
      auftraege={auftraege}
      angebote={angebote}
      leads={leads}
    />
  );
}
