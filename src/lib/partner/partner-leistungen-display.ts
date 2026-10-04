import type { PartnerAuftragPosition } from "@/lib/partner/get-partner-data";
import {
  partnerPositionBetrag
} from "@/lib/partner/partner-betrag";
import type { PartnerKonditionZeile } from "@/lib/partner/partner-konditionen";

export type PartnerAngebotPositionenFilter = {
  gewerkId?: string | null;
  handwerkerId?: string | null;
};

export function buildPartnerAuftragKonditionZeilen(
  positionen: PartnerAuftragPosition[]
): PartnerKonditionZeile[] {
  return positionen.map((pos) => {
    const title =
      [pos.gewerk_name, pos.leistung_name].filter(Boolean).join(" — ") || "Leistung";
    const partnerNettoRaw = partnerPositionBetrag(pos);
    const partnerNetto = partnerNettoRaw > 0 ? partnerNettoRaw : null;
    const typ = pos.aenderung_typ ?? null;
    const isEntfernt = typ === "entfernt";
    const isGeaendert = typ === "geaendert";
    const isNeu = typ === "neu";
    const preisAlt =
      pos.preis_alt != null &&
      Number.isFinite(pos.preis_alt) &&
      pos.preis_alt >= 0
        ? pos.preis_alt
        : null;

    const menge =
      pos.menge != null && Number.isFinite(pos.menge)
        ? String(pos.menge).replace(".", ",")
        : null;
    const einheit = pos.einheit?.trim() || null;
    const mengeLine = [menge, einheit].filter(Boolean).join(" ");
    const gewerk = pos.gewerk_name?.trim() || null;
    const meta = [mengeLine || null, gewerk].filter(Boolean).join(" · ") || undefined;

    return {
      id: pos.id,
      title: pos.leistung_name?.trim() || title,
      beschreibung:
        pos.beschreibung && pos.beschreibung !== title ? pos.beschreibung : undefined,
      meta,
      vorschlagNetto: isEntfernt ? preisAlt ?? partnerNetto : partnerNetto,
      hwNetto: isEntfernt ? undefined : partnerNetto ?? undefined,
      vorherNetto: isGeaendert ? preisAlt : undefined,
      geaendert: isGeaendert,
      readonly: isEntfernt,
      zeilenBadge: isEntfernt
        ? "entfernt"
        : isGeaendert
          ? "geaendert"
          : isNeu
            ? "neu"
            : undefined,
      mwstSatz: 19,
    };
  });
}
