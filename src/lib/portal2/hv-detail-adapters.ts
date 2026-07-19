/**
 * Adapter: KundePortalDetailItem → HV Detail Props (teilweise).
 */

import type { KundePortalDetailItem } from "@/lib/portal/portal-detail-item";
import type { PortalMockStatusId } from "@/lib/portal2/status";
import type { HvOfferCard, HvVerlaufEntry } from "@/lib/portal2/hv-detail";

export function inferFlowFromKundeItem(
  item: KundePortalDetailItem,
  extras?: {
    orgFreigabeStatus?: string | null;
    hvMeldungStatus?: string | null;
    hasRechnung?: boolean;
    rechnungBezahlt?: boolean;
  }
): PortalMockStatusId {
  if (extras?.rechnungBezahlt) return "bezahlt";
  if (extras?.hasRechnung) return "rechnung";
  if (item.isAuftragDetail) {
    const phase = (item.auftragPhasen?.aktuellePhase ?? "").toLowerCase();
    if (phase.includes("abnahme") || phase.includes("abschluss")) {
      return "abschluss";
    }
    return "auftrag";
  }
  if (item.isAngebotDetail) {
    return "angebot";
  }
  const hv = (extras?.hvMeldungStatus ?? "").toLowerCase();
  if (hv === "neu" || !hv) return "gemeldet";
  if (hv === "angebot_eingefordert") return "freigegeben";
  return "gemeldet";
}

export function buildHvOffersFromItem(
  item: KundePortalDetailItem,
  handwerkerName?: string | null
): HvOfferCard[] {
  const betrag = item.gesamtBrutto ?? 0;
  if (!item.isAngebotDetail && betrag <= 0 && !item.angebotPositionen?.length) {
    return [];
  }
  const herkunft = item.angebotHerkunft ?? null;
  const fromHandwerker =
    String(herkunft ?? "").toLowerCase() === "handwerker";
  return [
    {
      id: item.id,
      name:
        handwerkerName?.trim() ||
        (fromHandwerker ? "Handwerker-Angebot" : "Empfohlenes Angebot"),
      trade: item.anfrageGewerk || item.cardSubtitle || "Fachbetrieb",
      betrag: betrag || 0,
      empfohlen: true,
      herkunft,
    },
  ];
}

export function buildHvVerlaufSeed(input: {
  createdAt?: string | null;
  melder?: string | null;
  freigabeStatus?: string | null;
  privatAuto?: boolean;
}): HvVerlaufEntry[] {
  const entries: HvVerlaufEntry[] = [];
  const t0 = input.createdAt
    ? new Date(input.createdAt).toLocaleString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
  entries.push({
    t: t0,
    txt: "Vorgang eingegangen",
    who: input.melder?.trim() || "System",
  });
  if (input.privatAuto) {
    entries.unshift({
      t: "Gerade eben",
      txt: "Automatisch freigegeben (Privatkunde)",
      who: "System",
    });
  }
  if (input.freigabeStatus === "freigegeben") {
    entries.unshift({
      t: "Gerade eben",
      txt: "Freigegeben – Bärenwald fragt Handwerker an",
      who: "Hausverwaltung",
    });
  }
  return entries;
}
