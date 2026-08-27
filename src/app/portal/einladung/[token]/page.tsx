import { Suspense } from "react";
import { redirect } from "next/navigation";

import { MeldeFehlerClient } from "@/components/melden/MeldeFehlerClient";
import { PortalAuthShell } from "@/components/portal/PortalAuthShell";
import { PortalRegisterForm } from "@/components/portal/PortalRegisterForm";
import { AUTH_INVITE } from "@/lib/portal2/auth";
import { resolvePortalEinladungByToken } from "@/lib/portal2/portal-einladungen-server";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Einladung — Konto aktivieren",
  robots: { index: false, follow: false },
};

type Props = { params: { token: string } };

/**
 * E4 — gleiche Auth-Shell wie HV-Registrierung (PortalAuthShell + PortalRegisterForm),
 * Whitelabel der Verwaltung + rollenspezifische Vorteile (Mieter/Eigentümer).
 */
export default async function PortalEinladungPage({ params }: Props) {
  const token = params.token?.trim() ?? "";
  const resolved = await resolvePortalEinladungByToken(token);

  if (!resolved.ok) {
    return <MeldeFehlerClient brand={null} />;
  }

  const { data } = resolved;
  const inviteEmail = data.prefill.email?.trim().toLowerCase() || "";

  // Nur auto-einlösen, wenn Session zur eingeladenen E-Mail gehört
  if (data.status === "offen" && inviteEmail) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const sessionEmail = user?.email?.trim().toLowerCase() || "";
    if (user?.email && sessionEmail === inviteEmail) {
      const { redeemPortalEinladung } = await import(
        "@/lib/portal2/portal-einladungen-server"
      );
      const redeemed = await redeemPortalEinladung({
        token,
        authUserId: user.id,
        email: user.email,
        name:
          data.prefill.name ||
          (user.user_metadata as { name?: string })?.name,
        telefon:
          data.prefill.telefon ||
          (user.user_metadata as { telefon?: string })?.telefon,
      });
      if (redeemed.ok) redirect("/portal");
    }
  }

  const statusHint =
    data.status === "eingeloest"
      ? "Diese Einladung wurde bereits eingelöst. Bitte melden Sie sich an."
      : data.status === "abgelaufen"
        ? "Diese Einladung ist abgelaufen. Bitte Ihre Verwaltung um einen neuen Link."
        : "Diese Einladung ist nicht mehr gültig.";

  const subtitle =
    data.rolle === "eigentuemer"
      ? AUTH_INVITE.subtitleEigentuemer
      : data.rolle === "hausmeister"
        ? AUTH_INVITE.subtitleHausmeister
        : AUTH_INVITE.subtitleMieter;

  const objektLine = [data.objektTitel, data.einheitLabel]
    .filter(Boolean)
    .join(" · ");

  if (data.status !== "offen") {
    return (
      <PortalAuthShell
        title={AUTH_INVITE.title}
        subtitle={statusHint}
        brand="whitelabel"
        authRole={data.rolle}
        orgName={data.brand.name}
        orgSub={data.brand.sub}
        logoKuerzel={data.brand.logoKuerzel}
        orgPrimary={data.brand.primary}
        orgPrimaryDk={data.brand.primaryDk}
        orgSoft={data.brand.soft}
        inviteRole={data.rolle}
      >
        <p className="portal-text-body text-text-secondary">
          {objektLine ? `${objektLine}. ` : null}
          <a
            href={`/portal/login?role=${data.rolle}&next=${encodeURIComponent("/portal")}`}
            className="font-semibold text-accent underline-offset-2 hover:underline"
          >
            Zum Login
          </a>
        </p>
      </PortalAuthShell>
    );
  }

  const hasPrefill = Boolean(
    data.prefill.name?.trim() || data.prefill.email?.trim()
  );

  return (
    <PortalAuthShell
      title={AUTH_INVITE.title}
      subtitle={
        objektLine ? `${subtitle} (${objektLine})` : subtitle
      }
      brand="whitelabel"
      authRole={data.rolle}
      orgName={data.brand.name}
      orgSub={data.brand.sub}
      logoKuerzel={data.brand.logoKuerzel}
      orgPrimary={data.brand.primary}
      orgPrimaryDk={data.brand.primaryDk}
      orgSoft={data.brand.soft}
      inviteRole={data.rolle}
    >
      <Suspense
        fallback={
          <p className="text-center text-sm text-text-secondary">Laden…</p>
        }
      >
        <PortalRegisterForm
          einladungToken={token}
          inviteRole={data.rolle}
          submitLabel={AUTH_INVITE.submit}
          lockedHint={
            hasPrefill
              ? data.rolle === "hausmeister"
                ? AUTH_INVITE.lockedHintHausmeister
                : AUTH_INVITE.lockedHint
              : null
          }
          prefill={{
            name: data.prefill.name ?? undefined,
            email: data.prefill.email ?? undefined,
            telefon: data.prefill.telefon ?? undefined,
            locked: hasPrefill,
          }}
        />
      </Suspense>
    </PortalAuthShell>
  );
}
