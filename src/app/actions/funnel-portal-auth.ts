"use server";

import { assertPortalEmailAllowed } from "@/app/actions/assert-portal-email-allowed";
import {
  generateFunnelOtpCode,
  isPortalAuthEmailRegistered,
  sendFunnelOtpEmail,
  storeFunnelOtp,
  verifyFunnelOtp,
} from "@/lib/funnel/funnel-portal-otp";
import { normalizeKundenEmail } from "@/lib/kunden/kunde-email";
import { linkPortalKundeToAuthUser } from "@/lib/portal/link-portal-kunde";
import {
  buildPortalContactPrefill,
  type PortalContactPrefill,
} from "@/lib/portal/portal-contact-prefill";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/server";

export type FunnelEmailCheckResult =
  | { ok: true; status: "registered" | "new" }
  | { ok: false; error: string };

export async function checkFunnelPortalEmail(
  email: string
): Promise<FunnelEmailCheckResult> {
  const allowed = await assertPortalEmailAllowed(email);
  if (!allowed.ok) return allowed;

  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Portal ist momentan nicht verfügbar." };
  }

  try {
    const registered = await isPortalAuthEmailRegistered(email);
    return { ok: true, status: registered ? "registered" : "new" };
  } catch (e) {
    console.error("[checkFunnelPortalEmail]", e);
    return {
      ok: false,
      error: "Prüfung fehlgeschlagen. Bitte später erneut versuchen.",
    };
  }
}

export type FunnelRegisterInput = {
  vorname: string;
  nachname: string;
  email: string;
  telefon?: string;
  strasse: string;
  hausnummer: string;
  plz: string;
  ort: string;
  password: string;
};

export type FunnelRegisterResult =
  | { ok: true }
  | { ok: false; error: string };

export async function registerFunnelPortalAccount(
  input: FunnelRegisterInput
): Promise<FunnelRegisterResult> {
  const allowed = await assertPortalEmailAllowed(input.email);
  if (!allowed.ok) return allowed;

  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Portal ist momentan nicht verfügbar." };
  }

  const email = normalizeKundenEmail(input.email);
  const vorname = input.vorname.trim();
  const nachname = input.nachname.trim();
  const password = input.password;
  const plz = input.plz.trim();
  const ort = input.ort.trim();
  const strasse = input.strasse.trim();
  const hausnummer = input.hausnummer.trim();

  if (!email || !vorname || !nachname) {
    return { ok: false, error: "Bitte Vorname, Nachname und E-Mail angeben." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Passwort mindestens 8 Zeichen." };
  }
  if (
    strasse.length < 2 ||
    hausnummer.length < 1 ||
    !/^\d{5}$/.test(plz) ||
    ort.length < 2
  ) {
    return {
      ok: false,
      error: "Bitte Straße, Hausnummer, PLZ und Ort vollständig angeben.",
    };
  }

  const already = await isPortalAuthEmailRegistered(email);
  if (already) {
    return {
      ok: false,
      error: "Diese E-Mail ist bereits registriert. Bitte melde dich an.",
    };
  }

  const fullName = `${vorname} ${nachname}`.trim();
  const telefon = (input.telefon ?? "").trim() || null;
  const now = new Date().toISOString();

  const { data: created, error: createErr } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        name: fullName,
        vorname,
        nachname,
        telefon,
        strasse,
        hausnummer,
        plz,
        ort,
        datenschutz_akzeptiert_at: now,
        agb_akzeptiert_at: now,
        funnel_register: true,
      },
    });

  if (createErr || !created.user) {
    const msg = createErr?.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("registered")) {
      return {
        ok: false,
        error: "Diese E-Mail ist bereits registriert. Bitte melde dich an.",
      };
    }
    console.error("[registerFunnelPortalAccount]", createErr);
    return {
      ok: false,
      error: createErr?.message || "Registrierung fehlgeschlagen.",
    };
  }

  const userId = created.user.id;
  const code = generateFunnelOtpCode();

  try {
    await storeFunnelOtp({ email, code, userId });
  } catch (e) {
    console.error("[registerFunnelPortalAccount] store otp", e);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return { ok: false, error: "Code konnte nicht erzeugt werden." };
  }

  const mail = await sendFunnelOtpEmail({ email, code, vorname });
  if (!mail.ok) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    await supabaseAdmin.from("funnel_portal_otp").delete().eq("email", email);
    return mail;
  }

  return { ok: true };
}

export async function resendFunnelPortalCode(
  emailRaw: string
): Promise<FunnelRegisterResult> {
  const allowed = await assertPortalEmailAllowed(emailRaw);
  if (!allowed.ok) return allowed;
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Portal ist momentan nicht verfügbar." };
  }

  const email = normalizeKundenEmail(emailRaw);
  if (!email) return { ok: false, error: "Ungültige E-Mail." };

  const { data: row } = await supabaseAdmin
    .from("funnel_portal_otp")
    .select("user_id")
    .eq("email", email)
    .maybeSingle();

  let userId = row?.user_id ? String(row.user_id) : "";
  if (!userId) {
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    const found = list?.users?.find(
      (u) => (u.email ?? "").toLowerCase() === email
    );
    if (!found?.id || found.email_confirmed_at) {
      return {
        ok: false,
        error: "Kein ausstehender Code für diese E-Mail.",
      };
    }
    userId = found.id;
  }

  const code = generateFunnelOtpCode();
  try {
    await storeFunnelOtp({ email, code, userId });
  } catch (e) {
    console.error("[resendFunnelPortalCode]", e);
    return { ok: false, error: "Code konnte nicht erzeugt werden." };
  }

  const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
  const vorname =
    typeof userData.user?.user_metadata?.vorname === "string"
      ? userData.user.user_metadata.vorname
      : undefined;

  return sendFunnelOtpEmail({ email, code, vorname });
}

