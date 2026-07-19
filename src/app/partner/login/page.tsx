import { Suspense } from "react";
import { redirect } from "next/navigation";

import { PartnerAuthShell } from "@/components/partner/PartnerAuthShell";
import { PartnerLoginForm } from "@/components/partner/PartnerLoginForm";
import { AUTH_LOGIN, authBrandName } from "@/lib/portal2/auth";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Partner-Anmeldung — Bärenwald",
  robots: { index: false, follow: false },
};

export default async function PartnerLoginPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) {
      const nextRaw = searchParams?.next;
      const next =
        typeof nextRaw === "string" && nextRaw.startsWith("/partner")
          ? nextRaw
          : "/partner";
      redirect(next);
    }
  }

  const brand = authBrandName("handwerker");

  return (
    <PartnerAuthShell
      title={AUTH_LOGIN.title}
      subtitle={AUTH_LOGIN.subtitle(brand)}
    >
      <Suspense fallback={<p className="portal-text-body text-center">Laden…</p>}>
        <PartnerLoginForm />
      </Suspense>
    </PartnerAuthShell>
  );
}
