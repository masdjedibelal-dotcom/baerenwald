import { linkPortalKundeToAuthUser } from "@/lib/portal/link-portal-kunde";
import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";

export type AccountSession =
  | {
      ok: true;
      userId: string;
      email: string;
      kind: "kunde" | "handwerker";
      entityId: string;
    }
  | { ok: false; status: number; error: string };

/** Auth-Session → verknüpfter Kunde oder Handwerker. */
export async function requireAccountSession(): Promise<AccountSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, status: 401, error: "Nicht angemeldet." };
  }

  const meta = user.user_metadata as {
    name?: string;
    telefon?: string;
  };

  const kundeLink = await linkPortalKundeToAuthUser({
    userId: user.id,
    email: user.email,
    name: meta?.name,
    telefon: meta?.telefon,
  });

  if (kundeLink.ok) {
    return {
      ok: true,
      userId: user.id,
      email: user.email,
      kind: "kunde",
      entityId: kundeLink.kundeId,
    };
  }

  const hwLink = await linkPortalHandwerkerToAuthUser({
    userId: user.id,
    email: user.email,
  });

  if (hwLink.ok) {
    return {
      ok: true,
      userId: user.id,
      email: user.email,
      kind: "handwerker",
      entityId: hwLink.handwerkerId,
    };
  }

  return {
    ok: false,
    status: 403,
    error: kundeLink.error || "Kein Portal-Konto verknüpft.",
  };
}

export async function countOpenKundeVorgaenge(kundeId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("kunde_id", kundeId)
    .not("vorgang_phase", "in", '("abgeschlossen","storniert","abgelehnt")');

  return count ?? 0;
}
