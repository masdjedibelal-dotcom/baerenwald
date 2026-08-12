/**
 * HV-Einstellungen: Kurzbullets — welche Mieter-Funnel-Fälle
 * unter „Direktbeauftragung bei Sofortmaßnahme“ fallen.
 * Spiegel zu `isMeldeDirektauftrag` (keine pauschalen Bereiche).
 */

export const SOFORTMASSNAHME_FAELLE_POPUP_TITLE = "Fälle" as const;

export const SOFORTMASSNAHME_FAELLE_INTRO =
  "Diese Mieter-Meldungen gelten als Sofortmaßnahme — bei aktiver Direktbeauftragung ohne Ihre Freigabe, nur Info:" as const;

export type SofortmassnahmeFaelleGruppe = {
  bereich: string;
  bullets: readonly string[];
};

export const SOFORTMASSNAHME_FAELLE_GRUPPEN: readonly SofortmassnahmeFaelleGruppe[] =
  [
    {
      bereich: "Wasser",
      bullets: [
        "Wasser läuft oder tritt stark aus",
        "Wasser aus Decke/Wand, solange es nicht klar gestoppt ist",
        "Rutschgefahr oder Strom betroffen",
      ],
    },
    {
      bereich: "Strom",
      bullets: [
        "Kein Strom in der Wohnung",
        "FI-/Sicherung fliegt wieder raus",
      ],
    },
    {
      bereich: "Heizung",
      bullets: [
        "Ganze Wohnung kalt",
        "Kein Warmwasser",
        "Wasser am Heizkörper läuft noch",
      ],
    },
    {
      bereich: "Dach",
      bullets: [
        "Dach undicht",
        "Rinne, Fassade oder Ziegel — akut bei Regen / gerade eben",
      ],
    },
    {
      bereich: "Fenster & Tür",
      bullets: [
        "Scheibe kaputt",
        "Schloss / Schlüssel",
        "Wohnungs- oder Haustür nicht absperrbar",
      ],
    },
  ] as const;

export const SOFORTMASSNAHME_FAELLE_FOOTNOTE =
  "Schimmel und sonstige Meldungen laufen normal über Angebot und Freigabe." as const;
