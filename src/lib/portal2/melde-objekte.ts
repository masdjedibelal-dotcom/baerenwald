import type {
  MeldeObjektDisplay,
  MeldeObjektSource,
} from "@/lib/portal2/basisdaten-types";

/** Mock-`adr`: PLZ + Ort („10115 Berlin-Mitte“). Fallback: Straße + Hausnr. */
export function formatMeldeObjektAdr(src: {
  strasse?: string | null;
  hausnummer?: string | null;
  plz?: string | null;
  ort?: string | null;
}): string {
  const plzOrt = [src.plz?.trim(), src.ort?.trim()].filter(Boolean).join(" ");
  if (plzOrt) return plzOrt;
  return [src.strasse?.trim(), src.hausnummer?.trim()].filter(Boolean).join(" ");
}

/**
 * Einheiten-Label für Anzeige.
 * Primär `einheiten_hinweis` (Objekte-Tabelle); sonst optional Count aus Teil E.
 */
export function formatMeldeObjektWe(
  einheitenHinweis?: string | null,
  einheitenCount?: number | null
): string | null {
  const hint = einheitenHinweis?.trim();
  if (hint) return hint;
  if (
    typeof einheitenCount === "number" &&
    Number.isFinite(einheitenCount) &&
    einheitenCount > 0
  ) {
    return einheitenCount === 1
      ? "1 Wohneinheit"
      : `${Math.floor(einheitenCount)} Wohneinheiten`;
  }
  return null;
}

/** `kunden_objekte` / OrganisationObjekt → Mock-MELDE_OBJEKTE-Anzeigeform. */
export function toMeldeObjektDisplay(src: MeldeObjektSource): MeldeObjektDisplay {
  const name = (src.titel ?? src.name ?? "").trim() || "Objekt";
  return {
    id: src.id,
    name,
    adr: formatMeldeObjektAdr(src),
    we: formatMeldeObjektWe(src.einheiten_hinweis, src.einheitenCount),
  };
}

export function toMeldeObjektDisplayList(
  rows: MeldeObjektSource[]
): MeldeObjektDisplay[] {
  return rows.map(toMeldeObjektDisplay);
}
