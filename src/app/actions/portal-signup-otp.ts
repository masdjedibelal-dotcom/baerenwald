"use server";

import { assertPartnerEmailAllowed } from "@/app/actions/assert-partner-email-allowed";
import { assertPortalEmailAllowed } from "@/app/actions/assert-portal-email-allowed";
import { acceptPartnerRahmenvertragForEmail } from "@/app/actions/partner-vertrag";
import {
  generateFunnelOtpCode,
  issueSignupOtp,
  sendFunnelOtpEmail,
  storeFunnelOtp,
  verifyFunnelOtp,
  type PortalOtpBrand,
} from "@/lib/funnel/funnel-portal-otp";
import { normalizeKundenEmail } from "@/lib/kunden/kunde-email";
import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import { PARTNER_AUTH_COPY } from "@/lib/partner/partner-auth-copy";
import { verifyPartnerRegistrationEmail } from "@/lib/partner/partner-registration-eligibility";
import { linkPortalKundeToAuthUser } from "@/lib/portal/link-portal-kunde";
import { ensurePortalRegistrationEmailAvailable } from "@/lib/portal/reclaim-orphan-portal-auth";
import {
  normalizePortalRegisterKundeTyp,
  type PortalRegisterKundeTyp,
} from "@/lib/portal/portal-register-kunde-typ";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type PortalSignupOtpResult = { ok: true } | { ok: false; error: string };

async function resolveUnconfirmedUserId(
  email: string
): Promise<string | null> {
  const { data: row } = await supabaseAdmin
    .from("funnel_portal_otp")
    .select("user_id")
    .eq("email", email)
    .maybeSingle();

  if (row?.user_id) return String(row.user_id);

  const { data: list } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  const found = list?.users?.find(
    (u) => (u.email ?? "").toLowerCase() === email
  );
  if (!found?.id || found.email_confirmed_at) return null;
  return found.id;
}

function trimOrNull(v: string | undefined | null): string | null {
  const t = (v ?? "").trim();
  return t || null;
}

export async function registerMeinBaerenwaldWithOtp(input: {
  name: string;
  email: string;
  telefon?: string;
  password: string;
  einladungToken?: string;
  /** privat | gewerbe | hausverwaltung — Pflicht außer bei Einladung */
  kundentyp?: string;
  vorname?: string;
  nachname?: string;
  firma?: string;
  strasse?: string;
  hausnummer?: string;
  plz?: string;
  ort?: string;
}): Promise<PortalSignupOtpResult> {
  const allowed = await assertPortalEmailAllowed(input.email);
  if (!allowed.ok) return allowed;

  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Portal ist momentan nicht verfügbar." };
  }

  const email = normalizeKundenEmail(input.email);
  const password = input.password;
  const telefon = trimOrNull(input.telefon);
  const invite = Boolean(input.einladungToken?.trim());
  const kundentyp = normalizePortalRegisterKundeTyp(input.kundentyp);
  const vorname = trimOrNull(input.vorname);
  const nachname = trimOrNull(input.nachname);
  const firma = trimOrNull(input.firma);
  const strasse = trimOrNull(input.strasse);
  const hausnummer = trimOrNull(input.hausnummer);
  const plz = trimOrNull(input.plz);
  const ort = trimOrNull(input.ort);

  const personName = [vorname, nachname].filter(Boolean).join(" ");
  const name =
    firma ||
    personName ||
    input.name.trim() ||
    email.split("@")[0]?.replace(/[._]/g, " ") ||
    "";

  if (!email || !name) {
    return { ok: false, error: "Bitte Name und E-Mail angeben." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Passwort mindestens 8 Zeichen." };
  }
  if (!invite && !kundentyp) {
    return {
      ok: false,
      error: "Bitte wählen Sie, ob Privat, Gewerbe oder Hausverwaltung.",
    };
  }
  if (
    !invite &&
    (kundentyp === "gewerbe" || kundentyp === "hausverwaltung") &&
    !firma
  ) {
    return {
      ok: false,
      error:
        kundentyp === "hausverwaltung"
          ? "Bitte Firmenname der Hausverwaltung angeben."
          : "Bitte Firmenname angeben.",
    };
  }
  if (!invite && (!vorname || !nachname)) {
    return { ok: false, error: "Bitte Vor- und Nachname angeben." };
  }
  if (!invite && (!strasse || !hausnummer || !plz || !ort)) {
    return {
      ok: false,
      error: "Bitte Straße, Hausnummer, PLZ und Ort angeben.",
    };
  }

  const availability = await ensurePortalRegistrationEmailAvailable(email);
  if (!availability.ok) return availability;

  const now = new Date().toISOString();
  const meta: Record<string, unknown> = {
    name,
    telefon,
    datenschutz_akzeptiert_at: now,
    agb_akzeptiert_at: now,
  };
  if (kundentyp) meta.kundentyp = kundentyp;
  if (vorname) meta.vorname = vorname;
  if (nachname) meta.nachname = nachname;
  if (firma) meta.firma = firma;
  if (strasse) meta.strasse = strasse;
  if (hausnummer) meta.hausnummer = hausnummer;
  if (plz) meta.plz = plz;
  if (ort) meta.ort = ort;
  if (input.einladungToken?.trim()) {
    meta.portal_einladung_token = input.einladungToken.trim();
  }

  const { data: created, error: createErr } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: meta,
    });

  if (createErr || !created.user) {
    const msg = createErr?.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("registered")) {
      const { reclaimOrphanPortalAuthUser } = await import(
        "@/lib/portal/reclaim-orphan-portal-auth"
      );
      if ((await reclaimOrphanPortalAuthUser(email)) === "deleted") {
        const retry = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: false,
          user_metadata: meta,
        });
        if (!retry.error && retry.data.user) {
          return issueSignupOtp({
            email,
            userId: retry.data.user.id,
            vorname: vorname ?? name.split(/\s+/)[0],
            brand: "meinbaerenwald",
          });
        }
      }
      return {
        ok: false,
        error: "Diese E-Mail ist bereits registriert. Bitte melden Sie sich an.",
      };
    }
    console.error("[registerMeinBaerenwaldWithOtp]", createErr);
    return {
      ok: false,
      error: createErr?.message || "Registrierung fehlgeschlagen.",
    };
  }

  return issueSignupOtp({
    email,
    userId: created.user.id,
    vorname: vorname ?? name.split(/\s+/)[0],
    brand: "meinbaerenwald",
  });
}

