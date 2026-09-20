import { toast, Toaster } from "sonner";
import { TOAST } from '@/lib/portal-copy'
import { isLikelyOfflineError, systemErrorMessage } from '@/lib/portal-copy/errors'

/** Einziger erlaubter Sonner-Toaster-Export — Consumer: `PortalToaster`. */
export { Toaster as PortalSonnerToaster };

export function portalToastSuccess(title: string, description?: string) {
  toast.success(title, {
    description,
    duration: 5500,
  });
}

export function portalToastError(title: string, description?: string) {
  toast.error(title, {
    description,
    duration: 6500,
  });
}

/** Schwaches Netz — Eingaben bleiben; optional Retry-Aktion. */
export function portalToastOfflineRetry(onRetry?: () => void) {
  toast.error("Keine Verbindung – Erneut versuchen", {
    duration: onRetry ? 8000 : 6500,
    action: onRetry
      ? {
          label: "Erneut versuchen",
          onClick: onRetry,
        }
      : undefined,
  });
}

/** System-/Netzwerkfehler — Technik loggen, Nutzer-Copy. */
export function portalToastSystemError(
  error: unknown,
  context = "portal-toast",
  fallback?: string,
  opts?: { onRetry?: () => void }
) {
  const msg = systemErrorMessage(error, context, fallback);
  if (isLikelyOfflineError(error) || msg.includes("Keine Verbindung")) {
    portalToastOfflineRetry(opts?.onRetry);
    return;
  }
  portalToastError(msg);
}

/** Hinweis / Ablehnung / Entfernen — gelb */
export function portalToastWarning(title: string, description?: string) {
  toast.warning(title, {
    description,
    duration: 5500,
  });
}

/** Einheitlich nach Sheet-Speichern */
export function portalToastSaved(title = TOAST.aenderungen_gespeichert) {
  toast.success(title, { duration: 2800 });
}

/** Nach Verwerfen / X ohne Speichern */
export function portalToastDiscarded(title = TOAST.nichtGespeichert) {
  toast.warning(title, { duration: 2800 });
}

/** Partner-Portal */
export const partnerPortalToast = {
  zuweisungAngenommen() {
    portalToastSuccess(TOAST.zuweisung_angenommen,
      "Der Vorgang steht unter Durchführung. Als Nächstes: Unterlagen im Vorgang prüfen und hochladen."
    );
  },
  auftragAngenommen() {
    portalToastSuccess(TOAST.auftrag_angenommen,
      "Der Vorgang steht unter Durchführung. Als Nächstes: fehlende Unterlagen im Vorgang hochladen."
    );
  },
  aenderungenBestaetigt() {
    portalToastSuccess(TOAST.aenderungen_bestaetigt,
      "Die Leistungen sind aktualisiert. Der Vorgang läuft weiter unter Durchführung."
    );
  },
  abgelehnt() {
    portalToastWarning(TOAST.ablehnung_gesendet,
      "Bärenwald wurde informiert und meldet sich bei Rückfragen."
    );
  },
  bautagebuchGespeichert(neu: boolean) {
    portalToastSuccess(
      neu ? "Tagebucheintrag erstellt" : "Tagebucheintrag gespeichert",
      neu
        ? "Mieter und Verwaltung sehen den Eintrag sofort im Portal."
        : "Ihre Änderungen wurden übernommen."
    );
  },
  bautagebuchGeloescht() {
    portalToastWarning(TOAST.eintrag_geloescht,
      "Der Bautagebuch-Eintrag wurde entfernt."
    );
  },
  unterlagenHochgeladen() {
    portalToastSuccess(TOAST.unterlagen_hochgeladen,
      "Bärenwald prüft die Dokumente. Sie finden sie unter Unterlagen im Vorgang."
    );
  },
  rechnungEingereicht() {
    portalToastSuccess(TOAST.rechnung_gesendet,
      "Bärenwald hat Ihre Rechnung erhalten."
    );
  },
  rahmenvertragAkzeptiert() {
    portalToastSuccess(TOAST.rahmenvertrag_bestaetigt,
      "Ihre Stammdaten sind vollständig. Neue Zuweisungen können Sie direkt annehmen."
    );
  },
  complianceHochgeladen(bezeichnung: string) {
    portalToastSuccess(TOAST.dokument_hochgeladen,
      `„${bezeichnung}“ wurde eingereicht und wird von Bärenwald geprüft.`
    );
  },
  complianceGeloescht(bezeichnung: string) {
    portalToastWarning(TOAST.dokument_entfernt,
      `„${bezeichnung}“ wurde gelöscht.`
    );
  },
  stammdatenGespeichert() {
    portalToastSuccess(TOAST.stammdaten_gespeichert,
      "Ihre Angaben wurden übernommen."
    );
  },
  projektvertragBestaetigt() {
    portalToastSuccess(TOAST.projektvertrag_bestaetigt,
      "Der Auftrag ist verbindlich. Als Nächstes: Unterlagen im Vorgang hochladen."
    );
  },
  erledigtGemeldet() {
    portalToastSuccess(TOAST.als_erledigt_gemeldet,
      "Bärenwald und die Verwaltung wurden informiert."
    );
  },
  hwAngebotEingereicht() {
    portalToastSuccess(TOAST.angebot_eingereicht,
      "Positionen und Summe sind bei Bärenwald und der Verwaltung als empfohlenes Angebot sichtbar."
    );
  },
  abschlussSigniert() {
    portalToastSuccess(TOAST.auftrag_abgeschlossen);
  },
};

