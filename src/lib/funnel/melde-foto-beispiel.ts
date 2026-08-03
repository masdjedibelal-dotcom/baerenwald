/**
 * Beispiel-Fotos für den Melde-Upload (Mieter / HV / anon) —
 * je Schadensbereich ein Vorbild, wie fotografiert werden soll.
 */

import {
  kaputtBereichToMeldeId,
} from "@/lib/funnel/melde-bereich-map";
import type { MeldeBereichId } from "@/lib/org/melde-bereiche";

export type MeldeFotoBeispiel = {
  src: string;
  alt: string;
  tip: string;
  label: string;
};

const BASE = "/melde/foto-beispiele";

export const MELDE_FOTO_BEISPIELE: Record<MeldeBereichId, MeldeFotoBeispiel> = {
  wasser: {
    src: `${BASE}/wasser.webp`,
    label: "Wasser / Rohr",
    alt: "Beispiel: Nahaufnahme eines tropfenden Rohranschlusses unter dem Waschbecken",
    tip: "Nah an das Leck heran — tropfende Stelle und Pfütze klar im Bild, gut beleuchtet.",
  },
  heizung: {
    src: `${BASE}/heizung.webp`,
    label: "Heizung",
    alt: "Beispiel: Heizkörper mit Thermostat und Ventilen im Bild",
    tip: "Heizkörper und Thermostat/Ventil mit drauf — so sieht man Gerät und Einstellung.",
  },
  strom: {
    src: `${BASE}/strom.webp`,
    label: "Strom / Sicherung",
    alt: "Beispiel: offener Sicherungskasten mit ausgelöster Sicherung",
    tip: "Sicherungskasten offen fotografieren — welche Sicherung ausgelöst hat, muss lesbar sein.",
  },
  fenster_tuer: {
    src: `${BASE}/fenster_tuer.webp`,
    label: "Fenster / Tür",
    alt: "Beispiel: Fensterrahmen mit Riss in der Scheibe",
    tip: "Rahmen und Schaden zusammen zeigen — Riss, Dichtung oder Schloss gut erkennbar.",
  },
  dach: {
    src: `${BASE}/dach.webp`,
    label: "Dach / Feuchte von oben",
    alt: "Beispiel: Wasserfleck an der Decke von unten fotografiert",
    tip: "Fleck von unten fotografieren — Ausmaß der Feuchte und Umgebung mit im Bild.",
  },
  schimmel: {
    src: `${BASE}/schimmel.webp`,
    label: "Schimmel",
    alt: "Beispiel: Schimmelflecken in einer Wandecke",
    tip: "Nahaufnahme der befallenen Stelle — Ecke, Größe und Umgebung erkennbar.",
  },
  baum_notfall: {
    src: `${BASE}/sonstiges.webp`,
    label: "Baum / Sturm",
    alt: "Beispiel: Schaden klar und nah fotografiert",
    tip: "Übersicht und Detail: einmal von weiter weg, einmal nah am Schaden.",
  },
  sonstiges: {
    src: `${BASE}/sonstiges.webp`,
    label: "Sonstiges",
    alt: "Beispiel: defekte Klingelanlage nah und klar fotografiert",
    tip: "Gegenstand und Defekt scharf und nah — ohne unnötigen Hintergrund.",
  },
};

/** Funnel-Bereichswert (sanitaer, heizung, …) → Beispiel. */
export function getMeldeFotoBeispielForFunnelBereich(
  bereich: string | null | undefined
): MeldeFotoBeispiel {
  const id = kaputtBereichToMeldeId(bereich ?? "sonstiges");
  return MELDE_FOTO_BEISPIELE[id] ?? MELDE_FOTO_BEISPIELE.sonstiges;
}
