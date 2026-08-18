import { notFound } from "next/navigation";

import { MeldeStatusClient } from "@/components/melden/MeldeStatusClient";
import {
  fachdetailRowsFromFunnelDaten,
  normalizeFunnelDaten,
} from "@/lib/lead-funnel-daten";
import { labelSituation } from "@/lib/lead-funnel-labels";
import {
  formatAnfrageBereiche,
  formatAnfrageZeitraum,
} from "@/lib/portal/portal-anfrage-display";
import { loadPortalAuftraegeByLeadIds } from "@/lib/portal/load-auftraege-by-lead-ids";
import { portalErledigtFromLeadAndAuftrag } from "@/lib/portal/vorgang-erledigt";
import { resolveOrgSubLabel } from "@/lib/portal2/brand-presets";
import { resolveMieterStatusStufe } from "@/lib/vorgang/vorgang-phase";
import { supabaseAdmin } from "@/lib/supabase";

type Props = { params: Promise<{ token: string }> };

export default async function MeldeStatusPage({ params }: Props) {
  const { token } = await params;
  const trimmed = token?.trim();
  if (!trimmed) notFound();

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select(
      "id, melder_name, melder_einheit, created_at, hv_meldung_status, vorgang_phase, org_freigabe_status, freigabe_bypass_grund, mieter_vor_ort_at, kunde_objekt_id, auftraggeber_kunde_id, storniert_am, kontakt_nachricht, anlass, funnel_daten, situation, bereiche, zeitraum, plz, strasse, hausnummer, geloescht_am"
    )
    .eq("melde_tracking_token", trimmed)
    .maybeSingle();

  if (!lead) notFound();
  if ((lead as { geloescht_am?: string | null }).geloescht_am) notFound();

  const { kontextByLeadId, auftragIdByLeadId } = await loadPortalAuftraegeByLeadIds([
    String(lead.id),
  ]);
  const auftragKontext = kontextByLeadId[String(lead.id)] ?? null;
  const auftragId = auftragIdByLeadId[String(lead.id)] ?? null;

  const anhaenge: Array<{ id: string; name: string; datum?: string; href: string }> =
    [];
  if (auftragId) {
    const { data: protokolle } = await supabaseAdmin
      .from("auftrag_abnahmeprotokolle")
      .select("id, abnahme_datum, pdf_url, created_at, an_kunde_gesendet_at")
      .eq("auftrag_id", auftragId)
      .order("created_at", { ascending: false });
    for (const p of protokolle ?? []) {
      const href = String((p as { pdf_url?: string }).pdf_url ?? "").trim();
      if (!href) continue;
      anhaenge.push({
        id: String((p as { id: string }).id),
        name: "Abnahmeprotokoll",
        datum:
          (p as { abnahme_datum?: string | null }).abnahme_datum ??
          (p as { created_at?: string | null }).created_at ??
          undefined,
        href,
      });
    }
  }

  let objektTitel = "Objekt";
  let objektOrt: string | null = null;
  let objektPlz: string | null =
    typeof lead.plz === "string" ? lead.plz.trim() || null : null;
  if (lead.kunde_objekt_id) {
    const { data: obj } = await supabaseAdmin
      .from("kunden_objekte")
      .select("titel, ort, plz")
      .eq("id", lead.kunde_objekt_id)
      .maybeSingle();
    objektTitel = String(obj?.titel ?? "Objekt");
    objektOrt = (obj?.ort as string | null)?.trim() || null;
    if (!objektPlz && obj?.plz) {
      objektPlz = String(obj.plz).trim() || null;
    }
  }

  let brand = {
    name: "Verwaltung",
    sub: "Verwaltung" as string | null,
    logoUrl: null as string | null,
    logoKuerzel: null as string | null,
    primary: null as string | null,
    primaryDk: null as string | null,
    soft: null as string | null,
    tel: null as string | null,
    mail: null as string | null,
  };

  if (lead.auftraggeber_kunde_id) {
    let org: Record<string, unknown> | null = null;
    const full = await supabaseAdmin
      .from("kunden")
      .select(
        "name, org_anzeigename, org_sub, org_logo_url, org_logo_kuerzel, mieter_kontakt_telefon, mieter_kontakt_email, mieter_kontakt_hinweis, org_primary_color, org_primary_color_dk, org_primary_color_soft"
      )
      .eq("id", lead.auftraggeber_kunde_id)
      .maybeSingle();
    if (full.error) {
      const legacy = await supabaseAdmin
        .from("kunden")
        .select(
          "name, org_anzeigename, org_logo_url, mieter_kontakt_telefon, mieter_kontakt_email, mieter_kontakt_hinweis, org_primary_color"
        )
        .eq("id", lead.auftraggeber_kunde_id)
        .maybeSingle();
      org = (legacy.data as Record<string, unknown> | null) ?? null;
    } else {
      org = (full.data as Record<string, unknown> | null) ?? null;
    }
    brand = {
      name:
        String(org?.org_anzeigename ?? org?.name ?? "Verwaltung").trim() ||
        "Verwaltung",
      sub: resolveOrgSubLabel(org?.org_sub as string | null),
      logoUrl: (org?.org_logo_url as string | null) ?? null,
      logoKuerzel: (org?.org_logo_kuerzel as string | null) ?? null,
      primary: (org?.org_primary_color as string | null) ?? null,
      primaryDk: (org?.org_primary_color_dk as string | null) ?? null,
      soft: (org?.org_primary_color_soft as string | null) ?? null,
      tel: (org?.mieter_kontakt_telefon as string | null) ?? null,
      mail: (org?.mieter_kontakt_email as string | null) ?? null,
    };
  }

  const stufe = resolveMieterStatusStufe(lead, auftragKontext);
  const referenz = String(lead.id).slice(0, 8).toUpperCase();
  const melderName = String(lead.melder_name ?? "Mieter");
  const einheit = lead.melder_einheit ? String(lead.melder_einheit) : null;
  const erledigt = portalErledigtFromLeadAndAuftrag(lead, auftragKontext);
  const beschreibung =
    typeof lead.kontakt_nachricht === "string"
      ? lead.kontakt_nachricht.trim() || null
      : null;

  const bereiche = Array.isArray(lead.bereiche)
    ? (lead.bereiche as string[])
    : null;
  const anfrageSource = {
    situation: lead.situation as string | null,
    bereiche,
    funnel_daten: lead.funnel_daten,
    zeitraum: lead.zeitraum as string | null,
    plz: objektPlz,
    strasse: lead.strasse as string | null,
    hausnummer: lead.hausnummer as string | null,
    ort: objektOrt,
  };
  const norm = normalizeFunnelDaten(lead.funnel_daten, bereiche);
  const situationSlug =
    norm.situation || (lead.situation as string | null) || undefined;
  const meldeSituation =
    situationSlug && labelSituation(situationSlug) !== "—"
      ? labelSituation(situationSlug)
      : null;
  const meldeBereich = formatAnfrageBereiche(anfrageSource) ?? null;
  const meldeZeitraum = formatAnfrageZeitraum(anfrageSource) ?? null;
  const meldeFachdetails = fachdetailRowsFromFunnelDaten(
    lead.funnel_daten,
    bereiche
  );
  const fd = lead.funnel_daten as { fotos?: unknown } | null | undefined;
  const fotos = Array.isArray(fd?.fotos)
    ? fd.fotos.filter(
        (u): u is string => typeof u === "string" && /^https?:\/\//i.test(u)
      )
    : [];
  const meldeStrasse =
    [lead.strasse, lead.hausnummer].filter(Boolean).join(" ").trim() || null;

  return (
    <MeldeStatusClient
      brand={brand}
      token={trimmed}
      objektTitel={objektTitel}
      melderName={melderName}
      einheit={einheit}
      referenz={referenz}
      initialStufe={stufe}
      erledigt={erledigt}
      anhaenge={anhaenge}
      beschreibung={beschreibung}
      meldeDetail={{
        meldeStrasse,
        meldePlz: objektPlz,
        meldeOrt: objektOrt,
        meldeSituation,
        meldeBereich,
        meldeZeitraum,
        meldeFachdetails,
        fotos,
      }}
    />
  );
}
