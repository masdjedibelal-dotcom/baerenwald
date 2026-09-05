import { createClient } from "@/lib/supabase/server";
import {
  linkPortalKundeToAuthUser,
  resolveLinkedPortalKundeId,
} from "@/lib/portal/link-portal-kunde";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type EigentuemerSessionResult =
  | {
      ok: true;
      userId: string;
      email: string;
      kundeId: string;
      name: string | null;
      telefon: string | null;
    }
  | { ok: false; status: number; error: string };

/** Angemeldeter Portal-Nutzer mit `portal_modus=eigentuemer`. */
export async function requireEigentuemerSession(): Promise<EigentuemerSessionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, status: 503, error: "DB nicht konfiguriert." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, status: 401, error: "Nicht angemeldet." };
  }

  let kundeId = await resolveLinkedPortalKundeId(user.id);
  if (!kundeId) {
    const link = await linkPortalKundeToAuthUser({
      userId: user.id,
      email: user.email,
      name: (user.user_metadata as { name?: string })?.name,
      telefon: (user.user_metadata as { telefon?: string })?.telefon,
    });
    if (!link.ok) {
      return { ok: false, status: 403, error: link.error };
    }
    kundeId = link.kundeId;
  }

  const { data: kunde, error } = await supabaseAdmin
    .from("kunden")
    .select("id, name, email, telefon, portal_modus")
    .eq("id", kundeId)
    .maybeSingle();

  if (error || !kunde) {
    return { ok: false, status: 404, error: "Kundendaten nicht gefunden." };
  }

  if (String(kunde.portal_modus ?? "").toLowerCase() !== "eigentuemer") {
    return {
      ok: false,
      status: 403,
      error: "Nur für Eigentümer-Zugang.",
    };
  }

  return {
    ok: true,
    userId: user.id,
    email: user.email,
    kundeId: String(kunde.id),
    name: (kunde.name as string | null) ?? null,
    telefon: (kunde.telefon as string | null) ?? null,
  };
}
