import type { FunnelState } from "@/lib/funnel/types";

/** Kurzer Hinweis zur 15%-GU-Marge bei Bad-Projekten — Transparenz fürs Ergebnis. */
export const BW_GU_KOORDINATION_HINT =
  "Inkl. GU-Koordination & Gewährleistung";

/**
 * Merkmale für die Ergebnisanzeige (Bad / Sanitär), abgeleitet aus dem Funnel-State.
 * Nur relevant wenn `bereiche` „bad“ enthält (Bad-Renovierung).
 */
export function buildBwBadActiveFeatures(state: FunnelState): string[] {
  if (!state.bereiche.includes("bad")) return [];

  const san = state.fachdetails?.sanitaer;
  const out: string[] = [];

  if (san?.badWas === "komplett") {
    out.push("Bad-Komplettsanierung");
  }
  if (san?.badWas === "wanne_dusche") {
    out.push("Umbau Wanne zu Dusche");
  }

  const neuverrohrung =
    san?.badRohreNeu === true || san?.rohre === "neu";
  if (neuverrohrung) {
    out.push("Inkl. Neuverrohrung");
  }

  if (san?.badHeizkoerper === "handtuchwaermer") {
    const n = Math.max(1, san.badHeizkoerperAnzahl ?? 1);
    out.push(`Inkl. ${n}× Handtuchwärmer`);
  }

  if (state.badAusstattung === "gehoben") {
    out.push("Premium-Ausstattungslinie");
  }

  return out;
}

export function shouldShowBwBadGuHint(state: FunnelState): boolean {
  return (
    state.bereiche.includes("bad") &&
    state.priceMin > 0 &&
    state.priceMax > 0
  );
}
