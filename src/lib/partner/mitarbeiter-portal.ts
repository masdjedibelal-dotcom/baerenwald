import { logDbError } from "@/lib/errors/log-db-error";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

/**
 * Partner-Mitarbeiter im Portal (16.10.2026): eigenes Login, sieht nur ihm zugeordnete, angenommene
 * Einsätze — ohne EK, ohne Annahme/Ablehnung, ohne Rechnung, ohne Firmendaten.
 */
export type PortalMitarbeiter = {
  mitarbeiterId: string;
  handwerkerId: string;
  name: string;
  firma: string;
};

type Zeile = {
  id: string;
  handwerker_id: string;
  name: string;
  auth_user_id: string | null;
  handwerker: { name?: string | null; firma?: string | null; ist_portal_gesperrt?: boolean | null } | null;
};

function alsMitarbeiter(z: Zeile): PortalMitarbeiter | null {
  const hw = Array.isArray(z.handwerker) ? z.handwerker[0] : z.handwerker;
  if (hw?.ist_portal_gesperrt) return null;
  return {
    mitarbeiterId: String(z.id),
    handwerkerId: String(z.handwerker_id),
    name: String(z.name ?? ""),
    firma: hw?.firma?.trim() || hw?.name?.trim() || "Ihr Betrieb",
  };
}

const SELECT = "id, handwerker_id, name, auth_user_id, handwerker(name, firma, ist_portal_gesperrt)";

/** Aktiver Mitarbeiter zu einer E-Mail (für die Registrierung). */
export async function findMitarbeiterForRegistration(
  email: string
): Promise<(PortalMitarbeiter & { registriert: boolean }) | null> {
  if (!isSupabaseConfigured()) return null;
  const norm = email.trim().toLowerCase();
  if (!norm.includes("@")) return null;
  const { data, error } = await supabaseAdmin
    .from("handwerker_mitarbeiter")
    .select(SELECT)
    .ilike("email", norm)
    .eq("aktiv", true)
    .limit(1)
    .maybeSingle();
  if (error) logDbError("lib/partner/mitarbeiter-portal:registrierung", error);
  if (!data) return null;
  const m = alsMitarbeiter(data as unknown as Zeile);
  return m ? { ...m, registriert: Boolean((data as { auth_user_id?: string | null }).auth_user_id) } : null;
}

/**
 * Eingeloggten Nutzer als Mitarbeiter erkennen — über die Verknüpfung oder beim ersten Login über die
 * E-Mail (dann wird verknüpft). Inhaber-Konten (handwerker.auth_user_id) sind nie Mitarbeiter.
 */
export async function linkPortalMitarbeiter(opts: { userId: string; email: string }): Promise<PortalMitarbeiter | null> {
  if (!isSupabaseConfigured()) return null;
  const { data: inhaber } = await supabaseAdmin.from("handwerker").select("id").eq("auth_user_id", opts.userId).maybeSingle();
  if (inhaber) return null;
  const { data: verknuepft, error } = await supabaseAdmin
    .from("handwerker_mitarbeiter")
    .select(SELECT)
    .eq("auth_user_id", opts.userId)
    .eq("aktiv", true)
    .maybeSingle();
  if (error) logDbError("lib/partner/mitarbeiter-portal:auth", error);
  if (verknuepft) return alsMitarbeiter(verknuepft as unknown as Zeile);
  const norm = opts.email.trim().toLowerCase();
  if (!norm) return null;
  const { data: perMail } = await supabaseAdmin
    .from("handwerker_mitarbeiter")
    .select(SELECT)
    .ilike("email", norm)
    .eq("aktiv", true)
    .is("auth_user_id", null)
    .limit(1)
    .maybeSingle();
  if (!perMail) return null;
  const { error: upErr } = await supabaseAdmin
    .from("handwerker_mitarbeiter")
    .update({ auth_user_id: opts.userId, updated_at: new Date().toISOString() })
    .eq("id", (perMail as { id: string }).id)
    .is("auth_user_id", null);
  if (upErr) {
    logDbError("lib/partner/mitarbeiter-portal:verknuepfen", upErr);
    return null;
  }
  return alsMitarbeiter(perMail as unknown as Zeile);
}
