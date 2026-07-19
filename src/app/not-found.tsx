import Link from "next/link";

import { PageLayout } from "@/components/layout/PageLayout";

export default function NotFound() {
  return (
    <PageLayout>
      <div className="baerenwald-landing">
        <div className="page-hero">
          <div className="page-hero-inner" style={{ maxWidth: 640, textAlign: "center" }}>
            <p className="page-hero-eyebrow">404</p>
            <h1 className="page-hero-h1">Diese Seite gibt es nicht.</h1>
            <p className="page-hero-sub" style={{ margin: "0 auto" }}>
              Der Link ist veraltet oder die Adresse wurde falsch eingegeben.
              Starte neu — wir helfen dir beim nächsten Schritt.
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                justifyContent: "center",
                marginTop: 28,
              }}
            >
              <Link href="/" className="btn-pill-primary">
                Zur Startseite
              </Link>
              <Link href="/kontakt" className="btn-pill-outline">
                Kontakt aufnehmen
              </Link>
              <Link href="/ratgeber" className="btn-pill-outline">
                Ratgeber
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
