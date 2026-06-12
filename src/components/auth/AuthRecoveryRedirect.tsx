"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Fallback: Supabase leitet manchmal auf die Site-URL statt auf /auth/callback,
 * wenn die Redirect-URL nicht freigeschaltet ist — oder liefert Tokens im Hash.
 */
export function AuthRecoveryRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onAuthRoute =
      pathname?.includes("/auth/callback") || pathname?.includes("/passwort-neu");
    if (onAuthRoute) return;

    const code = searchParams.get("code");
    const type = searchParams.get("type");
    if (code) {
      const next =
        type === "recovery"
          ? pathname?.startsWith("/partner")
            ? "/partner/passwort-neu"
            : "/portal/passwort-neu"
          : pathname?.startsWith("/partner")
            ? "/partner"
            : "/portal";
      const qs = new URLSearchParams({ code, next });
      router.replace(`/auth/callback?${qs.toString()}`);
      return;
    }

    const hash = window.location.hash.slice(1);
    if (!hash.includes("access_token")) return;

    const hashParams = new URLSearchParams(hash);
    if (hashParams.get("type") !== "recovery") return;

    const supabase = getSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "PASSWORD_RECOVERY" && event !== "SIGNED_IN") return;
      if (!session) return;

      subscription.unsubscribe();
      const role = session.user.user_metadata?.portal_role;
      const dest =
        role === "handwerker" || pathname?.startsWith("/partner")
          ? "/partner/passwort-neu"
          : "/portal/passwort-neu";

      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      );
      router.replace(dest);
    });

    return () => subscription.unsubscribe();
  }, [pathname, router, searchParams]);

  return null;
}
