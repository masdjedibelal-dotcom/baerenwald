import { createClient } from "@/lib/supabase/server";
import { linkPortalKundeToAuthUser } from "@/lib/portal/link-portal-kunde";
import { supabaseAdmin } from "@/lib/supabase";
import type { OrganisationKunde, PortalModus } from "@/lib/org/types";

export type OrgSessionResult =
  | {
      ok: true;
      userId: string;
      email: string;
      kunde: OrganisationKunde;
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

  const { data: kunde, error } = await supabaseAdmin
    .from("kunden")
    .select(
      "id, name, email, portal_modus, org_kennung, org_anzeigename, org_logo_url, freigabe_modus, freigabe_schwelle_eur, notfall_direkt"
    )
    .eq("id", link.kundeId)
    .maybeSingle();

  if (error || !kunde) {
    return { ok: false, status: 404, error: "Kundendaten nicht gefunden." };
  }

  const modus = (kunde.portal_modus ?? "privat") as PortalModus;
  if (modus !== "organisation") {
    return {
      ok: false,
      status: 403,
      error: "Dieses Konto ist kein Auftraggeber-Portal.",
    };
  }

  return {
    ok: true,
    userId: user.id,
    email: user.email,
    kunde: kunde as OrganisationKunde,
  };
}
