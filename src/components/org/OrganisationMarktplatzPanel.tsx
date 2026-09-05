"use client";

import {
  ArrowLeftRight,
  FileSearch,
  Handshake,
  Scale,
  Shield,
  Store,
} from "lucide-react";

import { PortalListeTitle } from "@/components/shared/PortalListeChrome";
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
        <div className="flex flex-wrap items-center gap-2.5">
          <PortalListeTitle>Marktplatz</PortalListeTitle>
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide"
            style={{
              background: "rgba(232,176,75,0.20)",
              color: "#8A5A06",
            }}
          >
            In Kürze
          </span>
        </div>
        <p className="max-w-[40rem] text-[15px] leading-[1.55] text-[#55615B]">
          Bald holen Sie Vergleichsangebote direkt über unser Partnernetzwerk
          ein. Bärenwald schafft die Voraussetzungen, damit Partner auf Ihre
          Gesuche antworten können — und bereitet die Angebote so auf, dass Sie
          sie fair vergleichen können.
        </p>
      </div>

      <ol className="grid gap-4 lg:grid-cols-3">
        {STEPS.map((s) => (
          <li
            key={s.n}
            className="flex flex-col gap-3 rounded-[22px] bg-white p-[22px] shadow-[var(--p2-shadow)]"
          >
            <div className="flex items-start justify-between gap-3">
              <span
                className="grid h-[46px] w-[46px] place-items-center rounded-[15px]"
                style={{
                  background: PORTAL_VAR.greenDark,
                  color: "#fff",
                }}
              >
                <s.Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-[13px] font-extrabold tabular-nums text-[#CDD4CE]">
                {s.n}
              </span>
            </div>
            <h3
              className="text-[18px] font-extrabold text-text-primary"
              style={{ fontFamily: PORTAL_VAR.head }}
            >
              {s.title}
            </h3>
            <p className="text-[14.5px] leading-[1.65] text-[#55615B]">
              {s.body}
            </p>
          </li>
        ))}
      </ol>

      <div className="space-y-3">
        <p className="text-[11.5px] font-extrabold uppercase tracking-wide text-[#7A857F]">
          Ihr Vorteil
        </p>
        <ul className="grid gap-3 sm:grid-cols-3">
          {BENEFITS.map((b) => (
            <li
              key={b.id}
              className="flex items-start gap-3 rounded-[20px] bg-[#EEF4F0] p-[18px]"
            >
              <b.Icon
                className="mt-0.5 h-[19px] w-[19px] shrink-0 text-[#2E7D52]"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-text-primary">
                  {b.label}
                </p>
                <p className="mt-1 text-[13.5px] leading-[1.55] text-[#55615B]">
                  {b.hint}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
