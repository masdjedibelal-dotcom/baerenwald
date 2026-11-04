import Link from "next/link";

/** Startseite: Hinweis für Handwerksbetriebe (früher mit Vermittlungs-Karten). */
export function VermittlungSection() {
  return (
    <section
      className="vermittlung-section"
      aria-labelledby="vermittlung-partner-heading"
    >
      <div className="vermittlung-section-inner">
        <div className="vermittlung-partner-cta">
          <p className="vermittlung-partner-cta-eyebrow">Für Handwerksbetriebe</p>
          <h3
            id="vermittlung-partner-heading"
            className="vermittlung-partner-cta-question"
          >
            Sie beherrschen Ihr Handwerk. Wir organisieren das Projekt.
          </h3>
          <p className="vermittlung-partner-cta-text">
            Wir suchen zuverlässige Handwerks- und Fachbetriebe aller Gewerke in
            München und Umgebung. Als Partner erhalten Sie passende
            Auftragsangebote, klare Leistungsinformationen und einen zentralen
            Ansprechpartner. Rückfragen und Berichte gehen auch per WhatsApp.
          </p>
          <Link href="/partner/registrieren" className="vermittlung-partner-cta-action">
            Partnerbetrieb werden →
          </Link>
        </div>
      </div>
    </section>
  );
}
