"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Fallback: Supabase leitet manchmal auf die Site-URL statt auf /portal/passwort-neu,
 * wenn die Redirect-URL nicht freigeschaltet ist — oder liefert Tokens im Hash.
 */
export function AuthRecoveryRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onPasswordPage =
      pathname?.includes("/passwort-neu") || pathname?.includes("/auth/callback");
    if (onPasswordPage) return;

    const code = searchParams.get("code");
    const type = searchParams.get("type");
    if (code) {
      const dest =
        type === "recovery" || searchParams.get("next")?.includes("passwort")
          ? pathname?.startsWith("/partner")
            ? "/partner/passwort-neu"
            : "/portal/passwort-neu"
          : pathname?.startsWith("/partner")
            ? "/partner"
            : "/portal";
      router.replace(`${dest}?code=${encodeURIComponent(code)}`);
      return;
    }

    const hash = window.location.hash.slice(1);
    if (!hash.includes("access_token")) return;

    const hashParams = new URLSearchParams(hash);
    if (hashParams.get("type") !== "recovery") return;

    const dest = pathname?.startsWith("/partner")
      ? "/partner/passwort-neu"
      : "/portal/passwort-neu";

    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    router.replace(dest);
  }, [pathname, router, searchParams]);

  return null;
}
