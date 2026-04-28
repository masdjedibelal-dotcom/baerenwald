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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-border-default bg-surface-muted px-4 py-4">
                  <p className="font-semibold text-text-primary">📞 Anrufen</p>
                  <p className="mt-2 text-sm text-text-secondary">
                    {SITE_CONFIG.phone}
                    <br />
                    Mo–Fr 8–18 Uhr
                    <br />
                    Bei Notfall auch
                    <br />
                    außerhalb der
                    <br />
                    Geschäftszeiten.
                  </p>
                  <p className="mt-3">
                    <a href={SITE_CONFIG.phoneHref}>Jetzt anrufen →</a>
                  </p>
                </div>

                <div className="rounded-xl border border-border-default bg-surface-muted px-4 py-4">
                  <p className="font-semibold text-text-primary">✉️ E-Mail schreiben</p>
                  <p className="mt-2 text-sm text-text-secondary">
                    {SITE_CONFIG.email}
                    <br />
                    Antwort innerhalb von
                    <br />
                    24–48 Stunden.
                  </p>
                  <p className="mt-3">
                    <a href={`mailto:${SITE_CONFIG.email}`}>E-Mail schreiben →</a>
                  </p>
                </div>

                <div className="rounded-xl border border-border-default bg-surface-muted px-4 py-4">
                  <p className="font-semibold text-text-primary">🧮 Preisrechner nutzen</p>
                  <p className="mt-2 text-sm text-text-secondary">
                    Sofort Preisrahmen online —
                    <br />
                    dauert 2 Minuten.
                    <br />
                    Kein Anruf nötig.
                  </p>
                  <p className="mt-3">
                    <Link href="/rechner">Zum Preisrechner →</Link>
                  </p>
                </div>
              </div>

              <h2 className="mt-8">Wo wir tätig sind</h2>
              <p>
                München &amp; Umgebung —
                <br />
                alle Stadtteile,
                <br />
                Umkreis ca. 30 km.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-border-default bg-surface-card px-4 py-3 text-sm text-text-secondary">
                  ✓ Geprüfte Meisterbetriebe
                  <br />
                  in München
                </div>
                <div className="rounded-xl border border-border-default bg-surface-card px-4 py-3 text-sm text-text-secondary">
                  ✓ Preisrahmen sofort online —
                  <br />
                  transparent von Anfang an
                </div>
                <div className="rounded-xl border border-border-default bg-surface-card px-4 py-3 text-sm text-text-secondary">
                  ✓ Ein Ansprechpartner für alles —
                  <br />
                  Einzelleistung oder Projekt
                </div>
              </div>

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
