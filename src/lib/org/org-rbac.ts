import { supabaseAdmin } from "@/lib/supabase";

export type OrgMitgliedRolle = "admin" | "sachbearbeiter" | "lesen";

/** Rolle des eingeloggten Nutzers für eine Organisation (Hauptkonto = admin). */
export async function resolveOrgMitgliedRolle(
  authUserId: string,
  kundeId: string
): Promise<OrgMitgliedRolle> {
  const { data: kunde } = await supabaseAdmin
    .from("kunden")
    .select("auth_user_id")
    .eq("id", kundeId)
    .maybeSingle();

  if (kunde?.auth_user_id === authUserId) return "admin";

  const { data: mitglied } = await supabaseAdmin
    .from("kunden_mitglieder")
    .select("rolle")
    .eq("kunde_id", kundeId)
    .eq("auth_user_id", authUserId)
    .eq("aktiv", true)
    .maybeSingle();

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
