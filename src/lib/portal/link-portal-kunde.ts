import { supabaseAdmin } from "@/lib/supabase";

export type LinkPortalKundeResult =
  | { ok: true; kundeId: string }
  | { ok: false; error: string };

/**
 * Verknüpft Auth-User mit kunden.auth_user_id.
 * CRM-Mitarbeiter sind willkommen (gleiche Supabase-Auth wie das CRM).
 * Ein Konto kann parallel Kunden- und Partner-Portal nutzen.
 */
export async function linkPortalKundeToAuthUser(opts: {
  userId: string;
  email: string;
  name?: string | null;
  telefon?: string | null;
}): Promise<LinkPortalKundeResult> {
  const email = opts.email.trim().toLowerCase();
  if (!email) {
    return { ok: false, error: "Keine E-Mail-Adresse im Konto." };
  }

  const { data: byAuth } = await supabaseAdmin
    .from("kunden")
    .select("id")
    .eq("auth_user_id", opts.userId)
    .maybeSingle();

  if (byAuth?.id) {
    return { ok: true, kundeId: String(byAuth.id) };
  }

  const { data: byEmail, error: emailErr } = await supabaseAdmin
    .from("kunden")
    .select("id, auth_user_id, email")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();

  if (emailErr) {
    return { ok: false, error: emailErr.message };
  }

  if (byEmail?.id) {
    const existingAuth = byEmail.auth_user_id as string | null | undefined;
    if (existingAuth && existingAuth !== opts.userId) {
      return {
        ok: false,
        error:
          "Diese E-Mail ist bereits mit einem anderen Portal-Konto verknüpft. Bitte wende dich an uns.",
      };
    }
    const { error: upErr } = await supabaseAdmin
      .from("kunden")
      .update({ auth_user_id: opts.userId })
      .eq("id", byEmail.id);
    if (upErr) return { ok: false, error: upErr.message };
    return { ok: true, kundeId: String(byEmail.id) };
  }

  const name =
    opts.name?.trim() ||
    email.split("@")[0]?.replace(/[._]/g, " ") ||
    "Kunde";

  const { data: neu, error: insErr } = await supabaseAdmin
    .from("kunden")
    .insert({
      name,
      email,
      telefon: opts.telefon?.trim() || null,
      typ: "privat",
      auth_user_id: opts.userId,
    })
    .select("id")
    .single();

  if (insErr || !neu) {
    return {
      ok: false,
      error: insErr?.message ?? "Kundenstamm konnte nicht angelegt werden.",
    };
  }

  return { ok: true, kundeId: String(neu.id) };
}
