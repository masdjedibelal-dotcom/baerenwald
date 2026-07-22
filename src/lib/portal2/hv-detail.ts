/**
 * Portal 2.0 D3 — HV Vorgang-Detail (`screenDetail` / `roleActionPanel` / Summen).
 */

import type { PortalMockStatusId } from "@/lib/portal2/status";

export function moneyEur(n: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(Number.isFinite(n) ? n : 0);
}

export type AngebotSumme = { net: number; mwst: number; brutto: number };

/** Mock `angebotSumme` — MwSt 19 %. */
export function angebotSumme(net: number): AngebotSumme {
  const n = Math.max(0, net);
  return { net: n, mwst: n * 0.19, brutto: n * 1.19 };
}

export type HvDetailPosition = {
  pos: string;
  menge: string;
  gewerk: string;
  einzel: number;
};

export function angebotSummeFromPositionen(
  positionen: HvDetailPosition[]
): AngebotSumme {
  const net = positionen.reduce((s, p) => {
    const m = parseFloat(p.menge) || 1;
    return s + p.einzel * m;
  }, 0);
  return angebotSumme(net);
}

/** Aus Portal-Brutto-Positionen → Netto-Äquivalent für Summe (Brutto/1.19). */
export function angebotSummeFromBruttoTotal(brutto: number): AngebotSumme {
  const b = Math.max(0, brutto);
  const net = b / 1.19;
  return { net, mwst: b - net, brutto: b };
}

export type AbschlagRow = {
  title: string;
  sub: string;
  amount: number;
  status: "bezahlt" | "offen";
};

/** Mock `abschlagsplan` — 2 Raten à 50 %. */
export function buildAbschlagsplan(
  brutto: number,
  gewerke: string
): AbschlagRow[] {
  const g = gewerke.trim() || "Gewerk";
  return [
    {
      title: "1. Abschlag",
      sub: `Bei Beauftragung · ${g}`,
      amount: brutto * 0.5,
      status: "bezahlt",
    },
    {
      title: "Schlussrechnung",
      sub: `Nach digitaler Abnahme · ${g}`,
      amount: brutto * 0.5,
      status: "offen",
    },
  ];
}

export type HvVerlaufEntry = {
  t: string;
  txt: string;
  who: string;
};

/** Spec: „{Zeit} · {Text} · {Wer}“ (patchVg-Semantik). @deprecated Prefer formatVerlaufLine from verlauf.ts */
export function formatHvVerlaufLine(e: HvVerlaufEntry): string {
  return `${e.t} · ${e.txt} · ${e.who}`;
}

export type HvOfferCard = {
  id: string;
  name: string;
  trade: string;
  rating?: number;
  dauer?: string;
  betrag: number;
  empfohlen: boolean;
  guenstigste?: boolean;
  besteBewertung?: boolean;
  /** D11: `angebote.herkunft` — handwerker hat Vorrang als Empfohlenes Angebot. */
  herkunft?: string | null;
};

/**
 * ENTSCHEIDUNG 10: Layout zeigt genau ein Angebot („Empfohlenes …“),
 * Datenstruktur bleibt Array/mehrfachfähig.
 * D11: Herkunft `handwerker` vor explizitem `empfohlen`-Flag vor erstem Eintrag.
 */
export function pickEmpfohlenesAngebot(
  offers: HvOfferCard[]
): HvOfferCard | null {
  if (!offers.length) return null;
  const fromHw = offers.find(
    (o) => String(o.herkunft ?? "").toLowerCase() === "handwerker"
  );
  if (fromHw) return fromHw;
  return offers.find((o) => o.empfohlen) ?? offers[0] ?? null;
}

export const HV_DETAIL_COPY = {
  freigabeTitle: "Freigabe erforderlich",
  freigabeNote:
    "Als Verwaltung geben Sie den Vorgang für Bärenwald frei — erst dann werden Handwerker angefragt.",
  freigabeBtn: "✓ Freigeben & Handwerker anfragen",
  ablehnen: "Ablehnen",
  privatAuto:
    "Automatisch freigegeben (Privatkunde)",
  angeboteVergleichen: "Angebotdetails",
  angeboteVergleichNote:
    "Bärenwald hat ein Angebot vorgelegt. Prüfen Sie Preise und Leistungen — danach können Sie verbindlich annehmen.",
  empfohlenBadge: "★ Angebot",
  empfohlenDetail: "Leistungen & Preise",
  empfohlenAnnehmen: "Angebot annehmen",
  angebotAnnehmenNote:
    "Mit der Annahme wird der Vorgang im CRM zum Auftrag (Angebot angenommen).",
  unterSchwelle: (schwelleLabel: string) =>
    `Direkt Durchführung — Angebot unter Freigabeschwelle (${schwelleLabel}). Der Handwerker kann starten, ohne dass Sie freigeben. Sie erhalten eine E-Mail und sehen diesen Hinweis im Vorgang.`,
  inAusfuehrung: "In Ausführung",
  inAusfuehrungNoteHv:
    "Der Handwerker dokumentiert unten im Bautagebuch. Mieter sehen diese Einträge nicht.",
  abnahmeTitle: "Abschluss",
  abnahmeNote:
    "Die Abnahme und Signatur erfolgt durch den Handwerker vor Ort. Danach kannst du hier Feedback geben.",
  abnahmeBtn: "✍ Digital signieren & abnehmen",
  dokumenteTitle: "Dokumente",
  dokumenteEmpty: "Noch keine Dokumente.",
  rechnungTitle: "Rechnung",
  rechnungNote:
    "Gesamtpaket von Bärenwald erhalten: Rechnung + Abschlussdokumentation.",
  rechnungsbetrag: "Rechnungsbetrag",
  ueberweisungOffen:
    "Überweisung veranlassen ist im Portal noch nicht angebunden. Rechnungsstatus siehe unten.",
  paketOeffnen: "📄 Paket öffnen",
  abgeschlossenTitle: "Abgeschlossen",
  abgeschlossenNote: "Vorgang vollständig abgeschlossen und bezahlt.",
  abschlagsplanTitle: "Abschlagsplan · 2 Raten",
  abschlagsplanNote:
    "Von Bärenwald auf Basis des Angebots erstellt. Raten und enthaltene Gewerke:",
  bautagebuchTitle: "Bautagebuch",
  bautagebuchEmpty: "Noch keine Einträge.",
  metaTitle: "Details",
  verlaufTitle: "Verlauf",
  beschreibungTitle: "Beschreibung",
} as const;

export type HvRoleActionKind =
  | "freigabe"
  | "privat_auto"
  | "angebot"
  | "auftrag"
  | "abschluss"
  | "rechnung"
  | "bezahlt"
  | "none";

export function hvRoleActionKind(
  flow: PortalMockStatusId,
  opts?: { privatkunde?: boolean }
): HvRoleActionKind {
  if (flow === "gemeldet") {
    return opts?.privatkunde ? "privat_auto" : "freigabe";
  }
  if (flow === "angebot") return "angebot";
  if (flow === "auftrag") return "auftrag";
  if (flow === "abschluss") return "abschluss";
  if (flow === "rechnung") return "rechnung";
  if (flow === "bezahlt") return "bezahlt";
  return "none";
}

/** Default-Schwelle wie Mock `schwelle: 500`. */
export const HV_DEFAULT_SCHWELLE_EUR = 500;
