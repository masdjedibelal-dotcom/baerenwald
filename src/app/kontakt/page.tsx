import type { Metadata } from "next";

import { PageLayout } from "@/components/layout/PageLayout";
import { SITE_CONFIG } from "@/lib/config";

export const metadata: Metadata = {
  title: "Kontakt — Bärenwald München",
  description: `Einfach anfragen: Anrufen oder E-Mail schreiben — wir melden uns ${SITE_CONFIG.responseSlaWithin}.`,
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
            <h1 className="page-hero-h1">Einfach anfragen.</h1>
            <p className="page-hero-sub">
              Ihr beschreibt was ihr braucht —
              <br />
              wir melden uns in der Regel
              <br />
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
                Bei Notfall auch außerhalb der Geschäftszeiten.
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
                ✓ Geprüfte Meisterbetriebe in München
                <br />
                ✓ Preisrahmen sofort online — transparent von Anfang an
                <br />
                ✓ Ein Ansprechpartner für alles — Einzelleistung oder Projekt
              </p>

              <div className="mt-10 flex flex-wrap gap-3" role="group" aria-label="Kontaktaktionen">
                <a href={SITE_CONFIG.phoneHref} className="btn-pill-primary inline-flex py-2.5 px-5 text-[13px]">
                  Jetzt anrufen →
                </a>
                <a
                  href={`mailto:${SITE_CONFIG.email}`}
                  className="inline-flex items-center rounded-full border border-border-default px-5 py-2.5 text-[13px] font-semibold text-text-primary hover:bg-muted"
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
