import type { Metadata } from "next";
import Link from "next/link";

import { PageLayout } from "@/components/layout/PageLayout";
import { SITE_CONFIG } from "@/lib/config";

export const metadata: Metadata = {
  title: "Kontakt — Bärenwald München",
  description:
    "Telefon, E-Mail und Preisrechner — Bärenwald München, Handwerker aus einer Hand.",
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
            <h1 className="page-hero-h1">Kontakt</h1>
            <p className="page-hero-sub">
              Wir melden uns schnell — oder du startest direkt den
              unverbindlichen Preisrahmen.
            </p>
          </div>
        </div>

        <section className="article-section article-section--lg content-section--white">
          <div className="article-section-inner">
            <div className="article-body legal-body">
              <p>
                <strong>Telefon</strong>
                <br />
                <a href={SITE_CONFIG.phoneHref}>{SITE_CONFIG.phone}</a>
              </p>
              <p>
                <strong>E-Mail</strong>
                <br />
                <a href={`mailto:${SITE_CONFIG.email}`}>{SITE_CONFIG.email}</a>
              </p>
              <p>
                <strong>Einsatzgebiet</strong>
                <br />
                {SITE_CONFIG.region}
              </p>
              <p className="mt-8">
                <Link href="/rechner" className="btn-pill-primary inline-flex py-2.5 px-5 text-[13px]">
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
