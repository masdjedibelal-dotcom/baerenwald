"use server";

import { revalidatePath } from "next/cache";

import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import {
  validatePartnerBautagebuchFiles,
} from "@/lib/partner/partner-upload-limits";
import {
  uploadPartnerBautagebuchAnhaenge,
} from "@/lib/partner/partner-storage";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type PartnerBefundResult =
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

/** Partner: Schadenbefund mit Fotos (HV read-only, Versicherungsakte Pos. 4). */
export async function createPartnerBefundEintrag(
  formData: FormData
): Promise<PartnerBefundResult> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;

  const auftragId = String(formData.get("auftragId") ?? "").trim();
  const titel =
    String(formData.get("titel") ?? "").trim() || "Schadenbefund / Leckortung";
  const beschreibung = String(formData.get("beschreibung") ?? "").trim() || null;
  const datum =
    String(formData.get("datum") ?? "").trim().slice(0, 10) ||
    new Date().toISOString().slice(0, 10);

  if (!auftragId) return { ok: false, error: "Auftrag fehlt." };
  if (!beschreibung) {
    return { ok: false, error: "Bitte den Befund kurz beschreiben." };
  }

  const allowed = await assertPartnerAuftrag(auth.handwerkerId, auftragId);
  if (!allowed) {
    return { ok: false, error: "Kein Zugriff auf diesen Auftrag." };
  }

  const photos = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);

  const batchErr = validatePartnerBautagebuchFiles(photos, 0);
  if (batchErr) return { ok: false, error: batchErr };
  if (!photos.length) {
    return { ok: false, error: "Mindestens ein Foto zum Befund hochladen." };
  }

  let fotoPaths: string[] = [];
  const up = await uploadPartnerBautagebuchAnhaenge({
    handwerkerId: auth.handwerkerId,
    auftragId,
    files: photos,
  });
  if (!up.ok) return { ok: false, error: up.error };
  fotoPaths = up.paths;

  const { data: auftrag } = await supabaseAdmin
    .from("auftraege")
    .select("lead_id, kunde_id")
    .eq("id", auftragId)
    .maybeSingle();

  const { data: eintrag, error } = await supabaseAdmin
    .from("auftrag_bautagebuch_eintraege")
    .insert({
      auftrag_id: auftragId,
      handwerker_id: auth.handwerkerId,
      titel,
      beschreibung,
      datum,
      foto_urls: fotoPaths,
      eintrag_typ: "befund",
      fuer_kunde_freigegeben: false,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  const leadId = auftrag?.lead_id ? String(auftrag.lead_id) : null;
  await writeAuditEvent({
    entityType: leadId ? "lead" : "auftrag",
    entityId: leadId ?? auftragId,
    aktion: "partner_befund_erstellt",
    actorRolle: "partner",
    kundeId: auftrag?.kunde_id ? String(auftrag.kunde_id) : null,
    payload: {
      auftrag_id: auftragId,
      eintrag_id: eintrag?.id ?? null,
      foto_count: fotoPaths.length,
    },
  });

  revalidatePath("/partner");
  revalidatePath("/portal");

  // Schadenakte aktualisieren, falls Versicherungsfall
  void (async () => {
    const { data: a } = await supabaseAdmin
      .from("auftraege")
      .select("kostentraeger, lead_id")
      .eq("id", auftragId)
      .maybeSingle();
    let kt = a?.kostentraeger;
    if (!kt && a?.lead_id) {
      const { data: lead } = await supabaseAdmin
        .from("leads")
        .select("kostentraeger")
        .eq("id", a.lead_id)
        .maybeSingle();
      kt = lead?.kostentraeger;
    }
    if (kt === "versicherung") {
      const { ensureVersicherungsakteForAuftrag } = await import(
        "@/lib/org/ensure-versicherungsakte"
      );
      await ensureVersicherungsakteForAuftrag(auftragId, {
        actorRolle: "partner",
      });
    }
  })();

  return { ok: true };
}
