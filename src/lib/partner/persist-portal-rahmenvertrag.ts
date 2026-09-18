import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

/** Provisorische Nr., wenn CRM noch keine RV-Nummer geliefert hat (UNIQUE + NOT NULL). */
function provisionalVertragsNr(handwerkerId: string): string {
  const short = handwerkerId.replace(/-/g, "").slice(0, 8).toUpperCase();
  const ts = Date.now().toString(36).toUpperCase();
  return `RV-PORTAL-${short}-${ts}`;
}

/** Portal-Annahme in DB — unabhängig vom CRM-PDF. */
export async function persistPortalRahmenvertragAkzeptanz(opts: {
  handwerkerId: string;
  authUserId?: string | null;
  akzeptiertAt?: string;
  /** Von CRM, falls bereits vergeben */
  vertragsNr?: string | null;
  pdfUrl?: string | null;
}): Promise<{ ok: true; vertragId: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
  }

  const handwerkerId = opts.handwerkerId.trim();
  if (!handwerkerId) return { ok: false, error: "Handwerker-ID fehlt." };

  const akzeptiertAt = opts.akzeptiertAt?.trim() || new Date().toISOString();
  const crmNr = opts.vertragsNr?.trim() || null;
  const pdfUrl = opts.pdfUrl?.trim() || null;

  const { data: existing, error: loadErr } = await supabaseAdmin
    .from("handwerker_vertraege")
    .select("id, portal_akzeptiert_am, vertrags_nr, pdf_url")
    .eq("handwerker_id", handwerkerId)
    .eq("typ", "rahmen")
    .is("auftrag_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (loadErr) return { ok: false, error: loadErr.message };

  if (existing?.id) {
    if (existing.portal_akzeptiert_am) {
      const patch: Record<string, unknown> = {};
      if (crmNr && !existing.vertrags_nr) patch.vertrags_nr = crmNr;
      if (pdfUrl && !existing.pdf_url) patch.pdf_url = pdfUrl;
      if (Object.keys(patch).length > 0) {
        patch.updated_at = akzeptiertAt;
        await supabaseAdmin.from("handwerker_vertraege").update(patch).eq("id", existing.id);
      }
      return { ok: true, vertragId: String(existing.id) };
    }

    const updatePayload: Record<string, unknown> = {
      portal_akzeptiert_am: akzeptiertAt,
      portal_akzeptiert_auth_user_id: opts.authUserId ?? null,
      updated_at: akzeptiertAt,
    };
    if (crmNr) updatePayload.vertrags_nr = crmNr;
    if (pdfUrl) updatePayload.pdf_url = pdfUrl;

    const { error: updErr } = await supabaseAdmin
      .from("handwerker_vertraege")
      .update(updatePayload)
      .eq("id", existing.id);

    if (updErr) return { ok: false, error: updErr.message };
    return { ok: true, vertragId: String(existing.id) };
  }

  const { data: inserted, error: insErr } = await supabaseAdmin
    .from("handwerker_vertraege")
    .insert({
      handwerker_id: handwerkerId,
      typ: "rahmen",
      status: "portal_akzeptiert",
      vertrags_nr: crmNr ?? provisionalVertragsNr(handwerkerId),
      pdf_url: pdfUrl,
      portal_akzeptiert_am: akzeptiertAt,
      portal_akzeptiert_auth_user_id: opts.authUserId ?? null,
    })
    .select("id")
    .single();

  if (insErr) return { ok: false, error: insErr.message };
  return { ok: true, vertragId: String(inserted?.id ?? "") };
}
