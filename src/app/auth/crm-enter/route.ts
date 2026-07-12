import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

import { supabaseAdmin } from "@/lib/supabase";

const COOKIE_NAME = "bw_admin_view";

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

/** CRM-Admin: Token einlösen → Magic-Link-Session + Banner-Cookie. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("t")?.trim() ?? "";
  const next = url.searchParams.get("next")?.trim() || "/portal";

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.redirect(`${siteOrigin()}/portal/login?hint=crm_enter_invalid`);
  }

  const redirectTo = `${siteOrigin()}${next.startsWith("/") ? next : `/${next}`}`;

  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: payload.email,
    options: { redirectTo },
  });

  const actionLink = linkData?.properties?.action_link?.trim();
  if (linkErr || !actionLink) {
    console.error("[crm-enter]", linkErr?.message);
    return NextResponse.redirect(`${siteOrigin()}/portal/login?hint=crm_enter_failed`);
  }

  const cookieStore = await cookies();
  cookieStore.set(
    COOKIE_NAME,
    JSON.stringify({
      roleLabel: payload.roleLabel,
      adminEmail: payload.adminEmail,
      startedAt: new Date().toISOString(),
    }),
    {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 4,
      path: "/",
    }
  );

  return NextResponse.redirect(actionLink);
}
