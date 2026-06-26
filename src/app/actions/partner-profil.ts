"use server";

import { revalidatePath } from "next/cache";

import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase";

export type PartnerProfilUpdateResult = { ok: true } | { ok: false; error: string };

function cleanOptional(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? "").trim();
  return s || null;
}

export async function updatePartnerProfil(
  formData: FormData
): Promise<PartnerProfilUpdateResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Nicht angemeldet." };

  const link = await linkPortalHandwerkerToAuthUser({
    userId: user.id,
    email: user.email,
  });
  if (!link.ok) return { ok: false, error: link.error };

  const vorname = String(formData.get("vorname") ?? "").trim();
  const nachname = String(formData.get("nachname") ?? "").trim();
  const firma = cleanOptional(formData.get("firma"));
  const telefon = String(formData.get("telefon") ?? "").trim();
  const webseite = cleanOptional(formData.get("webseite"));
  const adresse = cleanOptional(formData.get("adresse"));
  const steuernummer = cleanOptional(formData.get("steuernummer"));
  const ustid = cleanOptional(formData.get("ustid"));
  const ibanRaw = cleanOptional(formData.get("iban"));
  const iban = ibanRaw ? ibanRaw.replace(/\s+/g, "") : null;

  if (!vorname) return { ok: false, error: "Bitte den Vornamen angeben." };
  if (!nachname) return { ok: false, error: "Bitte den Nachnamen angeben." };
  if (!telefon) return { ok: false, error: "Bitte eine Telefonnummer angeben." };

  const name = `${vorname} ${nachname}`.trim();

  const { error } = await supabase
    .from("handwerker")
    .update({
      vorname,
      nachname,
      name,
      firma,
      telefon,
      webseite,
      adresse,
      steuernummer,
      ustid,
      iban,
    })
    .eq("id", link.handwerkerId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/partner");
  return { ok: true };
}
