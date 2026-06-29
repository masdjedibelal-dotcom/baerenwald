"use server";

import { revalidatePath } from "next/cache";

import { linkPortalKundeToAuthUser } from "@/lib/portal/link-portal-kunde";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type AcceptKundeAngebotResult =
  | { ok: true }
  | { ok: false; error: string };

function normalizeStatus(s?: string | null): string {
  return (s ?? "").toLowerCase().replace(/[\s-]+/g, "_");
}

/**
 * Kunde nimmt Angebot im Portal an (status_einfach → kunde_akzeptiert).
 * CRM legt danach den Auftrag an.
 */
export async function acceptKundeAngebot(
  angebotId: string
): Promise<AcceptKundeAngebotResult> {
  const id = angebotId.trim();
  if (!id) return { ok: false, error: "Ungültiges Angebot." };

  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Portal ist nicht konfiguriert." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, error: "Bitte melde dich an." };
  }

  const link = await linkPortalKundeToAuthUser({
    userId: user.id,
    email: user.email,
  });
  if (!link.ok) return { ok: false, error: link.error };

  const { data: angebot, error: loadErr } = await supabaseAdmin
    .from("angebote")
    .select("id, lead_id, kunde_id, status_einfach")
    .eq("id", id)
    .maybeSingle();

  if (loadErr || !angebot) {
    return { ok: false, error: "Angebot wurde nicht gefunden." };
  }

  const kundeId = link.kundeId;
  const angebotKundeId =
    angebot.kunde_id != null ? String(angebot.kunde_id) : null;
  const leadId = angebot.lead_id != null ? String(angebot.lead_id) : null;

  let belongsToKunde = angebotKundeId === kundeId;
  if (!belongsToKunde && leadId) {
    const { data: lead } = await supabaseAdmin
      .from("leads")
      .select("kunde_id")
      .eq("id", leadId)
      .maybeSingle();
    belongsToKunde = lead?.kunde_id != null && String(lead.kunde_id) === kundeId;
  }

  if (!belongsToKunde) {
    return { ok: false, error: "Du hast keinen Zugriff auf dieses Angebot." };
  }

  const status = normalizeStatus(angebot.status_einfach);
  if (status !== "gesendet") {
    if (status === "kunde_akzeptiert" || status === "angenommen") {
      return { ok: true };
    }
    return {
      ok: false,
      error: "Dieses Angebot kann derzeit nicht angenommen werden.",
    };
  }

  const { data: existingAuftrag } = await supabaseAdmin
    .from("auftraege")
    .select("id")
    .eq("angebot_id", id)
    .maybeSingle();

  if (existingAuftrag?.id) {
    return { ok: false, error: "Zu diesem Angebot existiert bereits ein Auftrag." };
  }

  const now = new Date().toISOString();
  const { error: upErr } = await supabaseAdmin
    .from("angebote")
    .update({
      status_einfach: "kunde_akzeptiert",
      updated_at: now,
    })
    .eq("id", id);

  if (upErr) {
    console.error("[acceptKundeAngebot]", upErr.message);
    return { ok: false, error: "Annahme konnte nicht gespeichert werden." };
  }

  if (leadId) {
    await supabaseAdmin
      .from("leads")
      .update({ status: "kunde_akzeptiert", updated_at: now })
      .eq("id", leadId);
  }

  revalidatePath("/portal");
  return { ok: true };
}
