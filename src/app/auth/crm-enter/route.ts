import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  adminViewCookiePayload,
  establishPortalSessionForEmail,
} from "@/lib/auth/crm-impersonation-session";
import { applyAuthSessionCookieOptions } from "@/lib/supabase/auth-session";

type ImpersonationPayload = {
  email: string;
  roleLabel: string;
  targetType: string;
  targetId: string;
  adminId: string;
  adminEmail: string;
  exp: number;
  jti: string;
};

function secret(): string | null {
  return process.env.PARTNER_INTERNAL_API_SECRET?.trim() || null;
}

function sign(body: string, key: string): string {
  return createHmac("sha256", key).update(body).digest("base64url");
}

function verifyToken(token: string): ImpersonationPayload | null {
  const key = secret();
  if (!key) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = sign(body!, key);
  try {
    const a = Buffer.from(sig!);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(body!, "base64url").toString("utf8")
    ) as ImpersonationPayload;
    if (!payload.email || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Redirect-Ziel: gleicher Origin wie der Request (Cookies greifen). */
function redirectOrigin(request: Request): string {
  try {
    return new URL(request.url).origin;
  } catch {
    return (
      process.env.NEXT_PUBLIC_SITE_URL?.trim()?.replace(/\/$/, "") ||
      "https://baerenwaldmuenchen.de"
    );
  }
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** One-time jti: Markierung used_at; fehlende Tabelle = soft allow + warn. */
async function consumeJti(jti: string): Promise<boolean> {
  const admin = serviceClient();
  if (!admin) return true;
  const { data, error } = await admin
    .from("crm_impersonation_tokens")
    .select("jti, used_at, expires_at")
    .eq("jti", jti)
    .maybeSingle();
  if (error) {
    console.warn("[crm-enter] jti lookup:", error.message);
    return true;
  }
  if (!data) {
    console.warn("[crm-enter] jti unbekannt — erlauben (HMAC ok)");
    return true;
  }
  if (data.used_at) return false;
  if (data.expires_at && new Date(data.expires_at as string).getTime() < Date.now()) {
    return false;
  }
  const { error: upErr } = await admin
    .from("crm_impersonation_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("jti", jti)
    .is("used_at", null);
  if (upErr) {
    console.warn("[crm-enter] jti consume:", upErr.message);
  }
  return true;
}

/** CRM-Admin: Token einlösen → Session serverseitig setzen (ohne Login-Seite). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("t")?.trim() ?? "";
  const next = url.searchParams.get("next")?.trim() || "/portal";
  const origin = redirectOrigin(request);

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.redirect(`${origin}/portal/login?hint=crm_enter_invalid`);
  }

  const fresh = await consumeJti(payload.jti);
  if (!fresh) {
    return NextResponse.redirect(`${origin}/portal/login?hint=crm_enter_invalid`);
  }

  const session = await establishPortalSessionForEmail(payload.email);
  if (!session.ok) {
    console.error("[crm-enter]", session.error);
    return NextResponse.redirect(
      `${origin}/portal/login?hint=crm_enter_failed&msg=${encodeURIComponent(session.error.slice(0, 120))}`
    );
  }

  const target = next.startsWith("/") ? next : `/${next}`;
  const safeTarget =
    target.startsWith("/portal") || target.startsWith("/partner") ? target : "/portal";

  const response = NextResponse.redirect(`${origin}${safeTarget}`);

  // Cookies explizit auf Redirect — cookies()-Store allein reicht oft nicht.
  // Letzter Wert pro Name gewinnt (Clear → Set).
  const byName = new Map<string, (typeof session.cookies)[number]>();
  for (const c of session.cookies) byName.set(c.name, c);
  for (const c of Array.from(byName.values())) {
    response.cookies.set(
      c.name,
      c.value,
      applyAuthSessionCookieOptions(c.options)
    );
  }
  const adminCookie = adminViewCookiePayload({
    roleLabel: payload.roleLabel,
    adminEmail: payload.adminEmail,
  });
  response.cookies.set(adminCookie.name, adminCookie.value, adminCookie.options);

  return response;
}
