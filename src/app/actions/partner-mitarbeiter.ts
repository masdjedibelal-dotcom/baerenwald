"use server";

import { revalidatePath } from "next/cache";

import { logDbError } from "@/lib/errors/log-db-error";
import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

/** Mitarbeiter des eigenen Betriebs (Inhaber pflegt sie im Portal; Bärenwald auch im CRM). */
export type MeinMitarbeiter = {
  id: string;
  name: string;
  email: string | null;
  telefon: string | null;
  rolle: string | null;
  hat_zugang: boolean;
};

type Fail = { ok: false; error: string };

async function inhaberAuth(): Promise<{ ok: true; handwerkerId: string } | Fail> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Portal ist nicht konfiguriert." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !user.email) return { ok: false, error: "Bitte melden Sie sich an." };
  const link = await linkPortalHandwerkerToAuthUser({ userId: user.id, email: user.email });
  if (!link.ok) return { ok: false, error: link.error };
  return { ok: true, handwerkerId: link.handwerkerId };
}

export async function listMeineMitarbeiter(): Promise<{ ok: true; liste: MeinMitarbeiter[] } | Fail> {
  const auth = await inhaberAuth();
  if (!auth.ok) return auth;
  const { data, error } = await supabaseAdmin
    .from("handwerker_mitarbeiter")
    .select("id, name, email, telefon, rolle, auth_user_id")
    .eq("handwerker_id", auth.handwerkerId)
    .eq("aktiv", true)
    .order("sort_order")
    .order("name");
  if (error) {
    logDbError("app/actions/partner-mitarbeiter:list", error);
    return { ok: false, error: "Mitarbeiter konnten nicht geladen werden." };
  }
  return {
    ok: true,
    liste: (data ?? []).map((r) => ({
      id: String(r.id),
      name: String(r.name ?? ""),
      email: (r.email as string | null) ?? null,
      telefon: (r.telefon as string | null) ?? null,
      rolle: (r.rolle as string | null) ?? null,
      hat_zugang: Boolean(r.auth_user_id),
    })),
  };
}

export async function speichereMitarbeiter(input: {
  id?: string | null;
  name: string;
  email?: string | null;
  telefon?: string | null;
  rolle?: string | null;
}): Promise<{ ok: true } | Fail> {
  const auth = await inhaberAuth();
  if (!auth.ok) return auth;
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name) return { ok: false, error: "Bitte einen Namen angeben." };
  const email = input.email?.trim().toLowerCase() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "E-Mail-Adresse ist ungültig." };
  const patch = { name, email, telefon: input.telefon?.trim() || null, rolle: input.rolle?.trim() || null, updated_at: new Date().toISOString() };
  const res = input.id
    ? await supabaseAdmin.from("handwerker_mitarbeiter").update(patch).eq("id", input.id).eq("handwerker_id", auth.handwerkerId)
    : await supabaseAdmin.from("handwerker_mitarbeiter").insert({ ...patch, handwerker_id: auth.handwerkerId });
  if (res.error) {
    logDbError("app/actions/partner-mitarbeiter:save", res.error);
    return { ok: false, error: "Mitarbeiter konnte nicht gespeichert werden." };
  }
  revalidatePath("/partner");
  return { ok: true };
}

/** Entfernen = deaktivieren: Zugang endet, alte Einsätze behalten den Namen. */
export async function entferneMitarbeiter(id: string): Promise<{ ok: true } | Fail> {
  const auth = await inhaberAuth();
  if (!auth.ok) return auth;
  const { error } = await supabaseAdmin
    .from("handwerker_mitarbeiter")
    .update({ aktiv: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("handwerker_id", auth.handwerkerId);
  if (error) {
    logDbError("app/actions/partner-mitarbeiter:delete", error);
    return { ok: false, error: "Mitarbeiter konnte nicht entfernt werden." };
  }
  revalidatePath("/partner");
  return { ok: true };
}
