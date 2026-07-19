import Link from "next/link";

import { resolveMeldeKontext } from "@/lib/org/resolve-melde-kontext";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Datenschutzhinweis — Schadenmeldung",
  robots: { index: false, follow: false },
};

type Props = { params: { org: string } };

/** Org-spezifischer Datenschutzhinweis Mieter-Meldeflow — Entwurf, siehe docs/legal/. */
export default async function MeldenOrgDatenschutzPage({ params }: Props) {
  const resolved = await resolveMeldeKontext(params.org);
  if (!resolved.ok) redirect(`/melden/fehler?reason=${resolved.code}`);

  const org = resolved.kontext.org;
  const orgName =
    org.org_anzeigename?.trim() || org.name?.trim() || org.org_kennung;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 prose prose-sm">
      <p className="text-xs text-amber-800 bg-amber-50 rounded-lg p-3 not-prose">
        <strong>Entwurf zur anwaltlichen Prüfung.</strong> Keine rechtsverbindliche
        Fassung. Siehe internes Rechtspaket in docs/legal/.
      </p>
      <h1>Datenschutzhinweis — Schadenmeldung</h1>
      <p>
        <strong>Verantwortlicher:</strong> {orgName}
        {org.mieter_kontakt_email ? ` · ${org.mieter_kontakt_email}` : ""}
        {org.mieter_kontakt_telefon ? ` · ${org.mieter_kontakt_telefon}` : ""}
      </p>
      <h2>Dienstleister</h2>
      <p>
        Für den technischen Betrieb der Meldeplattform setzt Ihre Hausverwaltung einen
        technischen Dienstleister ein. Beauftragte Handwerksbetriebe erhalten die für
        die Termin- und Ausführungskoordination erforderlichen Angaben.
      </p>
      <h2>Zwecke</h2>
      <p>
        Bearbeitung Ihrer Meldung, Terminkoordination, Ausführung und Dokumentation
        der Reparatur.
      </p>
      <h2>Empfänger</h2>
      <p>
        Beauftragte Handwerksbetriebe zur Terminwahrnehmung und Ausführung (Einordnung
        siehe Rechtspaket Teil A.8).
      </p>
      <h2>Speicherdauer</h2>
      <p>
        Bis Abschluss des Vorgangs; danach gemäß Löschkonzept (docs/legal/LOESCHKONZEPT_ENTWURF.md).
      </p>
      <h2>Ihre Rechte</h2>
      <p>
        Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch, Beschwerde bei
        der Aufsichtsbehörde. Wenden Sie sich an Ihre Hausverwaltung ({orgName}).
      </p>
      <p>
        <Link href={`/melden/${params.org}`}>← Zurück zur Meldung</Link>
      </p>
    </main>
  );
}
