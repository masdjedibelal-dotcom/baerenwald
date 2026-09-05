"use server";

import { revalidatePath } from "next/cache";

import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type PartnerRueckfrageResult = { ok: true } | { ok: false; error: string };

async function partnerAuth() {
  if (!isSupabaseConfigured()) {
    return { ok: false as const, error: "Datenbank nicht konfiguriert." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false as const, error: "Nicht angemeldet." };
  const link = await linkPortalHandwerkerToAuthUser({
    userId: user.id,
    email: user.email,
  });
  if (!link.ok) return { ok: false as const, error: link.error };
  return { ok: true as const, handwerkerId: link.handwerkerId };
}

async function assertPartnerAuftrag(handwerkerId: string, auftragId: string) {
  const { data: hw } = await supabaseAdmin
    .from("auftrag_handwerker")
    .select("auftrag_id")
    .eq("auftrag_id", auftragId)
    .eq("handwerker_id", handwerkerId)
    .limit(1);
  if (hw?.length) return true;
  const { data: pos } = await supabaseAdmin
    .from("auftrag_positionen")
    .select("auftrag_id")
    .eq("auftrag_id", auftragId)
    .eq("handwerker_id", handwerkerId)
    .limit(1);
  return Boolean(pos?.length);
}

/** Partner stellt Rückfrage zum Auftrag. */
export async function createPartnerRueckfrage(
  auftragId: string,
  text: string
): Promise<PartnerRueckfrageResult> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;

  const trimmed = text.trim();
  if (trimmed.length < 10) {
    return { ok: false, error: "Bitte mindestens 10 Zeichen." };
  }

  if (!(await assertPartnerAuftrag(auth.handwerkerId, auftragId))) {
    return { ok: false, error: "Kein Zugriff auf diesen Auftrag." };
  }

  const { error } = await supabaseAdmin.from("auftrag_rueckfragen").insert({
    auftrag_id: auftragId,
    handwerker_id: auth.handwerkerId,
    text: trimmed,
  });

  if (error) return { ok: false, error: error.message };

  await writeAuditEvent({
    entityType: "auftrag",
    entityId: auftragId,
    aktion: "partner_rueckfrage",
    payload: { textLength: trimmed.length },
  });

  revalidatePath("/partner");
  return { ok: true };
}

export type PartnerTerminSlotResult = { ok: true } | { ok: false; error: string };

/** Partner schlägt Termine für Mieter vor. */
export async function createPartnerTerminSlots(
  auftragId: string,
  slots: Array<{ beginn: string; ende?: string }>
): Promise<PartnerTerminSlotResult> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;

  if (!(await assertPartnerAuftrag(auth.handwerkerId, auftragId))) {
    return { ok: false, error: "Kein Zugriff auf diesen Auftrag." };
  }

  const valid = slots.filter((s) => s.beginn?.trim());
  if (!valid.length) {
    return { ok: false, error: "Mindestens ein Termin erforderlich." };
  }

  const { data: auftrag } = await supabaseAdmin
    .from("auftraege")
    .select("lead_id")
    .eq("id", auftragId)
    .maybeSingle();

  const rows = valid.map((s) => ({
    auftrag_id: auftragId,
    lead_id: auftrag?.lead_id ?? null,
    slot_beginn: s.beginn,
    slot_ende: s.ende ?? null,
    status: "vorgeschlagen",
  }));

  const { error } = await supabaseAdmin.from("auftrag_terminslots").insert(rows);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/partner");
  return { ok: true };
}

/** Partner verschiebt bestätigten Termin (neuer Slot + alter abgesagt). */
export async function reschedulePartnerTerminSlot(
  auftragId: string,
  alterSlotId: string,
  neuerBeginn: string,
  neuerEnde?: string
): Promise<PartnerTerminSlotResult> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;

  if (!(await assertPartnerAuftrag(auth.handwerkerId, auftragId))) {
    return { ok: false, error: "Kein Zugriff." };
  }

  const now = new Date().toISOString();

  await supabaseAdmin
    .from("auftrag_terminslots")
    .update({
      status: "abgesagt",
      abgesagt_am: now,
      absage_grund: "Partner verschoben",
    })
    .eq("id", alterSlotId)
    .eq("auftrag_id", auftragId);

  const { data: auftrag } = await supabaseAdmin
    .from("auftraege")
    .select("lead_id")
    .eq("id", auftragId)
    .maybeSingle();

  const { error } = await supabaseAdmin.from("auftrag_terminslots").insert({
    auftrag_id: auftragId,
    lead_id: auftrag?.lead_id ?? null,
    slot_beginn: neuerBeginn,
    slot_ende: neuerEnde ?? null,
    status: "vorgeschlagen",
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/partner");
  return { ok: true };
}
