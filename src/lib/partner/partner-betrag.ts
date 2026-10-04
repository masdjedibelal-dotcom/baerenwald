/**
 * Partner-Adapter auf die geteilte Betragsrechnung (shared-domain/regie-betrag).
 * Keine eigene Regie-Mathematik hier.
 */
import {
  positionBetrag,type BetragPosition
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
