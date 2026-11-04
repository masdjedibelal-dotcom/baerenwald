import type { Metadata } from "next";

import { PageLayout } from "@/components/layout/PageLayout";
import { SITE_CONFIG } from "@/lib/config";

export const metadata: Metadata = {
  title: "Kontakt — Bärenwald München",
  description: `Bauvorhaben besprechen: Projekt anfragen, anrufen oder E-Mail schreiben — wir melden uns ${SITE_CONFIG.responseSlaWithin}.`,
};

export default function KontaktPage() {
  return (
    <PageLayout>
      <div className="baerenwald-landing">
        <div className="page-hero">
          <div className="page-hero-inner">
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <a href="/">Startseite</a>
              <span className="breadcrumb-sep" aria-hidden>
                ›
              </span>
              <span className="breadcrumb-current">Kontakt</span>
            </nav>
            <h1 className="page-hero-h1">Lassen Sie uns Ihr Bauvorhaben besprechen.</h1>
            <p className="page-hero-sub">
              Umbau, Sanierung oder neue Außenanlage: Senden Sie uns eine kurze
              Beschreibung. Wir melden uns in der Regel{" "}
              {SITE_CONFIG.responseSlaWithin}.
            </p>
          </div>
        </div>

        <section className="article-section article-section--lg content-section--white">
          <div className="article-section-inner">
            <div className="article-body legal-body">
              <p>
                <strong>📞 Anrufen</strong>
                <br />
                {SITE_CONFIG.phone}
                <br />
                Mo–Fr 8–18 Uhr
                <br />
                <a href={SITE_CONFIG.phoneHref}>Jetzt anrufen →</a>
              </p>

              <p>
                <strong>✉️ E-Mail schreiben</strong>
                <br />
                {SITE_CONFIG.email}
                <br />
                Antwort {SITE_CONFIG.responseSlaWithin}.
                <br />
                <a href={`mailto:${SITE_CONFIG.email}`}>E-Mail schreiben →</a>
              </p>

              <h2 className="mt-8">Wo wir tätig sind</h2>
              <p>
                München &amp; Umgebung —
                <br />
                alle Stadtteile,
                <br />
                Umkreis ca. 70 km.
              </p>

              <p>
                ✓ Eigene Gewerke und rund 70 Partnerbetriebe
                <br />
                ✓ Kostenrahmen online berechnen
                <br />
                ✓ Ein Ansprechpartner — vom einzelnen Gewerk bis zum Gesamtprojekt
              </p>

              <div className="mt-10 flex flex-wrap gap-3" role="group" aria-label="Kontaktaktionen">
                <a href="/rechner?modus=anfrage" className="btn-pill-primary inline-flex py-2.5 px-5 text-fs-meta">
                  Projekt anfragen →
                </a>
                <a
                  href={SITE_CONFIG.phoneHref}
                  className="inline-flex items-center rounded-pill border border-border-default px-5 py-2.5 text-fs-meta font-semibold text-text-primary hover:bg-muted"
                >
                  Jetzt anrufen →
                </a>
                <a
                  href={`mailto:${SITE_CONFIG.email}`}
                  className="inline-flex items-center rounded-pill border border-border-default px-5 py-2.5 text-fs-meta font-semibold text-text-primary hover:bg-muted"
                >
                  E-Mail schreiben →
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
