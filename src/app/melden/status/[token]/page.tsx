import { MeldeFehlerClient } from "@/components/melden/MeldeFehlerClient";
import { MeldeStatusClient } from "@/components/melden/MeldeStatusClient";
import {
  fachdetailRowsFromFunnelDaten,
  normalizeFunnelDaten,
} from "@/lib/lead-funnel-daten";
import { labelSituation } from "@/lib/lead-funnel-labels";
import { resolveMeldeLegalUrls } from "@/lib/org/melde-legal-urls";
import {
  formatAnfrageBereiche,
  formatAnfrageZeitraum,
} from "@/lib/portal/portal-anfrage-display";
import { loadPortalAuftraegeByLeadIds } from "@/lib/portal/load-auftraege-by-lead-ids";
import { portalErledigtFromLeadAndAuftrag } from "@/lib/portal/vorgang-erledigt";
import { orgBrandFromKunde, resolveBrandPalette } from "@/lib/portal2/brand-presets";
import {
  MIETER_WL_FEHLER,
  MIETER_WL_STATUS_INAKTIV,
  type MieterWlBrand,
} from "@/lib/portal2/mieter-wl";
import { resolveMieterStatusStufe } from "@/lib/vorgang/vorgang-phase";
import { supabaseAdmin } from "@/lib/supabase";

type Props = { params: Promise<{ token: string }> };

async function loadOrgBrand(
  auftraggeberKundeId: string | null | undefined
): Promise<
  MieterWlBrand & {
    orgKennung: string | null;
    datenschutzUrl: string | null;
    impressumUrl: string | null;
  }
> {
  const fallbackPalette = resolveBrandPalette({});
  const fallback: MieterWlBrand & {
    orgKennung: string | null;
    datenschutzUrl: string | null;
    impressumUrl: string | null;
  } = {
    name: "Verwaltung",
    sub: "Verwaltung",
    logoUrl: null,
    logoKuerzel: null,
    primary: fallbackPalette.primary,
    primaryDk: fallbackPalette.primaryDk,
    soft: fallbackPalette.soft,
    tel: null,
    mail: null,
    orgKennung: null,
    datenschutzUrl: null,
    impressumUrl: null,
  };
  const id = String(auftraggeberKundeId ?? "").trim();
  if (!id) return fallback;

  let org: Record<string, unknown> | null = null;
  const full = await supabaseAdmin
    .from("kunden")
    .select(
      "name, org_anzeigename, org_sub, org_kennung, org_logo_url, org_logo_kuerzel, mieter_kontakt_telefon, mieter_kontakt_email, mieter_kontakt_hinweis, org_primary_color, org_primary_color_dk, org_primary_color_soft, datenschutz_url, impressum_url"
    )
    .eq("id", id)
    .maybeSingle();
  if (full.error) {
    const legacy = await supabaseAdmin
      .from("kunden")
      .select(
        "name, org_anzeigename, org_kennung, org_logo_url, mieter_kontakt_telefon, mieter_kontakt_email, mieter_kontakt_hinweis, org_primary_color, datenschutz_url, impressum_url"
      )
      .eq("id", id)
      .maybeSingle();
    org = (legacy.data as Record<string, unknown> | null) ?? null;
  } else {
    org = (full.data as Record<string, unknown> | null) ?? null;
  }
  if (!org) return fallback;

  const kennung = String(org.org_kennung ?? "")
    .trim()
    .toLowerCase();
  const mapped = orgBrandFromKunde(org);

  return {
    name: mapped.name,
    sub: mapped.sub,
    logoUrl: (org.org_logo_url as string | null) ?? null,
    logoKuerzel: mapped.logo,
    primary: mapped.primary,
    primaryDk: mapped.primaryDk,
    soft: mapped.soft,
    tel: mapped.tel || null,
    mail: mapped.mail || null,
    orgKennung: kennung || null,
    datenschutzUrl: (org.datenschutz_url as string | null) ?? null,
    impressumUrl: (org.impressum_url as string | null) ?? null,
  };
}

