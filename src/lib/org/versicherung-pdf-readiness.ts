/**
 * Wann Versicherungs-Teil-PDFs freigeschaltet sind.
 * Keine neuen Tabellen — nur bestehende Lead-/Befund-/Bautagebuch-Signale.
 */

export type VersicherungPdfPhase = "meldung" | "ursache";

export type VersicherungPdfPhaseStatus = {
  ready: boolean;
  /** Kurzer UI-/API-Hinweis, warum noch nicht. */
  blockers: string[];
};

export type VersicherungPdfReadiness = {
  kostentraegerVersicherung: boolean;
  meldung: VersicherungPdfPhaseStatus;
  ursache: VersicherungPdfPhaseStatus;
};

export type VersicherungPdfReadinessInput = {
  kostentraeger?: string | null;
  hvMeldungStatus?: string | null;
  /** lead_befunde vorhanden mit Substanz */
  hasHmBefund: boolean;
  /** Bautagebuch eintrag_typ = befund */
  hasHwBefund: boolean;
  /** Sonstige BT-Einträge oder Positions-Updates vor Ort */
  hasHwUpdate: boolean;
  /** HM-Pfad wurde jemals gestartet (hm_pruefung | hm_erledigt | befund existiert) */
  hmPathTaken: boolean;
  /** Mindestens ein Auftrag am Lead */
  hasAuftrag: boolean;
};

export function resolveVersicherungPdfReadiness(
  input: VersicherungPdfReadinessInput
): VersicherungPdfReadiness {
  const kt = String(input.kostentraeger ?? "")
    .trim()
    .toLowerCase();
  const kostentraegerVersicherung = kt === "versicherung";
  const hv = String(input.hvMeldungStatus ?? "")
    .trim()
    .toLowerCase();
  const hmOffen = hv === "hm_pruefung";

  const meldungBlockers: string[] = [];
  if (!kostentraegerVersicherung) {
    meldungBlockers.push("Kostenträger ist nicht Versicherung.");
  }

  const ursacheBlockers: string[] = [];
  if (!kostentraegerVersicherung) {
    ursacheBlockers.push("Kostenträger ist nicht Versicherung.");
  }

  if (hmOffen) {
    ursacheBlockers.push("Wartet auf Hausmeister-Befund.");
  }

  const hasUrsacheSource =
    input.hasHmBefund || input.hasHwBefund || input.hasHwUpdate;

  // HM-Pfad ohne abgeschlossenen Befund und ohne HW-Ursache
  if (
    !hmOffen &&
    input.hmPathTaken &&
    !input.hasHmBefund &&
    !input.hasHwBefund &&
    !input.hasHwUpdate
  ) {
    ursacheBlockers.push("Hausmeister-Befund fehlt noch.");
  }

  // Auftrag ohne Vor-Ort-Doku und ohne HM-Befund
  if (
    !hmOffen &&
    input.hasAuftrag &&
    !input.hasHwBefund &&
    !input.hasHwUpdate &&
    !input.hasHmBefund
  ) {
    ursacheBlockers.push("Wartet auf Handwerker-Update vor Ort.");
  }

  if (
    kostentraegerVersicherung &&
    !hmOffen &&
    !hasUrsacheSource &&
    ursacheBlockers.length === 0
  ) {
    ursacheBlockers.push(
      "Ursache noch nicht dokumentiert (Hausmeister- oder Handwerker-Befund)."
    );
  }

  const uniq = (xs: string[]) => [...new Set(xs)];

  const ursacheReady =
    kostentraegerVersicherung &&
    !hmOffen &&
    hasUrsacheSource &&
    // Wenn HM-Pfad: HM-Befund ODER (HW liefert Ursache)
    (!input.hmPathTaken ||
      input.hasHmBefund ||
      input.hasHwBefund ||
      input.hasHwUpdate) &&
    // Wenn Auftrag: HW-Signal ODER HM-Befund reicht
    (!input.hasAuftrag ||
      input.hasHwBefund ||
      input.hasHwUpdate ||
      input.hasHmBefund);

  return {
    kostentraegerVersicherung,
    meldung: {
      ready: meldungBlockers.length === 0,
      blockers: uniq(meldungBlockers),
    },
    ursache: {
      ready: ursacheReady,
      blockers: uniq(ursacheBlockers),
    },
  };
}

export function phaseStoragePath(
  leadId: string,
  phase: VersicherungPdfPhase
): string {
  return `versicherungsakten/lead-${leadId}-${phase}.pdf`;
}

export function phasePdfFilename(
  leadId: string,
  phase: VersicherungPdfPhase
): string {
  const key = leadId.slice(0, 8);
  return phase === "meldung"
    ? `schadenmeldung-${key}.pdf`
    : `schadenursache-${key}.pdf`;
}
