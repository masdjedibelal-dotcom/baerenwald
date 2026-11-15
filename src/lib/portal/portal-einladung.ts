import { logDbError } from "@/lib/errors/log-db-error";
import { funktionAn } from "@/lib/marke";
import { pruefePortalEinladungToken } from "@/lib/portal/portal-einladung-token";
import { supabaseAdmin } from "@/lib/supabase";

export const NUR_EINLADUNG_FEHLER =
  "Ein Konto gibt es nur auf Einladung. Schreiben Sie uns über das Kontaktformular, wir melden uns.";

export type PortalEinladung =
  | { ok: true; orgName: string | null; rolle: string | null }
  | { ok: false };

/** E-Mail als exaktes ilike-Muster (_ und % sind sonst Platzhalter). */
function exakt(email: string): string {
  return email.replace(/[\\%_]/g, (z) => `\\${z}`);
}

/**
 * Darf sich diese E-Mail registrieren? Ohne `nurEinladung` (Bärenwald) immer.
 * Sonst nur mit offener Einladung der Verwaltung (kunden_mitglieder)
 * oder mit signiertem Einladungslink aus dem CRM.
 */
export async function pruefePortalEinladung(
  emailRaw: string | null | undefined,
  token: string | null | undefined
): Promise<PortalEinladung> {
  if (!funktionAn("nurEinladung")) return { ok: true, orgName: null, rolle: null };
  const email = String(emailRaw ?? "").trim().toLowerCase();
  if (!email) return { ok: false };

  const { data, error } = await supabaseAdmin
    .from("kunden_mitglieder")
    .select("kunde_id, rolle")
    .eq("aktiv", true)
    .ilike("email", exakt(email))
    .limit(1);
  if (error) logDbError("lib/portal/portal-einladung:kunden_mitglieder", error);
  const mitglied = data?.[0] as { kunde_id?: string; rolle?: string | null } | undefined;
  if (mitglied?.kunde_id) {
    const { data: org, error: oErr } = await supabaseAdmin
      .from("kunden")
      .select("name, org_anzeigename")
      .eq("id", mitglied.kunde_id)
      .maybeSingle();
    if (oErr) logDbError("lib/portal/portal-einladung:kunden", oErr);
    const o = org as { name?: string | null; org_anzeigename?: string | null } | null;
    return {
      ok: true,
      orgName: o?.org_anzeigename?.trim() || o?.name?.trim() || null,
      rolle: mitglied.rolle ?? null,
    };
  }

  try {
    if (pruefePortalEinladungToken(email, token)) return { ok: true, orgName: null, rolle: null };
  } catch (e) {
    console.error("[pruefePortalEinladung]", e);
  }
  return { ok: false };
}
