"use server";

import { revalidatePath } from "next/cache";

import { loadAuftragFachdokuSlotsWithUrls } from "@/lib/partner/ensure-fachdoku-slots";
import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import { uploadPartnerFachdokuDoc } from "@/lib/partner/partner-storage";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import type { FachdokuSlotView } from "@/lib/partner/fachdoku-slots";

export type PartnerFachdokuResult =
  | { ok: true; slots: FachdokuSlotView[] }
  | { ok: false; error: string };

async function assertPartnerAuftrag(
  handwerkerId: string,
  auftragId: string
): Promise<boolean> {
  const { data: zuweisung } = await supabaseAdmin
    .from("auftrag_handwerker")
    .select("id")
    .eq("auftrag_id", auftragId)
    .eq("handwerker_id", handwerkerId)
    .maybeSingle();
  if (zuweisung) return true;
  const { data: pos } = await supabaseAdmin
    .from("auftrag_positionen")
    .select("id")
    .eq("auftrag_id", auftragId)
    .eq("handwerker_id", handwerkerId)
    .limit(1);
  return Boolean(pos?.length);
}

async function gewerkeForAuftrag(auftragId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from("auftrag_positionen")
    .select("gewerk_name")
    .eq("auftrag_id", auftragId);
  return (data ?? [])
    .map((r) => String((r as { gewerk_name?: string | null }).gewerk_name ?? ""))
    .filter(Boolean);
}

export async function loadPartnerFachdokuSlots(
  auftragId: string
): Promise<PartnerFachdokuResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
  }
  const id = auftragId.trim();
  if (!id) return { ok: false, error: "Auftrag fehlt." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Nicht angemeldet." };

  const link = await linkPortalHandwerkerToAuthUser({
    userId: user.id,
    email: user.email,
  });
  if (!link.ok) return { ok: false, error: link.error };

  if (!(await assertPartnerAuftrag(link.handwerkerId, id))) {
    return { ok: false, error: "Keine Berechtigung." };
  }

  const gewerke = await gewerkeForAuftrag(id);
  const slots = await loadAuftragFachdokuSlotsWithUrls(
    supabaseAdmin,
    id,
    gewerke
  );
  return { ok: true, slots };
}

export async function uploadPartnerFachdokuSlot(formData: FormData): Promise<
  PartnerFachdokuResult
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
  }

  const auftragId = String(formData.get("auftragId") ?? "").trim();
  const slotId = String(formData.get("slotId") ?? "").trim();
  const file = formData.get("file");
  if (!auftragId || !slotId) {
    return { ok: false, error: "Angaben unvollständig." };
  }
  if (!(file instanceof File) || file.size < 1) {
    return { ok: false, error: "Keine Datei." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Nicht angemeldet." };

  const link = await linkPortalHandwerkerToAuthUser({
    userId: user.id,
    email: user.email,
  });
  if (!link.ok) return { ok: false, error: link.error };

  if (!(await assertPartnerAuftrag(link.handwerkerId, auftragId))) {
    return { ok: false, error: "Keine Berechtigung." };
  }

  const { data: slot } = await supabaseAdmin
    .from("auftrag_fachdoku_slots")
    .select("id, auftrag_id, slot_code, label")
    .eq("id", slotId)
    .eq("auftrag_id", auftragId)
    .maybeSingle();

  if (!slot) return { ok: false, error: "Slot nicht gefunden." };

  const up = await uploadPartnerFachdokuDoc({
    handwerkerId: link.handwerkerId,
    auftragId,
    slotCode: String(slot.slot_code),
    file,
  });
  if (!up.ok) return { ok: false, error: up.error };

  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("auftrag_fachdoku_slots")
    .update({
      status: "erledigt",
      datei_url: up.path,
      datei_name: file.name.slice(0, 200),
      uploaded_by_role: "hw",
      uploaded_by_handwerker_id: link.handwerkerId,
      uploaded_by_user_id: user.id,
      erledigt_am: now,
      updated_at: now,
    })
    .eq("id", slotId)
    .eq("auftrag_id", auftragId);

  if (error) return { ok: false, error: error.message };

  void import("@/lib/partner/notify-crm-partner-dokument").then(
    ({ notifyCrmPartnerDokumentUpload }) =>
      notifyCrmPartnerDokumentUpload({
        typ: "fachdoku",
        handwerkerId: link.handwerkerId,
        auftragId,
        slotId,
        titel: String(slot.label ?? slot.slot_code ?? "Fachnachweis").trim(),
      })
  );

  revalidatePath("/partner");
  const gewerke = await gewerkeForAuftrag(auftragId);
  const slots = await loadAuftragFachdokuSlotsWithUrls(
    supabaseAdmin,
    auftragId,
    gewerke
  );
  return { ok: true, slots };
}
