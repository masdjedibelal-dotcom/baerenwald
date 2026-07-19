"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/** Fallback für alte Reset-Links mit `/auth/callback?code=…&next=…` */
function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/portal/passwort-neu";
    const loginPath = next.startsWith("/partner") ? "/partner/login" : "/portal/login";

    if (!code) {
      router.replace(`${loginPath}?error=auth`);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        router.replace(`${loginPath}?error=auth`);
        return;
      }
      router.replace(next);
      router.refresh();
    });
  }, [router, searchParams]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4">
      <p className="portal-text-body text-text-secondary">Anmeldung wird vorbereitet…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center px-4">
          <p className="portal-text-body text-text-secondary">Wird geladen…</p>
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