export type FunnelVerifyResult =
  | { ok: true; prefill: PortalContactPrefill }
  | { ok: false; error: string };

export async function verifyFunnelPortalCode(opts: {
  email: string;
  code: string;
}): Promise<FunnelVerifyResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Portal ist momentan nicht verfügbar." };
  }

  const result = await verifyFunnelOtp(opts);
  if (!result.ok) return result;

  const { data: userData } = await supabaseAdmin.auth.admin.getUserById(
    result.userId
  );
  const meta = (userData.user?.user_metadata ?? {}) as Record<string, unknown>;
  const email = normalizeKundenEmail(opts.email) ?? "";
  const vorname =
    typeof meta.vorname === "string" ? meta.vorname : undefined;
  const nachname =
    typeof meta.nachname === "string" ? meta.nachname : undefined;
  const name =
    typeof meta.name === "string"
      ? meta.name
      : [vorname, nachname].filter(Boolean).join(" ");
  const telefon =
    typeof meta.telefon === "string" ? meta.telefon : null;

  const link = await linkPortalKundeToAuthUser({
    userId: result.userId,
    email,
    name: name || null,
    telefon,
  });
  if (!link.ok) {
    return { ok: false, error: link.error };
  }

  // Stammdaten am Kunden ergänzen
  const adresse = [meta.strasse, meta.hausnummer]
    .filter((x) => typeof x === "string" && x.trim())
    .join(" ")
    .trim();
  const patch: Record<string, unknown> = {};
  if (typeof meta.plz === "string" && meta.plz.trim()) patch.plz = meta.plz.trim();
  if (typeof meta.ort === "string" && meta.ort.trim()) patch.ort = meta.ort.trim();
  if (adresse) patch.adresse = adresse;
  if (telefon) patch.telefon = telefon;
  if (Object.keys(patch).length) {
    await supabaseAdmin.from("kunden").update(patch).eq("id", link.kundeId);
  }

  return {
    ok: true,
    prefill: {
      vorname,
      nachname,
      email,
      telefon: telefon || undefined,
      strasse: typeof meta.strasse === "string" ? meta.strasse : undefined,
      hausnummer:
        typeof meta.hausnummer === "string" ? meta.hausnummer : undefined,
      plz: typeof meta.plz === "string" ? meta.plz : undefined,
      ort: typeof meta.ort === "string" ? meta.ort : undefined,
    },
  };
}

/** Prefill für eingeloggten Portal-Nutzer (nach Login im Funnel). */
export async function getFunnelSessionContactPrefill(): Promise<
  | { ok: true; prefill: PortalContactPrefill; authenticated: true }
  | { ok: true; authenticated: false }
  | { ok: false; error: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: true, authenticated: false };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      return { ok: true, authenticated: false };
    }

    const email = normalizeKundenEmail(user.email) ?? user.email;
    const link = await linkPortalKundeToAuthUser({
      userId: user.id,
      email,
      name:
        typeof user.user_metadata?.name === "string"
          ? user.user_metadata.name
          : null,
      telefon:
        typeof user.user_metadata?.telefon === "string"
          ? user.user_metadata.telefon
          : null,
    });

    if (!link.ok) {
      return { ok: false, error: link.error };
    }

    const { data: kunde } = await supabaseAdmin
      .from("kunden")
      .select("id, name, email, plz, ort, adresse, telefon")
      .eq("id", link.kundeId)
      .maybeSingle();

    const { data: leads } = await supabaseAdmin
      .from("leads")
      .select(
        "kontakt_name, kontakt_email, kontakt_telefon, strasse, hausnummer, plz, funnel_daten, objekt:kunden_objekte(strasse, plz, ort, stadt)"
      )
      .eq("kunde_id", link.kundeId)
      .order("created_at", { ascending: false })
      .limit(3);

    const prefill = buildPortalContactPrefill({
      kunde: {
        name: kunde?.name,
        email: kunde?.email ?? email,
        plz: kunde?.plz,
        ort: kunde?.ort,
        adresse: kunde?.adresse,
      },
      leads: (leads ?? []) as unknown as Parameters<
        typeof buildPortalContactPrefill
      >[0]["leads"],
    });

    if (!prefill.email) prefill.email = email;
    if (
      !prefill.telefon &&
      typeof kunde?.telefon === "string" &&
      kunde.telefon.trim()
    ) {
      prefill.telefon = kunde.telefon.trim();
    }

    const meta = user.user_metadata ?? {};
    if (!prefill.vorname && typeof meta.vorname === "string") {
      prefill.vorname = meta.vorname;
    }
    if (!prefill.nachname && typeof meta.nachname === "string") {
      prefill.nachname = meta.nachname;
    }

    return { ok: true, authenticated: true, prefill };
  } catch (e) {
    console.error("[getFunnelSessionContactPrefill]", e);
    return {
      ok: false,
      error: "Session konnte nicht geladen werden.",
    };
  }
}