function NeutralTokenFehler() {
  return (
    <MeldeFehlerClient
      neutral
      showObjektButton={false}
      title={MIETER_WL_FEHLER.title_de}
      body={MIETER_WL_FEHLER.body_de}
    />
  );
}

export default async function MeldeStatusPage({ params }: Props) {
  const { token } = await params;
  const trimmed = token?.trim();
  if (!trimmed) {
    return <NeutralTokenFehler />;
  }

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select(
      "id, melder_name, melder_einheit, created_at, hv_meldung_status, vorgang_phase, org_freigabe_status, freigabe_bypass_grund, mieter_vor_ort_at, kunde_objekt_id, auftraggeber_kunde_id, storniert_am, kontakt_nachricht, anlass, funnel_daten, situation, bereiche, zeitraum, plz, geloescht_am, status"
    )
    .eq("melde_tracking_token", trimmed)
    .maybeSingle();

  /* Hard-Delete / Token unbekannt — neutral, ohne Org-/BW-Branding (F-012/F-014) */
  if (!lead) {
    return <NeutralTokenFehler />;
  }

  /* Soft-Delete — Whitelabel der Org, Token bleibt für Restore nutzbar (F-013) */
  if ((lead as { geloescht_am?: string | null }).geloescht_am) {
    const agId = String(lead.auftraggeber_kunde_id ?? "").trim();
    if (!agId) {
      return <NeutralTokenFehler />;
    }
    const brand = await loadOrgBrand(agId);
    const { orgKennung, datenschutzUrl: _d, impressumUrl: _i, ...wlBrand } =
      brand;
    void _d;
    void _i;
    return (
      <MeldeFehlerClient
        brand={wlBrand}
        showOrgContact
        showObjektButton={Boolean(orgKennung)}
        objektAuswahlHref={orgKennung ? `/melden/${orgKennung}` : null}
        title={MIETER_WL_STATUS_INAKTIV.title_de}
        body={MIETER_WL_STATUS_INAKTIV.body_de}
      />
    );
  }

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
  if (lead.kunde_objekt_id) {
    const { data: obj } = await supabaseAdmin
      .from("kunden_objekte")
      .select("titel")
      .eq("id", lead.kunde_objekt_id)
      .maybeSingle();
    objektTitel = String(obj?.titel ?? "Objekt");
  }

  const brandFull = await loadOrgBrand(lead.auftraggeber_kunde_id as string | null);
  const { orgKennung, datenschutzUrl, impressumUrl, ...brand } = brandFull;
  const legal = resolveMeldeLegalUrls({
    meldeSlug: orgKennung,
    datenschutz_url: datenschutzUrl,
    impressum_url: impressumUrl,
  });

  const stufe = resolveMieterStatusStufe(lead, auftragKontext);
  const referenz = String(lead.id).slice(0, 8).toUpperCase();
  /* Datensparsamkeit: nur Vorname im Payload */
  const melderVorname =
    String(lead.melder_name ?? "")
      .trim()
      .split(/\s+/)[0] || "Mieter";
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
    plz: null,
    strasse: null,
    hausnummer: null,
    ort: null,
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

  return (
    <MeldeStatusClient
      brand={brand}
      token={trimmed}
      objektTitel={objektTitel}
      melderName={melderVorname}
      einheit={einheit}
      referenz={referenz}
      initialStufe={stufe}
      erledigt={erledigt}
      anhaenge={anhaenge}
      beschreibung={beschreibung}
      datenschutzHref={legal.datenschutz}
      impressumHref={legal.impressum}
      meldeDetail={{
        /* Adresse = Objekt-Kurzname, keine volle Anschrift */
        meldeStrasse: objektTitel,
        meldePlz: null,
        meldeOrt: null,
        meldeSituation,
        meldeBereich,
        meldeZeitraum,
        meldeFachdetails,
        fotos,
      }}
    />
  );
}
