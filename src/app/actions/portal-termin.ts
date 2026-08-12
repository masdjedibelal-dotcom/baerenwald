"use server";

import { revalidatePath } from "next/cache";

import { linkPortalKundeToAuthUser } from "@/lib/portal/link-portal-kunde";
import { auftragGehoertKunde } from "@/lib/portal/portal-kunde-auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type PortalTerminActionResult = { ok: true } | { ok: false; error: string };

async function assertKundeAuftrag(auftragId: string) {
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

  const gehoert = await auftragGehoertKunde(auftragId, link.kundeId);
  if (!gehoert) {
    return { ok: false as const, error: "Du hast keinen Zugriff auf diesen Vorgang." };
  }

  return { ok: true as const };
}

export async function confirmPortalTerminSlot(
  auftragId: string,
  slotId: string
): Promise<PortalTerminActionResult> {
  const id = auftragId.trim();
  const sid = slotId.trim();
  if (!id || !sid) return { ok: false, error: "Ungültige Parameter." };

  const auth = await assertKundeAuftrag(id);
  if (!auth.ok) return auth;

  const { data: slot } = await supabaseAdmin
    .from("auftrag_terminslots")
    .select("id, auftrag_id, status")
    .eq("id", sid)
    .maybeSingle();

  if (!slot || String(slot.auftrag_id) !== id) {
    return { ok: false, error: "Termin nicht gefunden." };
  }

  const now = new Date().toISOString();

  await supabaseAdmin
    .from("auftrag_terminslots")
    .update({
      status: "abgesagt",
      abgesagt_am: now,
      absage_grund: "durch anderen Slot ersetzt",
    })
    .eq("auftrag_id", id)
    .eq("status", "bestaetigt");

  const { error } = await supabaseAdmin
    .from("auftrag_terminslots")
    .update({ status: "bestaetigt", bestaetigt_am: now })
    .eq("id", sid);

  if (error) {
    console.error("[confirmPortalTerminSlot]", error.message);
    return { ok: false, error: "Termin konnte nicht bestätigt werden." };
  }

  revalidatePath("/portal");
  return { ok: true };
}

export async function declinePortalTerminSlot(
  auftragId: string,
  slotId: string,
  absageGrund?: string
): Promise<PortalTerminActionResult> {
  const id = auftragId.trim();
  const sid = slotId.trim();
  if (!id || !sid) return { ok: false, error: "Ungültige Parameter." };

  const auth = await assertKundeAuftrag(id);
  if (!auth.ok) return auth;

  const { data: slot } = await supabaseAdmin
    .from("auftrag_terminslots")
    .select("id, auftrag_id")
    .eq("id", sid)
    .maybeSingle();

  if (!slot || String(slot.auftrag_id) !== id) {
    return { ok: false, error: "Termin nicht gefunden." };
  }

  const now = new Date().toISOString();
  const grund = absageGrund?.trim() || "Mieter abgesagt";
  const { error } = await supabaseAdmin
    .from("auftrag_terminslots")
    .update({ status: "abgesagt", abgesagt_am: now, absage_grund: grund })
    .eq("id", sid);

  if (error) {
    console.error("[declinePortalTerminSlot]", error.message);
    return { ok: false, error: "Termin konnte nicht abgesagt werden." };
  }

  revalidatePath("/portal");
  return { ok: true };
}
