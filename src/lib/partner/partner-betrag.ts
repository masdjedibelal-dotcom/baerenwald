/**
 * Partner-Adapter auf die geteilte Betragsrechnung (shared-domain/regie-betrag).
 * Keine eigene Regie-Mathematik hier.
 */
import {
  positionBetrag,
  summeBetraege,
  type BetragPosition,
} from "@/lib/shared-domain/regie-betrag";

export type PartnerBetragQuelle = {
  typ?: string | null;
  verguetung?: string | null;
  menge?: number | null;
  stundensatz?: number | null;
  preis_partner?: number | null;
  zeit_minuten_summe?: number | null;
};

export function partnerToBetragPosition(p: PartnerBetragQuelle): BetragPosition {
  return {
    typ: p.typ,
    verguetung: p.verguetung,
    menge: p.menge ?? null,
    stundensatz: p.stundensatz,
    preis_partner: p.preis_partner,
    erfasst_minuten: p.zeit_minuten_summe ?? null,
  };
}

export function partnerPositionBetrag(p: PartnerBetragQuelle): number {
  return positionBetrag(partnerToBetragPosition(p), "partner");
}

export function partnerSummeBetraege(positionen: PartnerBetragQuelle[]): number {
  return summeBetraege(positionen.map(partnerToBetragPosition), "partner");
}

/** Bereits aufgelöste Zeilenbeträge (z. B. HW-Eingabe) als Pauschalen summierbar machen. */
export function nettoZeilenAlsBetragPositionen(
  betraege: Array<number | null | undefined>
): BetragPosition[] {
  return betraege.map((n) => ({
    preis_partner:
      n != null && Number.isFinite(n) && n >= 0 ? n : null,
  }));
}
