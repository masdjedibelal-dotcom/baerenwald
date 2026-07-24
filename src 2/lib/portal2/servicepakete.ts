/**
 * Portal 2.0 D5 — Servicepakete (Richtpreise nach Objektgröße).
 */

export type ServicepaketGroesseId = "s" | "m" | "l";

export type ServicepaketGroesseOption = {
  id: ServicepaketGroesseId;
  label: string;
  /** Multiplikator auf Basispreis (Größe S). */
  faktor: number;
};

/** Max. 3 Stufen — Default M für den „normalen“ Griff in die Mitte. */
export const SERVICEPAKET_GROESSEN: ServicepaketGroesseOption[] = [
  { id: "s", label: "bis 6 WE", faktor: 1 },
  { id: "m", label: "7–20 WE", faktor: 1.35 },
  { id: "l", label: "ab 21 WE", faktor: 1.8 },
];

export const SERVICEPAKET_GROESSE_DEFAULT: ServicepaketGroesseId = "m";

export type ServicepaketCard = {
  id: string;
  name: string;
  /** Anzeige-Fallback (Größe S), live über `servicepaketPreisAb`. */
  preis: string;
  zyklus: string;
  /** Basispreis €/Monat bei Größe S. */
  preisEur: number;
  tint: string;
  accent: string;
  ic: string;
  desc: string;
  feats: string[];
  pop: boolean;
};

/** Pakete: links Einstieg, Mitte Beliebt, rechts Anker. */
export const SERVICEPAKETE: ServicepaketCard[] = [
  {
    id: "basis-wartung",
    name: "Basis-Wartung",
    preis: "149 €",
    zyklus: "/ Monat",
    preisEur: 149,
    tint: "#E8EEF6",
    accent: "#2E7D52",
    ic: "🛠",
    desc: "Regelmäßige Grundwartung für kleinere Objekte — ideal für Einzelhäuser und kleine Wohnanlagen.",
    feats: [
      "1 Wartungsbesuch / Quartal",
      "Rauchmelder-Prüfung",
      "Reaktionszeit 48 h",
      "Telefon-Hotline",
    ],
    pop: false,
  },
  {
    id: "komfort-service",
    name: "Komfort-Service",
    preis: "349 €",
    zyklus: "/ Monat",
    preisEur: 349,
    tint: "#DDEEDF",
    accent: "#1F6A3F",
    ic: "🏠",
    desc: "Rundum-Betreuung inkl. Notdienst und bevorzugter Terminvergabe für Ihre Bestandsobjekte.",
    feats: [
      "1 Wartungsbesuch / Monat",
      "24/7-Notdienst",
      "Reaktionszeit 8 h",
      "Priorisierte Termine",
      "Digitales Objektprotokoll",
    ],
    pop: true,
  },
  {
    id: "full-service-plus",
    name: "Full-Service Plus",
    preis: "690 €",
    zyklus: "/ Monat",
    preisEur: 690,
    tint: "#F3ECFB",
    accent: "#5B3FA8",
    ic: "⭐",
    desc: "Maximale Absicherung mit festem Objektbetreuer und garantierten Reaktionszeiten für große Portfolios.",
    feats: [
      "Wöchentliche Begehung",
      "24/7-Notdienst mit 4 h",
      "Fester Objektbetreuer",
      "Jahresbudget inklusive",
      "Quartalsreporting",
    ],
    pop: false,
  },
];

export const SERVICEPAKETE_INTRO =
  "Wählen Sie ein Wartungs- und Service-Abo für Ihre Objekte. Alle Pakete sind monatlich kündbar und können pro Objekt zugewiesen werden." as const;

export const SERVICEPAKETE_PAGE_TITLE = "Servicepakete" as const;

export const SERVICEPAKET_CTA = "Anfragen" as const;

export const SERVICEPAKET_PREIS_HINWEIS =
  "Richtpreise nach Objektgröße. Der verbindliche Preis wird nach Ihrer Anfrage geklärt." as const;

export const SERVICEPAKET_GROESSE_LABEL = "Objektgröße" as const;

/** Mock `modalShell('Paket angefragt', …)`. */
export const SERVICEPAKET_OK_TITLE = "Paket angefragt" as const;

export const SERVICEPAKET_OK_BODY =
  "Ihr Ansprechpartner bei Bärenwald meldet sich mit verbindlichem Preis, Objekt-Zuordnung und Aktivierung." as const;

export const SERVICEPAKET_OK_CLOSE = "Schließen" as const;

export function servicepaketOkHeadline(paketName: string): string {
  return `„${paketName}" angefragt`;
}

export function findServicepaket(
  idOrName: string
): ServicepaketCard | undefined {
  const q = idOrName.trim().toLowerCase();
  return SERVICEPAKETE.find(
    (p) => p.id === q || p.name.toLowerCase() === q
  );
}

export function findServicepaketGroesse(
  id: string
): ServicepaketGroesseOption | undefined {
  return SERVICEPAKET_GROESSEN.find((g) => g.id === id);
}

/** Auf 5 € runden — verkaufstaugliche Anzeige. */
export function roundServicepaketPreis(eur: number): number {
  return Math.round(eur / 5) * 5;
}

/** Richtpreis „ab“ für Paket × Größe. Größe S = Basispreis, sonst auf 5 €. */
export function servicepaketPreisAb(
  paket: Pick<ServicepaketCard, "preisEur">,
  groesseId: ServicepaketGroesseId = SERVICEPAKET_GROESSE_DEFAULT
): number {
  const g =
    findServicepaketGroesse(groesseId) ??
    findServicepaketGroesse(SERVICEPAKET_GROESSE_DEFAULT)!;
  if (g.faktor === 1) return paket.preisEur;
  return roundServicepaketPreis(paket.preisEur * g.faktor);
}

export function formatServicepaketPreisAb(eur: number): string {
  return `ab ${eur} €`;
}

/**
 * CRM-Kanal: Spec-Vorschlag Literal `servicepaket`.
 * Live bis Enum-Migration: `org_service` + `anlass=servicepaket`.
 */
export const SERVICEPAKET_KANAL_LIVE = "org_service" as const;
export const SERVICEPAKET_KANAL_VORSCHLAG = "servicepaket" as const;
