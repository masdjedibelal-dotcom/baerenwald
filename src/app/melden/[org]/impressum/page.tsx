import Link from "next/link";
import { redirect } from "next/navigation";

import { MeldeServiceByLine } from "@/components/melden/MeldeServiceByLine";
import { SITE_CONFIG } from "@/lib/config";
import { resolveMeldeKontext } from "@/lib/org/resolve-melde-kontext";

export const metadata = {
  title: "Impressum — Schadenmeldung",
  robots: { index: false, follow: false },
};

type Props = { params: { org: string } };

/**
 * Impressum Mieter-Melde-Routen — Variante B (freigegeben):
 * HV = Diensteanbieterin (Inhalt), Bärenwald = technischer Betrieb.
 */
export default async function MeldenOrgImpressumPage({ params }: Props) {
  const resolved = await resolveMeldeKontext(params.org);
  if (!resolved.ok) redirect(`/melden/fehler?reason=${resolved.code}`);

  const org = resolved.kontext.org;
  const orgName =
    org.org_anzeigename?.trim() || org.name?.trim() || org.org_kennung;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 prose prose-sm">
      <h1>Impressum</h1>
      <h2>Diensteanbieterin (Inhalt)</h2>
      <p>
        {orgName}
        <br />
        Kontakt:{" "}
        {org.mieter_kontakt_email ??
          org.mieter_kontakt_telefon ??
          "siehe Verwaltung"}
      </p>
      <h2>Technischer Betrieb</h2>
      <p>
        {SITE_CONFIG.companyName}
        <br />
        {SITE_CONFIG.addressLine}
        <br />
        {SITE_CONFIG.email}
      </p>
      <p className="not-prose mt-8 flex flex-col gap-3">
        <Link href={`/melden/${params.org}`}>← Zurück zur Meldung</Link>
        <MeldeServiceByLine />
      </p>
    </main>
  );
}
