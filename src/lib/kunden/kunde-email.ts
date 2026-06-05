import { supabaseAdmin } from "@/lib/supabase";

/** Normalisierte Kunden-E-Mail (einziger Schlüssel für Zuordnung). */
export function normalizeKundenEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isKundenEmailUniqueViolation(error: {
  code?: string;
  message?: string;
} | null): boolean {
  if (!error) return false;
  return error.code === "23505" || (error.message ?? "").includes("kunden_email_unique");
}

/** Existierenden Kundenstamm zur E-Mail (nach Unique-Index max. einer). */
export async function findKundeIdByEmail(email: string): Promise<string | null> {
  const norm = normalizeKundenEmail(email);
  if (!norm) return null;

  const { data, error } = await supabaseAdmin
    .from("kunden")
    .select("id")
    .ilike("email", norm)
    .maybeSingle();

  if (error) throw error;
  return data?.id ? String(data.id) : null;
}
