import { notFound } from "next/navigation";

import { MeldeStatusClient } from "@/components/melden/MeldeStatusClient";
import {
  resolveMieterStatusStufe,
} from "@/lib/vorgang/vorgang-phase";
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
  if (lead.auftraggeber_kunde_id) {
    const { data: org } = await supabaseAdmin
      .from("kunden")
      .select("name, org_anzeigename")
      .eq("id", lead.auftraggeber_kunde_id)
      .maybeSingle();
    orgName =
      String(org?.org_anzeigename ?? org?.name ?? "Hausverwaltung").trim() ||
      "Hausverwaltung";
  }

  const stufe = resolveMieterStatusStufe(lead);
  const referenz = String(lead.id).slice(0, 8).toUpperCase();
  const melderName = String(lead.melder_name ?? "Mieter");
  const einheit = lead.melder_einheit ? String(lead.melder_einheit) : null;
  const erledigt =
    lead.vorgang_phase === "abgeschlossen" ||
    lead.hv_meldung_status === "abgeschlossen";

  return (
    <div className="portal-ui min-h-screen bg-surface-page px-4 py-10">
      <MeldeStatusClient
        token={trimmed}
        objektTitel={objektTitel}
        orgName={orgName}
        melderName={melderName}
        einheit={einheit}
        referenz={referenz}
        initialStufe={stufe}
        erledigt={erledigt}
      />
    </div>
  );
}
