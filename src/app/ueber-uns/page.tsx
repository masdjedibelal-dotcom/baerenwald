import type { Metadata } from "next";
import Link from "next/link";

import { PageLayout } from "@/components/layout/PageLayout";

export const metadata: Metadata = {
  title: "Über uns — Bärenwald München",
  description:
    "Bärenwald München — ein Ansprechpartner für Maler, Elektro, Bad, Garten und mehr. Koordination statt Einzelkämpfen.",
};

export default function UeberUnsPage() {
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
              <span className="breadcrumb-current">Über uns</span>
            </nav>
            <h1 className="page-hero-h1">Über uns</h1>
            <p className="page-hero-sub">
              Stark wie ein Bär. Verlässlich wie der Wald.
            </p>
          </div>
        </div>

        <section className="article-section article-section--lg content-section--white">
          <div className="article-section-inner">
            <div className="article-body legal-body">
              <p>
                <strong>Bärenwald München</strong> bündelt Handwerksleistungen
                in München und der Umgebung: Du hast einen Ansprechpartner, wir
                koordinieren die passenden Gewerke — von der ersten Idee bis
                zur Ausführung.
              </p>
              <p>
                Transparente Preisrahmen helfen dir bei der Planung; verbindliche
                Festpreise besprechen wir nach dem Vor-Ort-Termin mit dir.
              </p>
              <p className="mt-8 flex flex-wrap gap-3">
                <Link href="/rechner" className="btn-pill-primary inline-flex py-2.5 px-5 text-[13px]">
                  Preisrechner →
                </Link>
                <Link
                  href="/kontakt"
                  className="inline-flex items-center rounded-full border border-border-default px-5 py-2.5 text-[13px] font-semibold text-text-primary hover:bg-muted"
                >
                  Kontakt
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
