import { supabaseAdmin } from "@/lib/supabase";

export type HausmeisterKontakt = {
  id: string;
  name: string;
  email: string | null;
  telefon: string | null;
};

/** Erster aktiver Hausmeister-Kontakt am Objekt (oder null). */
export async function loadObjektHausmeisterKontakt(
  kundeObjektId: string | null | undefined
): Promise<HausmeisterKontakt | null> {
  const oid = String(kundeObjektId ?? "").trim();
  if (!oid) return null;

  const { data } = await supabaseAdmin
    .from("objekt_kontakte")
    .select("id, name, email, telefon, rolle")
    .eq("kunde_objekt_id", oid)
    .eq("rolle", "hausmeister")
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data?.id) return null;
  return {
    id: String(data.id),
    name: String(data.name ?? "").trim() || "Hausmeister",
    email: data.email != null ? String(data.email).trim() || null : null,
    telefon: data.telefon != null ? String(data.telefon).trim() || null : null,
  };
}

export async function objektHasHausmeisterKontakt(
  kundeObjektId: string | null | undefined
): Promise<boolean> {
  const k = await loadObjektHausmeisterKontakt(kundeObjektId);
  return k != null;
}
