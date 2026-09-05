import { MeldeFehlerClient } from "@/components/melden/MeldeFehlerClient";
import { PortalEinladungRegisterForm } from "@/components/portal/PortalEinladungRegisterForm";
import { resolvePortalEinladungByToken } from "@/lib/portal2/portal-einladungen-server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Einladung — Konto anlegen",
  robots: { index: false, follow: false },
};

type Props = { params: { token: string } };

/**
 * E4 — Link → Konto im HV-Branding → Mieter↔Einheit → /portal (D10).
 */
export default async function PortalEinladungPage({ params }: Props) {
  const token = params.token?.trim() ?? "";
  const resolved = await resolvePortalEinladungByToken(token);

  if (!resolved.ok) {
    return <MeldeFehlerClient brand={null} />;
  }

  const { data } = resolved;

  // Bereits eingeloggt + offene Einladung → einlösen und zum Portal
  if (data.status === "offen") {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) {
      const { redeemPortalEinladung } = await import(
        "@/lib/portal2/portal-einladungen-server"
      );
      const redeemed = await redeemPortalEinladung({
        token,
        authUserId: user.id,
        email: user.email,
        name: (user.user_metadata as { name?: string })?.name,
        telefon: (user.user_metadata as { telefon?: string })?.telefon,
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

  return (
    <PortalEinladungRegisterForm
      token={token}
      brand={data.brand}
      objektTitel={data.objektTitel}
      einheitLabel={data.einheitLabel}
      canRegister={data.status === "offen"}
      statusHint={statusHint}
    />
  );
}
