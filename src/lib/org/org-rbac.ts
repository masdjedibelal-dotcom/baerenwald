import { logDbError } from '@/lib/errors/log-db-error'
import { supabaseAdmin } from "@/lib/supabase";

export type OrgMitgliedRolle = "admin" | "sachbearbeiter" | "lesen";

/** Rolle des eingeloggten Nutzers für eine Organisation (Hauptkonto = admin). */
export async function resolveOrgMitgliedRolle(
  authUserId: string,
  kundeId: string
): Promise<OrgMitgliedRolle> {
  const {data: kunde, error: __dbErr351_1} = await supabaseAdmin
    .from("kunden")
    .select("auth_user_id")
    .eq("id", kundeId)
    .maybeSingle();
  if (__dbErr351_1) logDbError('lib/org/org-rbac:kunden', __dbErr351_1)
  if (kunde?.auth_user_id === authUserId) return "admin";

  const {data: mitglied, error: __dbErr352_2} = await supabaseAdmin
    .from("kunden_mitglieder")
    .select("rolle")
    .eq("kunde_id", kundeId)
    .eq("auth_user_id", authUserId)
    .eq("aktiv", true)
    .maybeSingle();
  if (__dbErr352_2) logDbError('lib/org/org-rbac:kunden_mitglieder', __dbErr352_2)
  const rolle = String(mitglied?.rolle ?? "").trim();
  if (rolle === "admin" || rolle === "sachbearbeiter" || rolle === "lesen") {
    return rolle;
  }

  return "admin";
}

export function canOrgAdmin(rolle: OrgMitgliedRolle): boolean {
  return rolle === "admin";
}

/** Freigabe, Kostenträger, operative Aktionen — nicht für „lesen“. */
export function canOrgFreigabe(rolle: OrgMitgliedRolle): boolean {
  return rolle === "admin" || rolle === "sachbearbeiter";
}

export function rbacForbiddenMessage(needed: "admin" | "freigabe"): string {
  return needed === "admin"
    ? "Nur Administratoren dürfen diese Einstellung ändern."
    : "Keine Berechtigung für diese Aktion.";
}
