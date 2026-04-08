import Link from "next/link";

import { SITE_CONFIG } from "@/lib/config";
import { SITUATION_OPTIONS } from "@/lib/situation-options";

const TESTIMONIALS = [
  {
    quote: "„Transparente Preisspanne, pünktlicher Meister — genau das, was wir gesucht haben.“",
    who: "Familie K., Schwabing",
  },
  {
    quote: "„Ein Ansprechpartner für Maler und Elektro — hat uns viel Koordination erspart.“",
    who: "Lena M., B2B Facility",
  },
  {
    quote: "„Kostenlose Erstberatung, kein Druck. So wünscht man sich Handwerk.“",
    who: "Thomas R., Grünwald",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-text-primary">
      <section className="mx-auto max-w-3xl px-4 pb-16 pt-14 text-center sm:pt-20">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-text-tertiary">
          {SITE_CONFIG.region}
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold leading-tight sm:text-4xl">
          Ein Auftrag. Alle Gewerke. Wir koordinieren.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-text-secondary">
          Kostenloser Preisrechner für Handwerksleistungen — unverbindlich, in
          2 Minuten.
        </p>
        <Link
          href="/rechner"
          className="btn-pill-primary mt-8 inline-flex max-w-full justify-center px-8 py-3.5 text-base font-semibold"
          style={{ backgroundColor: SITE_CONFIG.accentColor }}
        >
          Jetzt Preisrechner starten →
        </Link>
        <p className="mx-auto mt-6 max-w-lg text-xs leading-relaxed text-text-tertiary">
          4,9 ★ Google · Meisterbetrieb · München &amp; Umgebung · Kein
          Auftragszwang
        </p>
      </section>

      <section className="border-t border-border-default bg-muted/20 px-4 py-12">
        <h2 className="text-center text-sm font-semibold text-text-primary">
          Direkt einsteigen
        </h2>
        <p className="mx-auto mt-1 max-w-md text-center text-xs text-text-secondary">
          Wähle dein Vorhaben — oder starte den allgemeinen Rechner.
        </p>
        <ul className="mx-auto mt-8 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SITUATION_OPTIONS.map((s) => (
            <li key={s.id}>
              <Link
                href={`/rechner?situation=${s.id}`}
                className="flex h-full flex-col rounded-tile border border-border-default bg-white p-4 text-left transition-colors hover:border-text-tertiary"
              >
                <span className="font-medium text-text-primary">{s.label}</span>
                <span className="mt-1 text-xs text-text-secondary">{s.hint}</span>
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/rechner"
              className="flex h-full flex-col rounded-tile border border-dashed border-border-default bg-white p-4 text-left transition-colors hover:border-text-tertiary"
            >
              <span className="font-medium text-text-primary">
                Individuelle Beratung
              </span>
              <span className="mt-1 text-xs text-text-secondary">
                Ohne Vorauswahl — alle Fragen im Rechner
              </span>
            </Link>
          </li>
        </ul>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14">
        <h2 className="text-center text-sm font-semibold text-text-primary">
          Erfahrungen
        </h2>
        <ul className="mt-8 grid gap-6 sm:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <li
              key={i}
              className="rounded-card border border-border-default bg-white p-5 text-left"
            >
              <p className="text-sm leading-relaxed text-text-secondary">
                {t.quote}
              </p>
              <p className="mt-3 text-xs font-medium text-text-tertiary">
                {t.who}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
