import Link from "next/link";
import { redirect } from "next/navigation";

import { SITE_CONFIG } from "@/lib/config";
import { resolveMeldeKontext } from "@/lib/org/resolve-melde-kontext";

export const metadata = {
  title: "Impressum — Schadenmeldung",
  robots: { index: false, follow: false },
};

type Props = { params: { org: string } };

/**
 * Impressum Mieter-Melde-Routen — Variante B (Entwurf): HV + technischer Betreiber.
 * Endgültige Variante wählt der Anwalt (siehe docs/legal/MIETER_IMPRESSUM_VARIANTEN.md).
 */
export default async function MeldenOrgImpressumPage({ params }: Props) {
  const resolved = await resolveMeldeKontext(params.org);
  if (!resolved.ok) redirect(`/melden/fehler?reason=${resolved.code}`);

  const org = resolved.kontext.org;
  const orgName =
    org.org_anzeigename?.trim() || org.name?.trim() || org.org_kennung;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 prose prose-sm">
      <p className="text-xs text-amber-800 bg-amber-50 rounded-lg p-3 not-prose">
        <strong>Entwurf — Variante B.</strong> Anwaltliche Freigabe ausstehend.
      </p>
      <h1>Impressum</h1>
      <h2>Diensteanbieterin (Inhalt)</h2>
      <p>
        {orgName}
        <br />
        Kontakt: {org.mieter_kontakt_email ?? org.mieter_kontakt_telefon ?? "siehe Hausverwaltung"}
      </p>
      <h2>Technischer Betrieb</h2>
      <p>
        {SITE_CONFIG.companyName}
        <br />
        {SITE_CONFIG.addressLine}
        <br />
        {SITE_CONFIG.email}
      </p>
      <p className="text-sm text-text-secondary">
        Unauffälliger Footer-Link — kein Marketing. Siehe White-Label-Konzept.
      </p>
      <p>
        <Link href={`/melden/${params.org}`}>← Zurück zur Meldung</Link>
      </p>
    </main>
  );
}
