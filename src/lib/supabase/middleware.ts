import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  AUTH_SESSION_COOKIE_OPTIONS,
  applyAuthSessionCookieOptions,
} from "@/lib/supabase/auth-session";

const PUBLIC_PORTAL_PATHS = [
  "/portal/login",
  "/portal/registrieren",
  "/portal/passwort-vergessen",
  "/portal/passwort-neu",
];

const PUBLIC_PARTNER_PATHS = [
  "/partner/login",
  "/partner/registrieren",
  "/partner/passwort-vergessen",
  "/partner/passwort-neu",
];

type AuthArea = "portal" | "partner";

function getAuthArea(path: string): AuthArea | null {
  if (path.startsWith("/portal")) return "portal";
  if (path.startsWith("/partner")) return "partner";
  return null;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: AUTH_SESSION_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(
              name,
              value,
              applyAuthSessionCookieOptions(options)
            )
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const area = getAuthArea(path);

  if (!area) {
    return supabaseResponse;
  }

  const publicPaths =
    area === "portal" ? PUBLIC_PORTAL_PATHS : PUBLIC_PARTNER_PATHS;
  const loginPath = area === "portal" ? "/portal/login" : "/partner/login";
  const homePath = area === "portal" ? "/portal" : "/partner";
  const authPrefix = area === "portal" ? "/portal/auth/" : "/partner/auth/";

  const isAuthCallback = path.startsWith(authPrefix);
  const isPublic =
    publicPaths.some((p) => path === p || path.startsWith(`${p}/`)) ||
    isAuthCallback;

  const segments = path.split("/").filter(Boolean);
  if (segments.length === 2 && segments[0] === area) {
    const sub = segments[1];
    const knownRoutes = new Set([
      "login",
      "registrieren",
      "passwort-vergessen",
      "passwort-neu",
      "auth",
    ]);
    if (!knownRoutes.has(sub)) {
      const url = request.nextUrl.clone();
      url.pathname = loginPath;
      return NextResponse.redirect(url);
    }
  }

  if (!user && !isPublic && path !== loginPath) {
    const url = request.nextUrl.clone();
    url.pathname = loginPath;
    url.search = "";
    const nextTarget = path + request.nextUrl.search;
    url.searchParams.set("next", nextTarget);
    return NextResponse.redirect(url);
  }

  const emailConfirmed = Boolean(
    user?.email_confirmed_at ?? user?.confirmed_at
  );

  const passwordUpdatePath =
    area === "portal" ? "/portal/passwort-neu" : "/partner/passwort-neu";

  if (user && !emailConfirmed && !isPublic && path !== loginPath) {
    if (path === passwordUpdatePath) {
      return supabaseResponse;
    }
    const url = request.nextUrl.clone();
    url.pathname = loginPath;
    url.searchParams.set("hint", "confirm");
    return NextResponse.redirect(url);
  }

  const registerPath =
    area === "portal" ? "/portal/registrieren" : "/partner/registrieren";

  if (
    user &&
    emailConfirmed &&
    (path === loginPath || path === registerPath)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = homePath;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
