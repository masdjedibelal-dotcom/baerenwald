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

export type AbschlagRechnungInput = {
  brutto?: number | null;
  status?: string | null;
  bezahlt_at?: string | null;
  rechnung_art?: string | null;
  abschlag_index?: number | null;
};

function rechnungIstBezahlt(r: AbschlagRechnungInput): boolean {
  if (r.bezahlt_at?.trim()) return true;
  return String(r.status ?? "").toLowerCase() === "bezahlt";
}

function abschlagTitle(r: AbschlagRechnungInput): string {
  const art = String(r.rechnung_art ?? "").toLowerCase();
  if (art === "schluss") return "Schlussrechnung";
  if (art === "voll") return "Rechnung";
  const idx =
    typeof r.abschlag_index === "number" && r.abschlag_index > 0
      ? r.abschlag_index
      : 1;
  if (art === "abschlag" || art === "") return `${idx}. Abschlag`;
  return `${idx}. Abschlag`;
}

function abschlagSub(r: AbschlagRechnungInput, gewerk: string): string {
  const g = gewerk.trim() || "Gewerk";
  const art = String(r.rechnung_art ?? "").toLowerCase();
  if (art === "schluss") return `Nach digitaler Abnahme · ${g}`;
  if (art === "voll") return g;
  return `Bei Beauftragung · ${g}`;
}

function sortKeyRechnung(r: AbschlagRechnungInput): number {
  if (typeof r.abschlag_index === "number" && Number.isFinite(r.abschlag_index)) {
    return r.abschlag_index;
  }
  const art = String(r.rechnung_art ?? "").toLowerCase();
  if (art === "abschlag") return 1;
  if (art === "schluss") return 90;
  if (art === "voll") return 50;
  return 99;
}

/** Abschlagsplan aus echten Rechnungszeilen (Brutto + Bezahlt-Status). */
export function buildAbschlagsplanFromRechnungen(
  rechnungen: AbschlagRechnungInput[] | null | undefined,
  gewerke: string
): AbschlagRow[] {
  const rows = (rechnungen ?? [])
    .map((r) => ({
      r,
      amount: Number(r.brutto),
    }))
    .filter((x) => Number.isFinite(x.amount) && x.amount > 0)
    .sort((a, b) => sortKeyRechnung(a.r) - sortKeyRechnung(b.r));

  return rows.map(({ r, amount }) => ({
    title: abschlagTitle(r),
    sub: abschlagSub(r, gewerke),
    amount,
    status: rechnungIstBezahlt(r) ? "bezahlt" : "offen",
  }));
}

export function abschlagsplanCardTitle(raten: number): string {
  if (raten <= 0) return "Abschlagsplan";
  if (raten === 1) return "Abschlagsplan · 1 Rate";
  return `Abschlagsplan · ${raten} Raten`;
}

/** Abschlagsplan: bevorzugt Rechnungsbeträge, sonst Fallback 2×50 %. */
export function buildAbschlagsplan(
  brutto: number,
  gewerke: string,
  rechnungen?: AbschlagRechnungInput[] | null
): AbschlagRow[] {
  const fromRechnungen = buildAbschlagsplanFromRechnungen(rechnungen, gewerke);
  if (fromRechnungen.length > 0) return fromRechnungen;

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
  freigabeBtn: "Freigeben",
  freigabeBtnMobile: "Freigeben",
  ablehnen: "Ablehnen",
  privatAuto: "Automatisch freigegeben (Privatkunde)",
  angeboteVergleichen: "Angebotdetails",
  empfohlenBadge: "★ Angebot",
  empfohlenDetail: "Leistungen & Preise",
  empfohlenAnnehmen: "Annehmen",
  angebotAnnehmenTitle: "Angebot annehmen",
  unterSchwelle: (schwelleLabel: string) =>
    `Auftrag läuft (unter ${schwelleLabel})`,
  unterSchwelleAkut: "Sofortmaßnahme — wir kümmern uns",
  inAusfuehrung: "In Ausführung",
  abnahmeTitle: "Abschluss",
  abnahmeEmpty: "Noch kein Abnahmeprotokoll.",
  abnahmeLeistungen: "Leistungen",
  abnahmeMaengel: "Mängel",
  abnahmeBtn: "Abnehmen",
  abnahmeProtokollTitle: "Abnahmeprotokoll",
  dokumenteTitle: "Dokumente",
  dokumenteEmpty: "Noch keine Dokumente.",
  rechnungTitle: "Rechnung",
  rechnungsbetrag: "Rechnungsbetrag",
  ueberweisungOffen: "Überweisung noch nicht im Portal",
  paketOeffnen: "📄 Paket öffnen",
  abgeschlossenTitle: "Abgeschlossen",
  abschlagsplanTitle: "Abschlagsplan · 2 Raten",
  bautagebuchTitle: "Updates",
  bautagebuchEmpty: "Noch keine Updates vom Handwerker.",
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
  opts?: { privatkunde?: boolean; angebotVorgelegt?: boolean }
): HvRoleActionKind {
  if (flow === "gemeldet") {
    return opts?.privatkunde ? "privat_auto" : "freigabe";
  }
  if (flow === "angebot" || flow === "angefragt" || flow === "freigegeben") {
    return opts?.angebotVorgelegt ? "angebot" : "none";
  }
  if (flow === "auftrag") return "auftrag";
  if (flow === "abschluss") return "abschluss";
  if (flow === "rechnung") return "rechnung";
  if (flow === "bezahlt") return "bezahlt";
  if (flow === "abgelehnt") return "none";
  return "none";
}

/** Default-Schwelle wie Mock `schwelle: 500`. */
export const HV_DEFAULT_SCHWELLE_EUR = 500;
