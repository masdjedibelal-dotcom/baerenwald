import { notFound } from "next/navigation";

import { MeldeStatusClient } from "@/components/melden/MeldeStatusClient";
import { loadPortalAuftraegeByLeadIds } from "@/lib/portal/load-auftraege-by-lead-ids";
import { portalErledigtFromLeadAndAuftrag } from "@/lib/portal/vorgang-erledigt";
import { resolveMieterStatusStufe } from "@/lib/vorgang/vorgang-phase";
import { resolvePartnerFileUrl } from "@/lib/partner/partner-storage";
import { supabaseAdmin } from "@/lib/supabase";

type Props = { params: Promise<{ token: string }> };

export default async function MeldeStatusPage({ params }: Props) {
  const { token } = await params;
  const trimmed = token?.trim();
  if (!trimmed) notFound();

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select(
      "id, melder_name, melder_einheit, created_at, hv_meldung_status, vorgang_phase, org_freigabe_status, kunde_objekt_id, auftraggeber_kunde_id, storniert_am, kontakt_nachricht, anlass"
    )
    .eq("melde_tracking_token", trimmed)
    .maybeSingle();

  if (!lead) notFound();

  const { kontextByLeadId, auftragIdByLeadId } = await loadPortalAuftraegeByLeadIds([
    String(lead.id),
  ]);
  const auftragKontext = kontextByLeadId[String(lead.id)] ?? null;
  const auftragId = auftragIdByLeadId[String(lead.id)] ?? null;

  const anhaenge: Array<{ id: string; name: string; datum?: string; href: string }> =
    [];
  if (auftragId) {
    const { data: protokolle } = await supabaseAdmin
      .from("abnahme_protokolle")
      .select("id, abnahme_datum, pdf_path, created_at")
      .eq("auftrag_id", auftragId)
      .order("created_at", { ascending: false });
    for (const p of protokolle ?? []) {
      const path = String((p as { pdf_path?: string }).pdf_path ?? "").trim();
      const href = path ? await resolvePartnerFileUrl(path) : null;
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
      sub: (org?.org_sub as string | null) ?? "Verwaltung",
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
    />
  );
}