/** Kunden-Portal (MeinBärenwald) */
export const kundePortalToast = {
  angebotAngenommen() {
    portalToastSuccess(TOAST.angebot_angenommen,
      "Wir bereiten den Auftrag vor und melden uns, sobald es weitergeht."
    );
  },
  angebotAbgelehnt() {
    portalToastWarning(TOAST.angebot_abgelehnt, "Danke für Ihre Rückmeldung.");
  },
  aenderungenAngenommen() {
    portalToastSuccess(TOAST.aenderungen_angenommen,
      "Danke — wir setzen die Anpassungen am Auftrag um."
    );
  },
  feedbackGesendet() {
    portalToastSuccess(TOAST.feedback_gesendet,
      "Danke für Ihre Rückmeldung — Bärenwald wurde informiert."
    );
  },
};

/** Auftraggeber-Portal (Verwaltung) */
export const orgPortalToast = {
  meldungErfasst() {
    portalToastSuccess(TOAST.meldung_erfasst,
      "Die Meldung erscheint unter Eingang. Als Nächstes: Vorgang freigeben oder ablehnen."
    );
  },
  einladungErstellt() {
    portalToastSuccess(TOAST.einladung_erstellt,
      "Senden Sie den Link an den Mieter, damit er Details und Fotos ergänzen kann."
    );
  },
  angebotEingefordert() {
    portalToastSuccess(TOAST.angebot_angefordert,
      "Bärenwald erstellt ein Angebot. Sie werden informiert, sobald es zur Freigabe bereit ist."
    );
  },
  hmBegutachten() {
    portalToastSuccess(TOAST.hausmeister_pruefung_gestartet,
      "Der Vorgang liegt beim Hausmeister. Checkliste unter Tab „Hausmeister“; der HM wurde benachrichtigt."
    );
  },
  hmErledigt() {
    portalToastSuccess(TOAST.vom_hausmeister_erledigt,
      "Der Vorgang ist abgeschlossen — ohne Beauftragung an Bärenwald."
    );
  },
  hmZurueckAnHv() {
    portalToastSuccess(TOAST.an_die_verwaltung_zurueckgegeben,
      "Die Hausmeister-Prüfung wurde abgelehnt. Der Vorgang liegt wieder bei der HV."
    );
  },
  hmFachfirmaAngebot() {
    portalToastSuccess(TOAST.an_baerenwald_uebergeben,
      "Vorbefund liegt vor. Bärenwald erstellt ein Angebot."
    );
  },
  hmFachfirmaAkut() {
    portalToastSuccess(TOAST.akut_an_baerenwald,
      "Soforteinsatz angefordert. Vorbefund liegt für Disposition bereit."
    );
  },
  meldungAbgelehnt() {
    portalToastWarning(TOAST.meldung_abgelehnt,
      "Der Mieter kann bei Bedarf eine neue Meldung einreichen."
    );
  },
  kleinreparaturFreigegeben() {
    portalToastSuccess(TOAST.sofort_beauftragt,
      "Der Partner rückt ohne formales Angebot aus und kann direkt starten."
    );
  },
  freigegeben() {
    portalToastSuccess(TOAST.angebot_freigegeben,
      "Bärenwald startet die Beauftragung der Partner."
    );
  },
  freigabeAbgelehnt() {
    portalToastWarning(TOAST.freigabe_abgelehnt,
      "Bärenwald wurde informiert und meldet sich bei Rückfragen."
    );
  },
  einladungErneutGesendet() {
    portalToastSuccess(TOAST.einladung_erneut_gesendet,
      "Der Mieter erhält den Link noch einmal per E-Mail."
    );
  },
  /** Nach „Portal-Link senden“ — Link bereit (Mail-App ggf. manuell). */
  portalLinkGesendet(opts?: { rolle?: string }) {
    const rolle = opts?.rolle?.trim();
    portalToastSuccess(TOAST.portal_link_bereit,
      rolle
        ? `Einladung für ${rolle} — Mail-App über den Button öffnen.`
        : "Mail-App über den Button öffnen oder Link kopieren."
    );
  },
  einstellungenGespeichert() {
    portalToastSuccess(TOAST.einstellungen_gespeichert,
      "Ihre Freigabe-Regeln sind aktiv."
    );
  },
  objektAngelegt() {
    portalToastSuccess(TOAST.objekt_angelegt,
      "Das Gebäude erscheint in der Mieter-Auswahl im Meldeformular."
    );
  },
  linkKopiert() {
    portalToastSuccess(TOAST.link_kopiert,
      "Der Melde-Link liegt in der Zwischenablage."
    );
  },
  aushangPdfErstellt() {
    portalToastSuccess(TOAST.aushang_pdf_erstellt,
      "Die PDF wurde heruntergeladen — zum Ausdrucken im Treppenhaus."
    );
  },
  objektAktualisiert() {
    portalToastSuccess(TOAST.objekt_gespeichert,
      "Die Objektdaten wurden aktualisiert."
    );
  },
  objektGeloescht() {
    portalToastWarning(TOAST.objekt_geloescht,
      "Das Gebäude wurde aus der Liste entfernt."
    );
  },
  projektAnfrageGesendet() {
    portalToastSuccess(TOAST.anfrage_eingereicht,
      "Bärenwald prüft Ihr Vorhaben und meldet sich mit einem Angebot."
    );
  },
  feedbackGesendet() {
    portalToastSuccess(TOAST.feedback_gesendet, "Danke für Ihre Rückmeldung.");
  },
  maengelGemeldet() {
    portalToastWarning(TOAST.maengel_gemeldet,
      "Bärenwald wurde informiert und kümmert sich um die Nachbearbeitung."
    );
  },
  servicepaketAnfrageGesendet() {
    portalToastSuccess(TOAST.anfrage_eingereicht,
      "Bärenwald meldet sich mit den nächsten Schritten zur Betreuung."
    );
  },
  saved() {
    portalToastSuccess(TOAST.gespeichertKurz, "Die Einstellungen wurden übernommen.");
  },
};
