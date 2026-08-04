import { NextResponse } from "next/server";

import {
  redeemPortalEinladung,
  resolvePortalEinladungByToken,
} from "@/lib/portal2/portal-einladungen-server";
import { createClient } from "@/lib/supabase/server";

type Props = { params: { token: string } };

/** Öffentlich: Einladung + HV-Branding für Registrierungsseite. */
export async function GET(_req: Request, { params }: Props) {
  const resolved = await resolvePortalEinladungByToken(params.token);
  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.error },
      { status: resolved.status }
    );
  }
  const { data } = resolved;
  return NextResponse.json({
    status: data.status,
    brand: data.brand,
    objektTitel: data.objektTitel,
    einheitLabel: data.einheitLabel,
    orgKennung: data.orgKennung,
    canRegister: data.status === "offen",
  });
}

/**
 * Einlösen nach Auth (Signup/Login) — Zuordnung Mieter↔Einheit.
 * Landing danach: /portal (D10).
 */
export async function POST(_req: Request, { params }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const result = await redeemPortalEinladung({
    token: params.token,
    authUserId: user.id,
    email: user.email,
    name: (user.user_metadata as { name?: string })?.name,
    telefon: (user.user_metadata as { telefon?: string })?.telefon,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({
    ok: true,
    portalKundeId: result.portalKundeId,
    redirectTo: "/portal",
  });
}
