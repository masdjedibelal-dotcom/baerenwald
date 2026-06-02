import { supabaseAdmin } from "@/lib/supabase";

export type LinkPortalHandwerkerResult =
  | { ok: true; handwerkerId: string }
  | { ok: false; error: string };

/**
 * Verknüpft Auth-User mit handwerker.auth_user_id.
 * Nur bestehende Partner (vom CRM angelegt) — kein Auto-Anlegen.
 */
export async function linkPortalHandwerkerToAuthUser(opts: {
  userId: string;
  email: string;
}): Promise<LinkPortalHandwerkerResult> {
  const email = opts.email.trim().toLowerCase();
  if (!email) {
    return { ok: false, error: "Keine E-Mail-Adresse im Konto." };
  }

  const { data: crmProfile } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .eq("id", opts.userId)
    .maybeSingle();

  if (crmProfile?.id) {
    return {
      ok: false,
      error: "Bitte nutze das interne CRM — dieses Konto ist ein Mitarbeiter-Login.",
    };
  }

  const { data: kundeConflict } = await supabaseAdmin
    .from("kunden")
    .select("id")
    .eq("auth_user_id", opts.userId)
    .maybeSingle();

  if (kundeConflict?.id) {
    return {
      ok: false,
      error:
        "Dieses Konto ist bereits als Kundenportal verknüpft. Bitte eine andere E-Mail nutzen oder uns kontaktieren.",
    };
  }

  const { data: byAuth } = await supabaseAdmin
    .from("handwerker")
    .select("id")
    .eq("auth_user_id", opts.userId)
    .maybeSingle();

  if (byAuth?.id) {
    return { ok: true, handwerkerId: String(byAuth.id) };
  }

  const { data: byEmail, error: emailErr } = await supabaseAdmin
    .from("handwerker")
    .select("id, auth_user_id, email, aktiv")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();

  if (emailErr) {
    return { ok: false, error: emailErr.message };
  }

  if (!byEmail?.id) {
    return {
      ok: false,
      error:
        "Diese E-Mail ist bei uns noch nicht als Partner hinterlegt. Bitte wende dich an Bärenwald, damit wir deinen Zugang freischalten.",
    };
  }

  if (byEmail.aktiv === false) {
    return {
      ok: false,
      error: "Dein Partner-Profil ist derzeit nicht aktiv. Bitte kontaktiere uns.",
    };
  }

  const existingAuth = byEmail.auth_user_id as string | null | undefined;
  if (existingAuth && existingAuth !== opts.userId) {
    return {
      ok: false,
      error:
        "Diese E-Mail ist bereits mit einem anderen Partner-Konto verknüpft.",
    };
  }

  const { error: upErr } = await supabaseAdmin
    .from("handwerker")
    .update({ auth_user_id: opts.userId })
    .eq("id", byEmail.id);

  if (upErr) return { ok: false, error: upErr.message };

  return { ok: true, handwerkerId: String(byEmail.id) };
}
