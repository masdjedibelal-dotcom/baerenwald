/**
 * Einheitliches Vorgang-Detail: View-Model + Rollen-Sichtbarkeit.
 * Drei Blöcke: Auftraggeber · Objekt & Melder · Ausführung
 */

export type VorgangDetailRole = "hv" | "mieter" | "kunde" | "partner";

/** Render-Tiefe eines Blocks */
export type BlockSight =
  | "full" // alles inkl. Preise (VK)
  | "summary" // kompakte Infos, kein EK
  | "safe" // Mieter-sicher (kein Internes)
  | "site" // Adresse + Zutritt für Handwerker
  | "plain" // nur Text ohne €
  | "hidden";

export type LeistungenMode = "vk" | "ek" | "plain" | "hidden";

export type VorgangDetailSight = {
  auftraggeber: BlockSight;
  objektMelder: BlockSight;
  ausfuehrung: BlockSight;
  leistungen: LeistungenMode;
};

/** Wer sieht welchen Block */
export const VORGANG_DETAIL_SIGHT: Record<VorgangDetailRole, VorgangDetailSight> =
  {
    hv: {
      auftraggeber: "hidden",
      objektMelder: "full",
      ausfuehrung: "hidden",
      leistungen: "vk",
    },
    mieter: {
      auftraggeber: "hidden",
      objektMelder: "safe",
      ausfuehrung: "plain",
      leistungen: "plain",
    },
    kunde: {
      auftraggeber: "full",
      objektMelder: "safe",
      ausfuehrung: "summary",
      leistungen: "vk",
    },
    partner: {
      auftraggeber: "hidden",
      objektMelder: "site",
      ausfuehrung: "full",
      leistungen: "ek",
    },
  };

export type VorgangLeistungZeile = {
  id: string;
  title: string;
  beschreibung?: string;
  menge?: string;
  einheit?: string;
  gewerk?: string;
  /** Kunden-/Freigabe-Preis brutto */
  preisBrutto?: number | null;
  /** Partner-Vergütung netto */
  preisEkNetto?: number | null;
  aenderungBadge?: "neu" | "geaendert" | "entfernt";
};

export type VorgangDetailKopf = {
  idLabel: string;
  titel: string;
  statusLabel?: string;
  notfall?: boolean;
  kategorie?: string;
};

export type VorgangDetailAuftraggeber = {
  kostentraeger?: string | null;
  kostentraegerVorgeschlagen?: boolean;
  versicherungsNr?: string | null;
  freigabeStatus?: string | null;
  hvMeldungStatus?: string | null;
  summeBrutto?: number | null;
  rechnungsempfaengerHint?: string | null;
};

export type VorgangDetailObjektMelder = {
  objektTitel?: string | null;
  adresseZeile?: string | null;
  /** Straße / Hausnummer ohne PLZ */
  adresseStrasse?: string | null;
  plzOrt?: string | null;
  einheit?: string | null;
  zugangshinweis?: string | null;
  melderName?: string | null;
  melderTelefon?: string | null;
  melderEmail?: string | null;
  beschreibung?: string | null;
  fotos?: string[];
  /** Melde-Auswahl: Situation, Bereich, Zeitraum */
  situationLabel?: string | null;
  bereichLabel?: string | null;
  zeitraumLabel?: string | null;
};

export type VorgangDetailAusfuehrung = {
  gewerk?: string | null;
  aufgabeNotiz?: string | null;
  terminVon?: string | null;
  terminBis?: string | null;
  terminLabel?: string | null;
  handwerkerName?: string | null;
  kontaktVorOrtName?: string | null;
  kontaktVorOrtTel?: string | null;
  summeEkNetto?: number | null;
};

export type VorgangDetailVM = {
  role: VorgangDetailRole;
  kopf: VorgangDetailKopf;
  auftraggeber: VorgangDetailAuftraggeber;
  objektMelder: VorgangDetailObjektMelder;
  ausfuehrung: VorgangDetailAusfuehrung;
  leistungen: VorgangLeistungZeile[];
};

export function sightForRole(role: VorgangDetailRole): VorgangDetailSight {
  return VORGANG_DETAIL_SIGHT[role];
}

export function kostentraegerLabel(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const map: Record<string, string> = {
    gemeinschaft: "Gemeinschaft",
    sondereigentum: "Sondereigentum",
    mieter: "Mieter",
    versicherung: "Versicherung",
    versicherung_wasserschaden: "Versicherung (Wasserschaden)",
    unklar: "Noch unklar",
  };
  const k = raw.trim().toLowerCase();
  return map[k] ?? raw.trim();
}
