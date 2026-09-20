"use client";


import { PortalIcon } from "@/components/portal/PortalIcon";
import { PORTAL_VAR } from "@/lib/portal2/tokens";

const MODULES = [
  {
    id: "hausmeister",
    label: "Hausmeister",
    hint: "Objektbegehung, Kleinstreparaturen, Meldungen vor Ort",
    icon: "wrench",
  },
  {
    id: "reinigung",
    label: "Reinigung",
    hint: "Treppenhaus, Gemeinschaftsflächen, dokumentiertes Putzprotokoll",
    icon: "sparkles",
  },
  {
    id: "garten",
    label: "Gartenpflege",
    hint: "Außenanlage, Schnitt, saisonale Pflege",
    icon: "flower",
  },
  {
    id: "winter",
    label: "Winterdienst",
    hint: "Räumen, Streuen, Nachweis je Einsatztag",
    icon: "snowflake",
  },
] as const;

const STEPS = [
  {
    n: "01",
    title: "Module buchen",
    body: "Hausmeister, Reinigung, Gartenpflege und Winterdienst einzeln fürs Objekt zuschalten — wie im Katalog, ohne Paketzwang.",
    icon: "clipboard-list",
  },
  {
    n: "02",
    title: "Routinen abarbeiten",
    body: "Tägliche oder wöchentliche Checklisten auf der Startseite. Vorlagen nutzen, anpassen, Punkt für Punkt erledigen.",
    icon: "calendar-check",
  },
  {
    n: "03",
    title: "Protokoll für alle",
    body: "Erledigte Checklisten als Protokoll am Objekt — einsehbar für Verwaltung, Mieter und Eigentümer.",
    icon: "eye",
  },
] as const;

/**
 * Teaser: Objekt-Service-Module (kommt bald).
 * Ersetzt die bisherige Abo-/Paket-Buchungs-UI.
 */
export function OrganisationServicepaketePanel() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="portal-text-section text-text-primary">
            Objekt-Services
          </h2>
          <span
            className="rounded-pill px-2.5 py-0.5 text-fs-caption font-bold uppercase tracking-wide"
            style={{
              background: "var(--accent-light)",
              color: "var(--org-primary, var(--accent))",
            }}
          >
            In Kürze
          </span>
        </div>
        <p className="portal-text-body max-w-[40rem] leading-relaxed text-text-secondary">
          Bald buchen Sie laufende Dienste modulweise — mit Routinen,
          Checklisten und Protokollen, die Mieter und Eigentümer am Objekt
          mitlesen können.
        </p>
      </div>

      <ol className="grid gap-4 lg:grid-cols-3">
        {STEPS.map((s) => (
          <li
            key={s.n}
            className="portal-surface flex flex-col gap-3 p-5"
          >
            <div className="flex items-center gap-3">
              <span
                className="grid h-11 w-11 place-items-center rounded-sheet"
                style={{
                  background: "var(--accent-light)",
                  color: "var(--org-primary, var(--accent))",
                }}
              >
                <PortalIcon n={s.icon} ctx="default" className="h-5 w-5" />
              </span>
              <span
                className="text-fs-caption font-bold tabular-nums"
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
        <p className="portal-text-label text-text-tertiary">Geplante Module</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {MODULES.map((m) => (
            <li
              key={m.id}
              className="flex items-start gap-3 rounded-sheet border border-border-default bg-white p-4"
            >
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-sheet"
                style={{
                  background: "var(--accent-light)",
                  color: "var(--org-primary, var(--accent))",
                }}
              >
                <PortalIcon n={m.icon} ctx="default" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-text-primary">{m.label}</p>
                <p className="portal-text-meta mt-0.5 leading-snug text-text-secondary">
                  {m.hint}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div
        className="flex items-start gap-3 rounded-sheet border px-4 py-3.5"
        style={{
          borderColor: "var(--border-default)",
          background: "var(--muted)",
        }}
      >
        <PortalIcon n="shield-check" ctx="default" className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--org-primary, var(--accent))" }} aria-hidden />
        <p className="portal-text-body leading-relaxed text-text-secondary">
          Buchung und Live-Routinen folgen in einem nächsten Release. Bestehende
          Service-Anfragen aus der Vergangenheit bleiben in Ihren Vorgängen
          sichtbar.
        </p>
      </div>
    </div>
  );
}
