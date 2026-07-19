import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  brandFromOrgKunde,
  toAushangObjektView,
} from "@/components/shared/PortalModalAushang";
import { PortalAushangPrintClient } from "@/components/shared/PortalAushangPrintClient";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { aushangUrl } from "@/lib/portal2/aushang";
import { supabaseAdmin } from "@/lib/supabase";

type Props = { params: { objektId: string } };

/**
 * E3 — druckbare Aushang-Ansicht (A4) mit HV-Branding und echtem Melde-QR.
 */
export default async function PortalAushangPrintPage({ params }: Props) {
  const { objektId } = params;
  const session = await requireOrganisationSession();
  if (!session.ok) {
    redirect(
      `/portal/login?next=${encodeURIComponent(`/portal/aushang/${objektId}`)}`
    );
  }

  const orgKennung = session.kunde.org_kennung?.trim();
  if (!orgKennung) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-text-secondary">
          Melde-Kennung fehlt — Aushang nicht verfügbar.
        </p>
        <Link href="/portal" className="mt-4 inline-block text-accent underline">
          Zum Portal
        </Link>
      </main>
    );
  }

  const { data: objekt, error } = await supabaseAdmin
    .from("kunden_objekte")
    .select(
      "id, titel, strasse, hausnummer, plz, ort, melde_slug, melde_aktiv"
    )
    .eq("id", objektId)
    .eq("kunde_id", session.kunde.id)
    .maybeSingle();

  if (error || !objekt) notFound();
  if (!objekt.melde_slug?.trim() || !objekt.melde_aktiv) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-text-secondary">
          Melde-Link für dieses Objekt ist nicht aktiv.
        </p>
        <Link href="/portal" className="mt-4 inline-block text-accent underline">
          Zum Portal
        </Link>
      </main>
    );
  }

  const view = toAushangObjektView(objekt);
  const brand = brandFromOrgKunde(session.kunde);
  const meldeUrl = aushangUrl(orgKennung, {
    melde_slug: objekt.melde_slug,
    name: objekt.titel,
  });

  return (
    <PortalAushangPrintClient
      brand={brand}
      objekt={view}
      meldeUrl={meldeUrl}
    />
  );
}
