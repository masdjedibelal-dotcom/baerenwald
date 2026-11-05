import type { Metadata } from "next";
import Link from "next/link";

import { PageLayout } from "@/components/layout/PageLayout";
import { PartnerBewerbungForm } from "@/components/partner-bewerbung/PartnerBewerbungForm";

export const metadata: Metadata = {
  title: "Partnerbetrieb werden — Bärenwald München",
  description:
    "Handwerks- und Fachbetriebe aller Gewerke in München: passende Auftragsangebote, klare Leistungsinformationen und ein zentraler Ansprechpartner.",
};

export default function PartnerWerdenPage() {
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
              <span className="breadcrumb-current">Partner werden</span>
            </nav>
            <h1 className="page-hero-h1">Gute Zusammenarbeit beginnt mit dem passenden Können.</h1>
            <p className="page-hero-sub">
              Sie führen einen Handwerks- oder Fachbetrieb und möchten mit uns bei Bau- und
              Sanierungsprojekten in München zusammenarbeiten? Stellen Sie uns Ihren Betrieb kurz vor.
            </p>
          </div>
        </div>

        <section className="article-section article-section--lg content-section--white">
          <div className="article-section-inner">
            <div className="article-body legal-body">
              <ul className="ueber-uns-checklist">
                <li>Passende Auftragsangebote nach Ihren fachlichen Schwerpunkten</li>
                <li>Leistungen, Vergütung und Termine klar vor der Beauftragung</li>
                <li>Ein zentraler Ansprechpartner, Abstimmung auch per WhatsApp</li>
              </ul>
              <PartnerBewerbungForm />
              <p className="partner-bewerbung__hinweis">
                Die Bewerbung führt nicht automatisch zur Aufnahme oder zu einer bestimmten
                Auftragsmenge. Sie sind schon Partner?{" "}
                <Link href="/partner/login">Zum Handwerkerportal</Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
