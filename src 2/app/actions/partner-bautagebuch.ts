"use server";

import { revalidatePath } from "next/cache";

import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import { sendPartnerInternalBautagebuchMail } from "@/lib/partner/partner-mail";
import { notifyHvPartnerBautagebuch } from "@/lib/org/notify-hv-bautagebuch";
import { notifyMieterBautagebuchEintrag } from "@/lib/melde/notify-mieter-bautagebuch";
import {
  PARTNER_MAX_BAUTAGEBUCH_ANHAENGE,
  validatePartnerBautagebuchFiles,
} from "@/lib/partner/partner-upload-limits";
import {
  resolvePartnerFileUrls,
  uploadPartnerBautagebuchAnhaenge,
} from "@/lib/partner/partner-storage";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type PartnerBautagebuchResult =
  | { ok: true }
  | { ok: false; error: string };

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

async function partnerAuth() {
  if (!isSupabaseConfigured()) {
    return { ok: false as const, error: "Datenbank nicht konfiguriert." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false as const, error: "Nicht angemeldet." };
  }

  const link = await linkPortalHandwerkerToAuthUser({
    userId: user.id,
    email: user.email,
  });

  if (!link.ok) {
    return { ok: false as const, error: link.error };
  }

  return { ok: true as const, handwerkerId: link.handwerkerId };
}

function normalizeUrlList(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) {
    return v.map((x) => String(x).trim()).filter(Boolean);
  }
  return [];
}

export async function createPartnerBautagebuchEintrag(
  formData: FormData
): Promise<PartnerBautagebuchResult> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;

  const auftragId = String(formData.get("auftragId") ?? "").trim();
  const titel = String(formData.get("titel") ?? "").trim();
  const beschreibung = String(formData.get("beschreibung") ?? "").trim() || null;
  const datum = String(formData.get("datum") ?? "").trim().slice(0, 10);

  if (!auftragId) return { ok: false, error: "Auftrag fehlt." };
  if (!titel) return { ok: false, error: "Titel fehlt." };
  if (!datum) return { ok: false, error: "Datum fehlt." };

  const allowed = await assertPartnerAuftrag(auth.handwerkerId, auftragId);
  if (!allowed) {
    return { ok: false, error: "Kein Zugriff auf diesen Auftrag." };
  }

  const photos = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);

  const batchErr = validatePartnerBautagebuchFiles(photos, 0);
  if (batchErr) return { ok: false, error: batchErr };

  let fotoPaths: string[] = [];
  if (photos.length) {
    const up = await uploadPartnerBautagebuchAnhaenge({
      handwerkerId: auth.handwerkerId,
      auftragId,
      files: photos,
    });
    if (!up.ok) return { ok: false, error: up.error };
    fotoPaths = up.paths;
  }

  const { data: auftragRow } = await supabaseAdmin
    .from("auftraege")
    .select("lead_id, titel")
    .eq("id", auftragId)
    .maybeSingle();

  const leadId =
    auftragRow?.lead_id != null ? String(auftragRow.lead_id).trim() : "";

  const { error } = await supabaseAdmin.from("auftrag_bautagebuch_eintraege").insert({
    auftrag_id: auftragId,
    handwerker_id: auth.handwerkerId,
    titel,
    beschreibung,
    datum,
    foto_urls: fotoPaths,
    fuer_kunde_freigegeben: true,
  });

  if (error) return { ok: false, error: error.message };

  await supabaseAdmin
    .from("partner_bautagebuch_anfragen")
    .update({ erledigt_at: new Date().toISOString() })
    .eq("auftrag_id", auftragId)
    .eq("handwerker_id", auth.handwerkerId)
    .is("erledigt_at", null);

  const [{ data: hw }, { data: auf }] = await Promise.all([
    supabaseAdmin
      .from("handwerker")
      .select("name, firma")
      .eq("id", auth.handwerkerId)
      .maybeSingle(),
    supabaseAdmin.from("auftraege").select("titel").eq("id", auftragId).maybeSingle(),
  ]);

  const handwerkerName = String(hw?.name ?? "Partner");
  const auftragTitel = String(auf?.titel ?? "Auftrag").trim() || "Auftrag";

  void sendPartnerInternalBautagebuchMail({
    handwerkerName,
    firma: (hw?.firma as string | null) ?? null,
    auftragTitel,
    eintragTitel: titel,
    datum,
    auftragId,
  });

  void notifyHvPartnerBautagebuch({
    auftragId,
    handwerkerName,
    eintragTitel: titel,
  });

  if (leadId) {
    void notifyMieterBautagebuchEintrag({
      leadId,
      handwerkerName,
      eintragTitel: titel,
      auftragTitel,
    });
  }

  revalidatePath("/partner");
  revalidatePath("/portal");
  return { ok: true };
}

