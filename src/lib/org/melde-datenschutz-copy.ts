/** Art.-13-Kurzhinweise für öffentliches Meldeformular — Vorlage, keine Rechtsberatung. */

export function meldeDatenschutzKurztext(orgName: string, mode: "melden" | "ergaenzen"): string[] {
  const intro =
    mode === "ergaenzen"
      ? `Du ergänzt eine vorerfasste Meldung. Verantwortlich ist in der Regel deine Verwaltung (${orgName}). Ein technischer Dienstleister unterstützt die Erfassung und Koordination.`
      : `Verantwortlich ist in der Regel deine Verwaltung (${orgName}). Ein technischer Dienstleister unterstützt die Erfassung und Koordination der Bearbeitung.`;

  return [
    intro,
    "Zweck: Aufnahme und Bearbeitung deiner Meldung, Abstimmung mit der Verwaltung und ggf. Weitergabe an beauftragte Handwerksbetriebe.",
    "Rechtsgrundlagen: Art. 6 Abs. 1 lit. b und/oder lit. f DSGVO. Empfänger: Ihre Verwaltung, ein technischer Dienstleister für den Plattformbetrieb sowie ggf. beauftragte Handwerksbetriebe.",
    "Speicherdauer: bis Abschluss des Vorgangs und darüber hinaus nur im Rahmen gesetzlicher Aufbewahrungspflichten.",
    "Bei Notfällen kann die Meldung zur Gefahrenabwehr ohne vorherige Freigabe weitergeleitet werden.",
    "Bitte lade nur schadensrelevante Fotos hoch und vermeide unnötige personenbezogene Inhalte.",
  ];
}

export const MELDE_DATENSCHUTZ_LINK = "/datenschutz#melden-hv";
export const MELDE_IMPRESSUM_LINK = "/impressum";
