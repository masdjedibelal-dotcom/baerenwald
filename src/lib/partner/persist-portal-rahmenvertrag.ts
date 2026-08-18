import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

/** Portal-Annahme in DB — unabhängig vom CRM-PDF. */
export async function persistPortalRahmenvertragAkzeptanz(opts: {
  handwerkerId: string;
  authUserId?: string | null;
  akzeptiertAt?: string;
}): Promise<{ ok: true; vertragId: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
  }

  const handwerkerId = opts.handwerkerId.trim();
  if (!handwerkerId) return { ok: false, error: "Handwerker-ID fehlt." };

  const akzeptiertAt = opts.akzeptiertAt?.trim() || new Date().toISOString();

  const { data: existing, error: loadErr } = await supabaseAdmin
    .from("handwerker_vertraege")
    .select("id, portal_akzeptiert_am")
    .eq("handwerker_id", handwerkerId)
    .eq("typ", "rahmen")
    .is("auftrag_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (loadErr) return { ok: false, error: loadErr.message };

  if (existing?.id) {
    if (existing.portal_akzeptiert_am) {
      return { ok: true, vertragId: String(existing.id) };
    }

    const { error: updErr } = await supabaseAdmin
      .from("handwerker_vertraege")
      .update({
        portal_akzeptiert_am: akzeptiertAt,
        portal_akzeptiert_auth_user_id: opts.authUserId ?? null,
        updated_at: akzeptiertAt,
      })
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
      portal_akzeptiert_am: akzeptiertAt,
      portal_akzeptiert_auth_user_id: opts.authUserId ?? null,
    })
    .select("id")
    .single();

  if (insErr) return { ok: false, error: insErr.message };
  return { ok: true, vertragId: String(inserted?.id ?? "") };
}
