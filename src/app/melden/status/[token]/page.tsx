import { notFound } from "next/navigation";

import {
  mieterStatusLabel,
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
      "id, melder_name, melder_einheit, created_at, hv_meldung_status, vorgang_phase, org_freigabe_status, kunde_objekt_id, auftraggeber_kunde_id"
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
  const label = mieterStatusLabel(stufe);
  const referenz = String(lead.id).slice(0, 8).toUpperCase();
  const melderName = String(lead.melder_name ?? "Mieter");
  const einheit = lead.melder_einheit ? String(lead.melder_einheit) : null;

  return (
    <div className="portal-ui min-h-screen bg-surface-page px-4 py-10">
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <p className="text-sm text-text-tertiary">Status deiner Meldung</p>
          <h1 className="mt-1 text-xl font-semibold text-text-primary">{objektTitel}</h1>
          {einheit ? (
            <p className="text-sm text-text-secondary">Einheit {einheit}</p>
          ) : null}
        </div>

        <article className="card-bordered space-y-4 p-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
              Aktueller Status
            </p>
            <p className="mt-1 text-lg font-semibold text-accent">{label}</p>
          </div>
          <div className="border-t border-border-default pt-4 text-sm text-text-secondary">
            <p>Hallo {melderName},</p>
            <p className="mt-2">
              {orgName} und Bärenwald bearbeiten deine Meldung. Bei Rückfragen nenn
              bitte die Referenz <span className="font-mono font-medium">{referenz}</span>.
            </p>
          </div>
        </article>

        <p className="text-center text-xs text-text-tertiary">
          Bärenwald München · Hausverwaltungs-Service
        </p>
      </div>
    </div>
  );
}
