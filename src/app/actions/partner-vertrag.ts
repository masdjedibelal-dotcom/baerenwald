"use server";

import { revalidatePath } from "next/cache";

import { confirmCrmProjektvertrag } from "@/lib/partner/partner-crm-api";
import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import { findHandwerkerForRegistration } from "@/lib/partner/partner-registration-eligibility";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type PartnerVertragConfirmResult =
  | { ok: true; vertrags_nr?: string; pdf_url?: string }
  | { ok: false; error: string };

export async function confirmPartnerProjektvertrag(opts: {
  auftragId: string;
  gelesen: boolean;
  verbindlich: boolean;
}): Promise<PartnerVertragConfirmResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
  }

  if (!opts.gelesen || !opts.verbindlich) {
    return {
      ok: false,
      error: "Bitte Vertrag lesen und verbindliche Annahme bestätigen.",
    };
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

  const auftragId = opts.auftragId.trim();
  if (!auftragId) return { ok: false, error: "Auftrag fehlt." };

  const { data: zuweisung } = await supabaseAdmin
    .from("auftrag_handwerker")
    .select("id, projektvertrag_bestaetigt_am")
    .eq("auftrag_id", auftragId)
    .eq("handwerker_id", link.handwerkerId)
    .maybeSingle();

  const { data: posCheck } = await supabaseAdmin
    .from("auftrag_positionen")
    .select("id")
    .eq("auftrag_id", auftragId)
    .eq("handwerker_id", link.handwerkerId)
    .limit(1);

  if (!zuweisung && !(posCheck?.length ?? 0)) {
    return { ok: false, error: "Keine Berechtigung für diesen Auftrag." };
  }

  if (zuweisung?.projektvertrag_bestaetigt_am) {
    return { ok: false, error: "Vertrag wurde bereits bestätigt." };
  }

  const crm = await confirmCrmProjektvertrag(auftragId);
  const now = new Date().toISOString();

  if (zuweisung) {
    await supabaseAdmin
      .from("auftrag_handwerker")
      .update({ projektvertrag_bestaetigt_am: now })
      .eq("id", zuweisung.id);
  } else {
    await supabaseAdmin.from("auftrag_handwerker").insert({
      auftrag_id: auftragId,
      handwerker_id: link.handwerkerId,
      status: "akzeptiert",
      projektvertrag_bestaetigt_am: now,
    });
  }

  if (crm.ok && crm.pdf_url) {
    const { data: existing } = await supabaseAdmin
      .from("handwerker_vertraege")
      .select("id")
      .eq("handwerker_id", link.handwerkerId)
      .eq("auftrag_id", auftragId)
      .eq("typ", "projekt")
      .maybeSingle();

    const patch = {
      status: "unterschrieben",
      signiert_am: now,
      vertrags_nr: crm.vertrags_nr ?? undefined,
      pdf_url: crm.pdf_url,
      updated_at: now,
    };

    if (existing?.id) {
      await supabaseAdmin
        .from("handwerker_vertraege")
        .update(patch)
        .eq("id", existing.id);
    }
  }

  if (!crm.ok) {
    revalidatePath("/partner");
    return {
      ok: true,
      vertrags_nr: undefined,
      pdf_url: undefined,
    };
  }

  revalidatePath("/partner");
  return crm;
}

export type PartnerRahmenvertragAcceptResult = { ok: true } | { ok: false; error: string };

/** Registrierung: Annahme per E-Mail (Handwerker muss im Stamm existieren). */
export async function acceptPartnerRahmenvertragForEmail(opts: {
  email: string;
  akzeptiert: boolean;
}): Promise<PartnerRahmenvertragAcceptResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
  }

  if (!opts.akzeptiert) {
    return {
      ok: false,
      error: "Bitte bestätige den Rahmenvertrag inkl. Anlage 1 und Anlage 2.",
    };
  }

  const email = opts.email.trim().toLowerCase();
  if (!email) return { ok: false, error: "E-Mail fehlt." };

  const hw = await findHandwerkerForRegistration(email);

  if (!hw?.id) {
    return {
      ok: false,
      error: "Diese E-Mail ist bei uns noch nicht als Partner hinterlegt.",
    };
  }

  const { data: vertrag } = await supabaseAdmin
    .from("handwerker_vertraege")
    .select("id, pdf_url, portal_akzeptiert_am")
    .eq("handwerker_id", hw.id)
    .eq("typ", "rahmen")
    .is("auftrag_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (vertrag?.portal_akzeptiert_am) {
    return { ok: true };
  }

  if (vertrag?.id) {
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("handwerker_vertraege")
      .update({
        portal_akzeptiert_am: now,
        updated_at: now,
      })
      .eq("id", vertrag.id);

    if (error) return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function acceptPartnerRahmenvertrag(opts: {
  vertragId: string;
  akzeptiert: boolean;
}): Promise<PartnerRahmenvertragAcceptResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
  }

  if (!opts.akzeptiert) {
    return {
      ok: false,
      error: "Bitte bestätige den Rahmenvertrag inkl. Anlage 1 und Anlage 2.",
    };
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

  const vertragId = opts.vertragId.trim();
  if (!vertragId) return { ok: false, error: "Vertrag fehlt." };

  const { data: vertrag } = await supabaseAdmin
    .from("handwerker_vertraege")
    .select("id, typ, pdf_url, status, portal_akzeptiert_am")
    .eq("id", vertragId)
    .eq("handwerker_id", link.handwerkerId)
    .maybeSingle();

  if (!vertrag?.id) {
    return { ok: false, error: "Rahmenvertrag nicht gefunden." };
  }

  if (String(vertrag.typ).toLowerCase() !== "rahmen") {
    return { ok: false, error: "Ungültiger Vertragstyp." };
  }

  if (!String(vertrag.pdf_url ?? "").trim()) {
    return { ok: false, error: "Der Rahmenvertrag ist noch nicht als PDF verfügbar." };
  }

  if (vertrag.portal_akzeptiert_am) {
    return { ok: false, error: "Rahmenvertrag wurde bereits akzeptiert." };
  }

  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("handwerker_vertraege")
    .update({
      portal_akzeptiert_am: now,
      portal_akzeptiert_auth_user_id: user.id,
      updated_at: now,
    })
    .eq("id", vertrag.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/partner");
  return { ok: true };
}
