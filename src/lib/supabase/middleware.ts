import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PORTAL_PATHS = [
  "/portal/login",
  "/portal/registrieren",
  "/portal/passwort-vergessen",
];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPortal = path.startsWith("/portal");
  const isAuthCallback = path.startsWith("/portal/auth/");
  const isPublic =
    PUBLIC_PORTAL_PATHS.some((p) => path === p || path.startsWith(`${p}/`)) ||
    isAuthCallback;

  if (!isPortal) {
    return supabaseResponse;
  }

  // Alte Token-URLs /portal/{uuid} → Login
  const portalSegments = path.split("/").filter(Boolean);
  if (portalSegments[0] === "portal" && portalSegments.length === 2) {
    const sub = portalSegments[1];
    const knownRoutes = new Set([
      "login",
      "registrieren",
      "passwort-vergessen",
      "auth",
    ]);
    if (!knownRoutes.has(sub)) {
      const url = request.nextUrl.clone();
      url.pathname = "/portal/login";
      return NextResponse.redirect(url);
    }
  }

  if (!user && !isPublic && path !== "/portal/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/portal/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  const emailConfirmed = Boolean(
    user?.email_confirmed_at ?? user?.confirmed_at
  );

  if (
    user &&
    !emailConfirmed &&
    !isPublic &&
    path !== "/portal/login"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/portal/login";
    url.searchParams.set("hint", "confirm");
    return NextResponse.redirect(url);
  }

  if (user && emailConfirmed && (path === "/portal/login" || path === "/portal/registrieren")) {
    const url = request.nextUrl.clone();
    url.pathname = "/portal";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
