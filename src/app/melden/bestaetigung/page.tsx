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
          Wir koordinieren den nächsten Schritt. Mit derselben E-Mail kannst du
          den Status in MeinBärenwald verfolgen.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Link href="/portal/registrieren" className="btn-pill-primary text-center">
            MeinBärenwald registrieren
          </Link>
          <Link href="/" className="btn-pill-outline text-center">
            Zur Startseite
          </Link>
        </div>
      </div>
    </div>
  );
}
