"use server";

import { revalidatePath } from "next/cache";

import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import { uploadPartnerComplianceDoc } from "@/lib/partner/partner-storage";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type PartnerComplianceUploadResult =
  | { ok: true }
  | { ok: false; error: string };

export async function uploadPartnerComplianceDokument(
  formData: FormData
): Promise<PartnerComplianceUploadResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
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

  const typ = String(formData.get("typ") ?? "").trim();
  const bezeichnung = String(formData.get("bezeichnung") ?? "").trim();
  const auftragIdRaw = String(formData.get("auftragId") ?? "").trim();
  const auftragId = auftragIdRaw || null;
  const gueltigBis = String(formData.get("gueltigBis") ?? "").trim() || null;
  const file = formData.get("file");

  if (!typ) return { ok: false, error: "Dokumenttyp fehlt." };
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Bitte eine Datei auswählen." };
  }

  if (auftragId) {
    const { data: zuweisung } = await supabaseAdmin
      .from("auftrag_handwerker")
      .select("id")
      .eq("auftrag_id", auftragId)
      .eq("handwerker_id", link.handwerkerId)
      .maybeSingle();
    const { data: pos } = await supabaseAdmin
      .from("auftrag_positionen")
      .select("id")
      .eq("auftrag_id", auftragId)
      .eq("handwerker_id", link.handwerkerId)
      .limit(1);
    if (!zuweisung && !(pos?.length ?? 0)) {
      return { ok: false, error: "Keine Berechtigung für diesen Auftrag." };
    }
  }

  const up = await uploadPartnerComplianceDoc({
    handwerkerId: link.handwerkerId,
    auftragId,
    typ,
    file,
  });
  if (!up.ok) return up;

  const { data: typRow } = await supabaseAdmin
    .from("compliance_dokument_typen")
    .select("bezeichnung")
    .eq("slug", typ)
    .maybeSingle();

  const { error } = await supabaseAdmin.from("partner_dokumente").insert({
    handwerker_id: link.handwerkerId,
    auftrag_id: auftragId,
    typ,
    bezeichnung: bezeichnung || (typRow as { bezeichnung?: string } | null)?.bezeichnung || typ,
    gueltig_bis: gueltigBis,
    datei_url: up.path,
    status: "in_pruefung",
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/partner");
  return { ok: true };
}
