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
      "id, melder_name, melder_einheit, created_at, hv_meldung_status, vorgang_phase, org_freigabe_status, kunde_objekt_id, auftraggeber_kunde_id, storniert_am"
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

  let orgName = "Hausverwaltung";
  let mieterKontaktTelefon: string | null = null;
  let mieterKontaktEmail: string | null = null;
  let mieterKontaktHinweis: string | null = null;
  if (lead.auftraggeber_kunde_id) {
    const { data: org } = await supabaseAdmin
      .from("kunden")
      .select(
        "name, org_anzeigename, mieter_kontakt_telefon, mieter_kontakt_email, mieter_kontakt_hinweis"
      )
      .eq("id", lead.auftraggeber_kunde_id)
      .maybeSingle();
    orgName =
      String(org?.org_anzeigename ?? org?.name ?? "Hausverwaltung").trim() ||
      "Hausverwaltung";
    mieterKontaktTelefon = (org?.mieter_kontakt_telefon as string | null) ?? null;
    mieterKontaktEmail = (org?.mieter_kontakt_email as string | null) ?? null;
    mieterKontaktHinweis = (org?.mieter_kontakt_hinweis as string | null) ?? null;
  }

  const stufe = resolveMieterStatusStufe(lead, auftragKontext);
  const referenz = String(lead.id).slice(0, 8).toUpperCase();
  const melderName = String(lead.melder_name ?? "Mieter");
  const einheit = lead.melder_einheit ? String(lead.melder_einheit) : null;
  const erledigt = portalErledigtFromLeadAndAuftrag(lead, auftragKontext);

  return (
    <div className="portal-ui min-h-screen bg-surface-page px-4 py-10">
      <MeldeStatusClient
        token={trimmed}
        objektTitel={objektTitel}
        orgName={orgName}
        mieterKontaktTelefon={mieterKontaktTelefon}
        mieterKontaktEmail={mieterKontaktEmail}
        mieterKontaktHinweis={mieterKontaktHinweis}
        melderName={melderName}
        einheit={einheit}
        referenz={referenz}
        initialStufe={stufe}
        erledigt={erledigt}
        anhaenge={anhaenge}
      />
    </div>
  );
}
