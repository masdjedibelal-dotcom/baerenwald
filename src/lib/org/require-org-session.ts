import { loadOrganisationKunde } from "@/lib/org/load-organisation-kunde";
import {
  canOrgAdmin,
  canOrgFreigabe,
  rbacForbiddenMessage,
  resolveOrgMitgliedRolle,
  type OrgMitgliedRolle,
} from "@/lib/org/org-rbac";
import type { OrganisationKunde } from "@/lib/org/types";
import { createClient } from "@/lib/supabase/server";
import { linkPortalKundeToAuthUser } from "@/lib/portal/link-portal-kunde";

export type OrgSessionResult =
  | {
      ok: true;
      userId: string;
      email: string;
      kunde: OrganisationKunde;
      rolle: OrgMitgliedRolle;
    }
  | { ok: false; status: number; error: string };

export async function requireOrganisationSession(): Promise<OrgSessionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, status: 401, error: "Nicht angemeldet." };
  }

  const link = await linkPortalKundeToAuthUser({
    userId: user.id,
    email: user.email,
    name: (user.user_metadata as { name?: string })?.name,
    telefon: (user.user_metadata as { telefon?: string })?.telefon,
  });

  if (!link.ok) {
    return { ok: false, status: 403, error: link.error };
  }

  const kunde = await loadOrganisationKunde(link.kundeId);
  if (!kunde) {
    return { ok: false, status: 404, error: "Kundendaten nicht gefunden." };
  }

  const rolle = await resolveOrgMitgliedRolle(user.id, kunde.id);

  return {
    ok: true,
    userId: user.id,
    email: user.email,
    kunde,
    rolle,
  };
}

export async function requireOrgAdminSession(): Promise<OrgSessionResult> {
  const session = await requireOrganisationSession();
  if (!session.ok) return session;
  if (!canOrgAdmin(session.rolle)) {
    return { ok: false, status: 403, error: rbacForbiddenMessage("admin") };
  }
  return session;
}

export async function requireOrgFreigabeSession(): Promise<OrgSessionResult> {
  const session = await requireOrganisationSession();
  if (!session.ok) return session;
  if (!canOrgFreigabe(session.rolle)) {
    return { ok: false, status: 403, error: rbacForbiddenMessage("freigabe") };
  }
  return session;
}