export async function updatePartnerBautagebuchEintrag(
  formData: FormData
): Promise<PartnerBautagebuchResult> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;

  const auftragId = String(formData.get("auftragId") ?? "").trim();
  const eintragId = String(formData.get("eintragId") ?? "").trim();
  const titel = String(formData.get("titel") ?? "").trim();
  const beschreibung = String(formData.get("beschreibung") ?? "").trim() || null;
  const datum = String(formData.get("datum") ?? "").trim().slice(0, 10);
  const keepRaw = String(formData.get("keepFotoPaths") ?? "").trim();
  const keepPaths = keepRaw
    ? keepRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : null;

  if (!auftragId || !eintragId) {
    return { ok: false, error: "Auftrag oder Eintrag fehlt." };
  }
  if (!titel) return { ok: false, error: "Titel fehlt." };
  if (!datum) return { ok: false, error: "Datum fehlt." };

  const { data: existing, error: loadErr } = await supabaseAdmin
    .from("auftrag_bautagebuch_eintraege")
    .select("id, handwerker_id, foto_urls, fuer_kunde_freigegeben")
    .eq("id", eintragId)
    .eq("auftrag_id", auftragId)
    .maybeSingle();

  if (loadErr || !existing) {
    return { ok: false, error: "Eintrag nicht gefunden." };
  }

  if (String(existing.handwerker_id) !== auth.handwerkerId) {
    return { ok: false, error: "Nur eigene Einträge können bearbeitet werden." };
  }

  const newPhotos = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);

  let fotoPaths = keepPaths ?? normalizeUrlList(existing.foto_urls);

  const batchErr = validatePartnerBautagebuchFiles(newPhotos, fotoPaths.length);
  if (batchErr) return { ok: false, error: batchErr };

  if (fotoPaths.length > PARTNER_MAX_BAUTAGEBUCH_ANHAENGE) {
    return {
      ok: false,
      error: `Maximal ${PARTNER_MAX_BAUTAGEBUCH_ANHAENGE} Anhänge pro Eintrag.`,
    };
  }

  if (newPhotos.length) {
    const up = await uploadPartnerBautagebuchAnhaenge({
      handwerkerId: auth.handwerkerId,
      auftragId,
      files: newPhotos,
      existingCount: fotoPaths.length,
    });
    if (!up.ok) return { ok: false, error: up.error };
    fotoPaths = [...fotoPaths, ...up.paths];
  }

  const { error } = await supabaseAdmin
    .from("auftrag_bautagebuch_eintraege")
    .update({
      titel,
      beschreibung,
      datum,
      foto_urls: fotoPaths,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eintragId)
    .eq("handwerker_id", auth.handwerkerId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/partner");
  return { ok: true };
}

export async function deletePartnerBautagebuchEintrag(opts: {
  auftragId: string;
  eintragId: string;
}): Promise<PartnerBautagebuchResult> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;

  const { data: existing } = await supabaseAdmin
    .from("auftrag_bautagebuch_eintraege")
    .select("id, handwerker_id, fuer_kunde_freigegeben")
    .eq("id", opts.eintragId)
    .eq("auftrag_id", opts.auftragId)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: "Eintrag nicht gefunden." };
  }

  if (String(existing.handwerker_id) !== auth.handwerkerId) {
    return { ok: false, error: "Nur eigene Einträge können gelöscht werden." };
  }

  if (existing.fuer_kunde_freigegeben) {
    return {
      ok: false,
      error: "Freigegebene Einträge können im Portal nicht gelöscht werden.",
    };
  }

  const { error } = await supabaseAdmin
    .from("auftrag_bautagebuch_eintraege")
    .delete()
    .eq("id", opts.eintragId)
    .eq("handwerker_id", auth.handwerkerId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/partner");
  return { ok: true };
}

/** Für Client-Vorschau nach Upload (optional). */
export async function getPartnerBautagebuchFotoUrls(
  paths: string[]
): Promise<string[]> {
  return resolvePartnerFileUrls(paths);
}
