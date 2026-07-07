import Link from "next/link";

export const metadata = {
  title: "Meldung eingegangen",
  robots: { index: false, follow: false },
};

export default function MeldenBestaetigungPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center px-4 bg-[#f7f4ef]">
      <div className="max-w-md w-full bg-white rounded-2xl border border-border-light p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-text-primary">
          Danke — Meldung ist bei uns
        </h1>
        <p className="text-text-secondary mt-2 text-sm">
          Deine Hausverwaltung und Bärenwald haben die Meldung erhalten. Wir
          melden uns, sobald der nächste Schritt geklärt ist.
        </p>
        <p className="text-text-tertiary mt-2 text-xs">
          Referenz findest du in der Bestätigungs-E-Mail. MeinBärenwald ist
          optional — keine Voraussetzung für die Bearbeitung.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Link href="/portal/registrieren" className="btn-pill-primary text-center">
            Status in MeinBärenwald verfolgen
          </Link>
          <Link href="/" className="btn-pill-outline text-center">
            Zur Startseite
          </Link>
        </div>
      </div>
    </div>
  );
}
