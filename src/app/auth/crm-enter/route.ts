import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

import {
  establishPortalSessionForEmail,
  setAdminViewCookie,
} from "@/lib/auth/crm-impersonation-session";

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

function siteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim()?.replace(/\/$/, "") ||
    "https://baerenwaldmuenchen.de"
  );
}

/** CRM-Admin: Token einlösen → Session serverseitig setzen (ohne Login-Seite). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("t")?.trim() ?? "";
  const next = url.searchParams.get("next")?.trim() || "/portal";

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.redirect(`${siteOrigin()}/portal/login?hint=crm_enter_invalid`);
  }

  const session = await establishPortalSessionForEmail(payload.email);
  if (!session.ok) {
    console.error("[crm-enter]", session.error);
    return NextResponse.redirect(
      `${siteOrigin()}/portal/login?hint=crm_enter_failed&msg=${encodeURIComponent(session.error.slice(0, 120))}`
    );
  }

  setAdminViewCookie({
    roleLabel: payload.roleLabel,
    adminEmail: payload.adminEmail,
  });

  const target = next.startsWith("/") ? next : `/${next}`;
  const safeTarget =
    target.startsWith("/portal") || target.startsWith("/partner") ? target : "/portal";

  return NextResponse.redirect(`${siteOrigin()}${safeTarget}`);
}
