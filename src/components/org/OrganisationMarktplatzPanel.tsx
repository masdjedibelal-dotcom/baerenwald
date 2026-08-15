"use client";

import {
  ArrowLeftRight,
  FileSearch,
  Handshake,
  Scale,
  Shield,
  Store,
} from "lucide-react";

import { PORTAL_VAR } from "@/lib/portal2/tokens";

const STEPS = [
  {
    n: "01",
    title: "Bedarf ausschreiben",
    body: "Sie stellen ein Gesuch mit einheitlichen Leistungsdaten ein — einmal beschrieben, für alle Partner im Netzwerk sichtbar.",
    Icon: FileSearch,
  },
  {
    n: "02",
    title: "Partner bieten",
    body: "Qualifizierte Partner aus dem Bärenwald-Netzwerk schreiben sich auf Ihr Gesuch und reichen Angebote ein — My-Hammer-Prinzip, aber im geprüften Netzwerk.",
    Icon: Handshake,
  },
  {
    n: "03",
    title: "Vergleichen & wählen",
    body: "Wir bereiten die Angebote so auf, dass Preis, Leistung und Konditionen nebeneinander vergleichbar sind — Sie entscheiden auf einer klaren Basis.",
    Icon: ArrowLeftRight,
  },
] as const;

const BENEFITS = [
  {
    id: "vergleichbar",
    label: "Echt vergleichbar",
    hint: "Gleiche Struktur, gleiche Kriterien — statt PDF-Chaos aus Einzelanfragen.",
    Icon: Scale,
  },
  {
    id: "netzwerk",
    label: "Direkt aus dem Partnernetzwerk",
    hint: "Kein freies Internet-Portal: Angebote von Partnern, die bereits auf der Plattform arbeiten.",
    Icon: Store,
  },
  {
    id: "plattform",
    label: "Eine Plattform für den Prozess",
    hint: "Ausschreibung, Eingang und Vergleich bleiben im HV-Portal — nachvollziehbar für Verwaltung und Eigentümer.",
    Icon: Shield,
  },
] as const;

/**
 * Teaser: Vergleichsangebote über Partnernetzwerk (kommt bald).
 */
export function OrganisationMarktplatzPanel() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="portal-text-section text-text-primary">Marktplatz</h2>
          <span
            className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
            style={{
              background: "var(--accent-light, #E7F1E9)",
              color: "var(--org-primary, var(--accent, #2E7D52))",
            }}
          >
            Kommt bald
          </span>
        </div>
        <p className="portal-text-body max-w-[40rem] leading-relaxed text-text-secondary">
          Bald holen Sie Vergleichsangebote direkt über unser Partnernetzwerk
          ein. Bärenwald schafft die Voraussetzungen, damit Partner auf Ihre
          Gesuche antworten können — und bereitet die Angebote so auf, dass Sie
          sie fair vergleichen können.
        </p>
      </div>

      <ol className="grid gap-4 lg:grid-cols-3">
        {STEPS.map((s) => (
          <li key={s.n} className="portal-surface flex flex-col gap-3 p-5">
            <div className="flex items-center gap-3">
              <span
                className="grid h-11 w-11 place-items-center rounded-xl"
                style={{
                  background: "var(--accent-light, #E7F1E9)",
                  color: "var(--org-primary, var(--accent, #2E7D52))",
                }}
              >
                <s.Icon className="h-5 w-5" aria-hidden />
              </span>
              <span
                className="text-[12px] font-bold tabular-nums"
                style={{ color: PORTAL_VAR.faint }}
              >
                Schritt {s.n}
              </span>
            </div>
            <h3 className="portal-text-title">{s.title}</h3>
            <p className="portal-text-body leading-relaxed text-text-secondary">
              {s.body}
            </p>
          </li>
        ))}
      </ol>

      <div className="space-y-3">
        <p className="portal-text-label text-text-tertiary">Ihr Vorteil</p>
        <ul className="grid gap-3 sm:grid-cols-3">
          {BENEFITS.map((b) => (
            <li
              key={b.id}
              className="flex items-start gap-3 rounded-2xl border border-border-default bg-white p-4"
            >
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                style={{
                  background: "var(--accent-light, #E7F1E9)",
                  color: "var(--org-primary, var(--accent, #2E7D52))",
                }}
              >
                <b.Icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-text-primary">{b.label}</p>
                <p className="portal-text-meta mt-0.5 leading-snug text-text-secondary">
                  {b.hint}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div
        className="flex items-start gap-3 rounded-2xl border px-4 py-3.5"
        style={{
          borderColor: "var(--border-default, #e3e6ea)",
          background: "var(--muted, #f6f7f8)",
        }}
      >
        <Store
          className="mt-0.5 h-5 w-5 shrink-0"
          style={{ color: "var(--org-primary, var(--accent, #2E7D52))" }}
          aria-hidden
        />
        <p className="portal-text-body leading-relaxed text-text-secondary">
          Ausschreibung und Angebotsvergleich folgen in einem nächsten Release.
          Bis dahin laufen Anfragen und Angebote wie gewohnt über Ihre Vorgänge.
        </p>
      </div>
    </div>
  );
}
