"use server";

import { revalidatePath } from "next/cache";

import { linkPortalKundeToAuthUser } from "@/lib/portal/link-portal-kunde";
import { vorgangFeedbackBereit } from "@/lib/portal/vorgang-feedback-eligibility";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type PortalFeedbackResult = { ok: true } | { ok: false; error: string };

async function assertKundeLead(leadId: string) {
  if (!isSupabaseConfigured()) {
    return { ok: false as const, error: "Portal ist nicht konfiguriert." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false as const, error: "Bitte melde dich an." };
  }

  const link = await linkPortalKundeToAuthUser({
    userId: user.id,
    email: user.email,
  });
  if (!link.ok) return { ok: false as const, error: link.error };

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("id, kunde_id, vorgang_phase, hv_meldung_status")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead || String(lead.kunde_id) !== link.kundeId) {
    return { ok: false as const, error: "Vorgang nicht gefunden." };
  }

  return { ok: true as const, lead };
}

/** Mieter-Feedback im eingeloggten Portal (nach HW-Abschluss oder CRM-Abschluss). */
export async function submitPortalMieterFeedback(input: {
  leadId: string;
  sterne: number;
  freitext?: string;
}): Promise<PortalFeedbackResult> {
  const leadId = input.leadId.trim();
  const sterne = Number(input.sterne);
  const freitext = String(input.freitext ?? "").trim() || null;

  if (!leadId || !Number.isFinite(sterne) || sterne < 1 || sterne > 5) {
    return { ok: false, error: "Bewertung (1–5) erforderlich." };
  }

  const auth = await assertKundeLead(leadId);
  if (!auth.ok) return auth;

  const { data: auftrag } = await supabaseAdmin
    .from("auftraege")
    .select("id, status, fortschritt")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: positionen } = auftrag
    ? await supabaseAdmin
        .from("auftrag_positionen")
        .select("handwerker_id, handwerker_status")
        .eq("auftrag_id", auftrag.id)
    : { data: [] as Array<{ handwerker_id: string | null; handwerker_status: string | null }> };

  const bereit = vorgangFeedbackBereit({
    leadVorgangPhase: auth.lead.vorgang_phase,
    hv_meldung_status: auth.lead.hv_meldung_status,
    auftragStatus: auftrag?.status,
    auftragFortschritt: auftrag?.fortschritt,
    positionen,
  });

  if (!bereit) {
    return { ok: false, error: "Feedback erst nach Abschluss der Arbeiten möglich." };
  }

  const { error } = await supabaseAdmin.from("mieter_feedback").upsert(
    {
      lead_id: leadId,
      auftrag_id: auftrag?.id ?? null,
      sterne,
      freitext,
    },
    { onConflict: "lead_id" }
  );

  if (error) {
    console.error("[submitPortalMieterFeedback]", error.message);
    return { ok: false, error: "Feedback konnte nicht gespeichert werden." };
  }

  revalidatePath("/portal");
  return { ok: true };
}