export async function registerPartnerWithOtp(input: {
  email: string;
  password: string;
  rahmenAkzeptiert: boolean;
}): Promise<PortalSignupOtpResult> {
  const allowed = await assertPartnerEmailAllowed(input.email);
  if (!allowed.ok) return allowed;

  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Portal ist momentan nicht verfügbar." };
  }

  const email = normalizeKundenEmail(input.email);
  if (!email) return { ok: false, error: "Ungültige E-Mail." };
  if (input.password.length < 8) {
    return { ok: false, error: "Passwort mindestens 8 Zeichen." };
  }

  const check = await verifyPartnerRegistrationEmail(email);
  if (!check.ok) return check;

  const rvRes = await acceptPartnerRahmenvertragForEmail({
    email,
    akzeptiert: input.rahmenAkzeptiert,
  });
  if (!rvRes.ok) return rvRes;

  const { data: created, error: createErr } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: false,
      user_metadata: {
        portal_role: "handwerker",
        rv_akzeptiert_at: new Date().toISOString(),
      },
    });

  if (createErr || !created.user) {
    const msg = createErr?.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("registered")) {
      return { ok: false, error: PARTNER_AUTH_COPY.errors.bereitsRegistriert };
    }
    console.error("[registerPartnerWithOtp]", createErr);
    return {
      ok: false,
      error: createErr?.message || "Registrierung fehlgeschlagen.",
    };
  }

  return issueSignupOtp({
    email,
    userId: created.user.id,
    brand: "partner",
  });
}

export async function resendPortalSignupCode(
  emailRaw: string,
  brand: PortalOtpBrand = "meinbaerenwald"
): Promise<PortalSignupOtpResult> {
  if (brand === "partner") {
    const allowed = await assertPartnerEmailAllowed(emailRaw);
    if (!allowed.ok) return allowed;
  } else {
    const allowed = await assertPortalEmailAllowed(emailRaw);
    if (!allowed.ok) return allowed;
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Portal ist momentan nicht verfügbar." };
  }

  const email = normalizeKundenEmail(emailRaw);
  if (!email) return { ok: false, error: "Ungültige E-Mail." };

  const userId = await resolveUnconfirmedUserId(email);
  if (!userId) {
    return {
      ok: false,
      error: "Kein ausstehender Code für diese E-Mail.",
    };
  }

  const code = generateFunnelOtpCode();
  try {
    await storeFunnelOtp({ email, code, userId });
  } catch (e) {
    console.error("[resendPortalSignupCode]", e);
    return { ok: false, error: "Code konnte nicht erzeugt werden." };
  }

  const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
  const meta = userData.user?.user_metadata ?? {};
  const vorname =
    typeof meta.vorname === "string"
      ? meta.vorname
      : typeof meta.name === "string"
        ? meta.name.split(/\s+/)[0]
        : undefined;

  return sendFunnelOtpEmail({ email, code, vorname, brand });
}

export async function confirmPortalSignupCode(opts: {
  email: string;
  code: string;
  brand?: PortalOtpBrand;
}): Promise<PortalSignupOtpResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Portal ist momentan nicht verfügbar." };
  }

  const result = await verifyFunnelOtp(opts);
  if (!result.ok) return result;

  const email = normalizeKundenEmail(opts.email) ?? "";
  const brand = opts.brand ?? "meinbaerenwald";

  if (brand === "partner") {
    const link = await linkPortalHandwerkerToAuthUser({
      userId: result.userId,
      email,
    });
    if (!link.ok) return { ok: false, error: link.error };
    return { ok: true };
  }

  const { data: userData } = await supabaseAdmin.auth.admin.getUserById(
    result.userId
  );
  const meta = (userData.user?.user_metadata ?? {}) as Record<string, unknown>;
  const kundentyp = normalizePortalRegisterKundeTyp(meta.kundentyp) as
    | PortalRegisterKundeTyp
    | null;
  const metaStr = (key: string) =>
    typeof meta[key] === "string" ? (meta[key] as string) : null;
  const link = await linkPortalKundeToAuthUser({
    userId: result.userId,
    email,
    name: metaStr("name") ?? email.split("@")[0] ?? email,
    telefon: metaStr("telefon"),
    typ: kundentyp,
    vorname: metaStr("vorname"),
    nachname: metaStr("nachname"),
    firma: metaStr("firma"),
    strasse: metaStr("strasse"),
    hausnummer: metaStr("hausnummer"),
    plz: metaStr("plz"),
    ort: metaStr("ort"),
  });
  if (!link.ok) return { ok: false, error: link.error };

  return { ok: true };
}
