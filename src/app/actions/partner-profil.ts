"use server";

import { revalidatePath } from "next/cache";

import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import { uploadPartnerLogo } from "@/lib/partner/partner-storage";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type PartnerProfilUpdateResult = { ok: true } | { ok: false; error: string };

function cleanOptional(
  value: FormDataEntryValue | null | string | undefined
): string | null {
  const s = String(value ?? "").trim();
  return s || null;
}

function splitInhaber(inhaber: string): {
  vorname: string;
  nachname: string;
  name: string;
} {
  const parts = inhaber.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { vorname: "", nachname: "", name: "" };
  if (parts.length === 1) {
    return { vorname: parts[0]!, nachname: parts[0]!, name: parts[0]! };
  }
  const vorname = parts[0]!;
  const nachname = parts.slice(1).join(" ");
  return { vorname, nachname, name: `${vorname} ${nachname}`.trim() };
}

/**
 * D12 Firmendaten — Mock HW_FIRMA Felder (Autosave / FormData).
 */
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

  const firma =
    cleanOptional(formData.get("firma")) ?? cleanOptional(formData.get("name"));

  const inhaberParts = [
    cleanOptional(formData.get("vorname")),
    cleanOptional(formData.get("nachname")),
  ]
    .filter(Boolean)
    .join(" ");
  const inhaberRaw =
    cleanOptional(formData.get("inhaber")) ?? (inhaberParts || null);

  const telefon =
    cleanOptional(formData.get("telefon")) ?? cleanOptional(formData.get("tel"));
  const webseite = cleanOptional(formData.get("webseite"));
  const strasse = cleanOptional(formData.get("strasse"));
  const ort = cleanOptional(formData.get("ort"));
  const adresseJoined = [strasse, ort].filter(Boolean).join(", ");
  const adresse =
    cleanOptional(formData.get("adresse")) ?? (adresseJoined || null);
  const steuernummer =
    cleanOptional(formData.get("steuernummer")) ??
    cleanOptional(formData.get("steuernr"));
  const ustid = cleanOptional(formData.get("ustid"));
  const handelsregister =
    cleanOptional(formData.get("handelsregister")) ??
    cleanOptional(formData.get("hrb"));
  const ibanRaw = cleanOptional(formData.get("iban"));
  const iban = ibanRaw ? ibanRaw.replace(/\s+/g, "") : null;
  const bic = cleanOptional(formData.get("bic"));
  const bank = cleanOptional(formData.get("bank"));
  const kleinRaw = formData.get("kleinunternehmer");
  const hasKleinField = kleinRaw !== null;
  const kleinunternehmer =
    kleinRaw === "1" || kleinRaw === "true" || kleinRaw === "on";

  if (!inhaberRaw) {
    return { ok: false, error: "Bitte Inhaber / Geschäftsführung angeben." };
  }
  if (!telefon) return { ok: false, error: "Bitte eine Telefonnummer angeben." };

  const { vorname, nachname, name } = splitInhaber(inhaberRaw);

  const patchFull: Record<string, unknown> = {
    vorname,
    nachname,
    name,
    firma,
    telefon,
    webseite,
    adresse,
    strasse,
    ort,
    steuernummer,
    ustid,
    handelsregister,
    iban,
    bic,
    bank,
    ...(hasKleinField ? { kleinunternehmer } : {}),
  };

  let { error } = await supabase
    .from("handwerker")
    .update(patchFull)
    .eq("id", link.handwerkerId);

  if (error && /kleinunternehmer/i.test(error.message)) {
    const { kleinunternehmer: _k, ...withoutKu } = patchFull;
    ({ error } = await supabase
      .from("handwerker")
      .update(withoutKu)
      .eq("id", link.handwerkerId));
  }

  if (error && /strasse|ort|handelsregister|bic|bank/i.test(error.message)) {
    const {
      strasse: _s,
      ort: _o,
      handelsregister: _h,
      bic: _b,
      bank: _bank,
      kleinunternehmer: _ku,
      ...base
    } = patchFull;
    ({ error } = await supabase
      .from("handwerker")
      .update(base)
      .eq("id", link.handwerkerId));
  }

  if (error) return { ok: false, error: error.message };

  revalidatePath("/partner");
  return { ok: true };
}

/** Firmenlogo hochladen (PNG/JPG/WebP). */
export async function uploadPartnerProfilLogo(
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

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Bitte eine Bilddatei wählen." };
  }

  const upload = await uploadPartnerLogo({
    handwerkerId: link.handwerkerId,
    file,
  });
  if (!upload.ok) return upload;

  let { error } = await supabaseAdmin
    .from("handwerker")
    .update({ logo_url: upload.path })
    .eq("id", link.handwerkerId);

  if (error && /logo_url/i.test(error.message)) {
    return {
      ok: false,
      error:
        "Logo-Spalte fehlt noch in der Datenbank. Bitte Migration handwerker_auto_dokumente anwenden.",
    };
  }
  if (error) return { ok: false, error: error.message };

  revalidatePath("/partner");
  return { ok: true };
}
