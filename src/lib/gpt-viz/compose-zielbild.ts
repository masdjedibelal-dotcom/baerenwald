import type { GptVizBauErklaerung } from "@/lib/gpt-viz/types";

export function fallbackErklaerung(): GptVizBauErklaerung {
  return {
    titel: "Ihr Raumprojekt",
    chat_kurz:
      "So könnte Ihr Raum aussehen — wir begleiten Sie von der Idee bis zur Umsetzung mit allen nötigen Gewerken aus einer Hand.",
    zielbild_kicker: "RAUMVISION · MÜNCHEN",
    zielbild_headline: "Hell, klar, endlich Ihres",
    zielbild_teaser: "Visualisiert mit Bärenwald GPT — umgesetzt als Generalunternehmer.",
    zusammenfassung:
      "Auf Basis Ihrer Visualisierung planen wir die nötigen Gewerke und koordinieren alles als Generalunternehmer in München.",
    gewerke: [
      { name: "Fliesen", beschreibung: "Wand & Boden" },
      { name: "Sanitär", beschreibung: "Armaturen & WC" },
      { name: "Trockenbau", beschreibung: "Vorbereitung" },
    ],
    ablauf: ["Anfrage", "Beratung", "Umsetzung"],
    naechste_schritte: ["Anfrage stellen", "Beratung vor Ort", "Umsetzung aus einer Hand"],
    hinweis_gu: "Ein Ansprechpartner · alle Gewerke",
    cta_text: "Projekt anfragen",
  };
}

export function erklaerungFromBrief(
  erklaerung: GptVizBauErklaerung | null | undefined
): GptVizBauErklaerung {
  if (erklaerung?.zielbild_headline) {
    return {
      ...erklaerung,
      chat_kurz:
        erklaerung.chat_kurz ||
        erklaerung.zusammenfassung.slice(0, 280) ||
        fallbackErklaerung().chat_kurz,
      zielbild_kicker: erklaerung.zielbild_kicker || fallbackErklaerung().zielbild_kicker,
      zielbild_teaser:
        erklaerung.zielbild_teaser ||
        erklaerung.zusammenfassung.split(/[.!?]/)[0]?.trim().slice(0, 90) ||
        fallbackErklaerung().zielbild_teaser,
      zusammenfassung: erklaerung.zusammenfassung || fallbackErklaerung().zusammenfassung,
      naechste_schritte:
        erklaerung.naechste_schritte.length > 0
          ? erklaerung.naechste_schritte.map((s) => s.replace(/^\d+[.)]\s*/, "").trim())
          : erklaerung.ablauf.slice(0, 3),
      cta_text: erklaerung.cta_text || "Projekt anfragen",
    };
  }
  return fallbackErklaerung();
}
