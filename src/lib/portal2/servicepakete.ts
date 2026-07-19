/**
 * Portal 2.0 D5 — `screenServicepakete` (Mock 1:1).
 */

export type ServicepaketCard = {
  id: string;
  name: string;
  preis: string;
  zyklus: string;
  /** Preis als Zahl für Lead (netto/Monat, Anzeige). */
  preisEur: number;
  tint: string;
  accent: string;
  ic: string;
  desc: string;
  feats: string[];
  pop: boolean;
};

/** Mock-Pakete wortwörtlich. */
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

export const SERVICEPAKET_CTA = "Paket wählen" as const;

/** Mock `modalShell('Paket angefragt', …)`. */
export const SERVICEPAKET_OK_TITLE = "Paket angefragt" as const;

export const SERVICEPAKET_OK_BODY =
  "Ihr Ansprechpartner bei Bärenwald meldet sich zur Objekt-Zuordnung und Aktivierung." as const;

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

/**
 * CRM-Kanal: Spec-Vorschlag Literal `servicepaket`.
 * Live bis Enum-Migration: `org_service` + `anlass=servicepaket`.
 */
export const SERVICEPAKET_KANAL_LIVE = "org_service" as const;
export const SERVICEPAKET_KANAL_VORSCHLAG = "servicepaket" as const;
