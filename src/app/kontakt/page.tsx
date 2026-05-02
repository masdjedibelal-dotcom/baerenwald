import type { Metadata } from "next";
import Link from "next/link";

import { PageLayout } from "@/components/layout/PageLayout";
import { SITE_CONFIG } from "@/lib/config";

export const metadata: Metadata = {
  title: "Kontakt — Bärenwald München",
  description:
    "Einfach anfragen: Anrufen, E-Mail schreiben oder Preisrechner nutzen — wir melden uns innerhalb von 24 Stunden.",
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
              wir melden uns innerhalb
              <br />
              von 24 Stunden.
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
                Antwort innerhalb von 24–48 Stunden.
                <br />
                <a href={`mailto:${SITE_CONFIG.email}`}>E-Mail schreiben →</a>
              </p>

              <p>
                <strong>🧮 Preisrechner nutzen</strong>
                <br />
                Sofort Preisrahmen online — dauert 2 Minuten.
                <br />
                Kein Anruf nötig.
                <br />
                <Link href="/rechner">Zum Preisrechner →</Link>
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

              <p className="mt-8 flex flex-wrap gap-3">
                <a href={SITE_CONFIG.phoneHref} className="btn-pill-primary inline-flex py-2.5 px-5 text-[13px]">
                  Jetzt anrufen →
                </a>
                <Link
                  href="/rechner"
                  className="inline-flex items-center rounded-full border border-border-default px-5 py-2.5 text-[13px] font-semibold text-text-primary hover:bg-muted"
                >
                  Zum Preisrechner →
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
