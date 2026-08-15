import { toast } from "sonner";

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

/** Hinweis / Ablehnung / Entfernen — gelb */
export function portalToastWarning(title: string, description?: string) {
  toast.warning(title, {
    description,
    duration: 5500,
  });
}

/** Partner-Portal */
export const partnerPortalToast = {
  zuweisungAngenommen() {
    portalToastSuccess(
      "Zuweisung angenommen",
      "Der Vorgang steht unter Durchführung. Als Nächstes: Unterlagen im Vorgang prüfen und hochladen."
    );
  },
  auftragAngenommen() {
    portalToastSuccess(
      "Auftrag angenommen",
      "Der Vorgang steht unter Durchführung. Als Nächstes: fehlende Unterlagen im Vorgang hochladen."
    );
  },
  aenderungenBestaetigt() {
    portalToastSuccess(
      "Änderungen bestätigt",
      "Die Leistungen sind aktualisiert. Der Vorgang läuft weiter unter Durchführung."
    );
  },
  abgelehnt() {
    portalToastWarning(
      "Ablehnung gesendet",
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
    portalToastWarning(
      "Eintrag gelöscht",
      "Der Bautagebuch-Eintrag wurde entfernt."
    );
  },
  unterlagenHochgeladen() {
    portalToastSuccess(
      "Unterlagen hochgeladen",
      "Bärenwald prüft die Dokumente. Sie finden sie unter Unterlagen im Vorgang."
    );
  },
  rechnungEingereicht() {
    portalToastSuccess(
      "Rechnung gesendet",
      "Bärenwald hat die Rechnung im CRM erhalten."
    );
  },
  rahmenvertragAkzeptiert() {
    portalToastSuccess(
      "Rahmenvertrag bestätigt",
      "Ihre Stammdaten sind vollständig. Neue Zuweisungen können Sie direkt annehmen."
    );
  },
  complianceHochgeladen(bezeichnung: string) {
    portalToastSuccess(
      "Dokument hochgeladen",
      `„${bezeichnung}“ wurde eingereicht und wird von Bärenwald geprüft.`
    );
  },
  complianceGeloescht(bezeichnung: string) {
    portalToastWarning(
      "Dokument entfernt",
      `„${bezeichnung}“ wurde gelöscht.`
    );
  },
  stammdatenGespeichert() {
    portalToastSuccess(
      "Stammdaten gespeichert",
      "Ihre Angaben wurden übernommen."
    );
  },
  projektvertragBestaetigt() {
    portalToastSuccess(
      "Projektvertrag bestätigt",
      "Der Auftrag ist verbindlich. Als Nächstes: Unterlagen im Vorgang hochladen."
    );
  },
  erledigtGemeldet() {
    portalToastSuccess(
      "Als erledigt gemeldet",
      "Bärenwald und die Verwaltung wurden informiert."
    );
  },
  hwAngebotEingereicht() {
    portalToastSuccess(
      "Angebot eingereicht",
      "Positionen und Summe sind bei Bärenwald und der Verwaltung als empfohlenes Angebot sichtbar."
    );
  },
  abschlussSigniert() {
    portalToastSuccess("Auftrag abgeschlossen");
  },
};

/** Kunden-Portal (MeinBärenwald) */
export const kundePortalToast = {
  angebotAngenommen() {
    portalToastSuccess(
      "Angebot angenommen",
      "Wir bereiten den Auftrag vor und melden uns, sobald es weitergeht."
    );
  },
  angebotAbgelehnt() {
    portalToastWarning("Angebot abgelehnt", "Danke für Ihre Rückmeldung.");
  },
  aenderungenAngenommen() {
    portalToastSuccess(
      "Änderungen angenommen",
      "Danke — wir setzen die Anpassungen am Auftrag um."
    );
  },
  feedbackGesendet() {
    portalToastSuccess(
      "Feedback gesendet",
      "Danke für Ihre Rückmeldung — Bärenwald wurde informiert."
    );
  },
};

/** Auftraggeber-Portal (Verwaltung) */
export const orgPortalToast = {
  meldungErfasst() {
    portalToastSuccess(
      "Meldung erfasst",
      "Die Meldung erscheint unter Eingang. Als Nächstes: Vorgang freigeben oder ablehnen."
    );
  },
  einladungErstellt() {
    portalToastSuccess(
      "Einladung erstellt",
      "Senden Sie den Link an den Mieter, damit er Details und Fotos ergänzen kann."
    );
  },
  angebotEingefordert() {
    portalToastSuccess(
      "Angebot angefordert",
      "Bärenwald erstellt ein Angebot. Sie werden informiert, sobald es zur Freigabe bereit ist."
    );
  },
  hmBegutachten() {
    portalToastSuccess(
      "Hausmeister-Prüfung gestartet",
      "Checkliste ist im Tab „Hausmeister“ bereit. Optional wurde der Kontakt per E-Mail informiert."
    );
  },
  hmErledigt() {
    portalToastSuccess(
      "Vom Hausmeister erledigt",
      "Der Vorgang ist abgeschlossen — ohne Beauftragung an Bärenwald."
    );
  },
  hmFachfirmaAngebot() {
    portalToastSuccess(
      "An Bärenwald übergeben",
      "Vorbefund liegt vor. Bärenwald erstellt ein Angebot."
    );
  },
  hmFachfirmaAkut() {
    portalToastSuccess(
      "Akut an Bärenwald",
      "Soforteinsatz angefordert. Vorbefund liegt für Disposition bereit."
    );
  },
  meldungAbgelehnt() {
    portalToastWarning(
      "Meldung abgelehnt",
      "Der Mieter kann bei Bedarf eine neue Meldung einreichen."
    );
  },
  kleinreparaturFreigegeben() {
    portalToastSuccess(
      "Sofort beauftragt",
      "Der Handwerker rückt ohne formales Angebot aus und kann direkt starten."
    );
  },
  freigegeben() {
    portalToastSuccess(
      "Angebot freigegeben",
      "Bärenwald startet die Beauftragung der Handwerker."
    );
  },
  freigabeAbgelehnt() {
    portalToastWarning(
      "Freigabe abgelehnt",
      "Bärenwald wurde informiert und meldet sich bei Rückfragen."
    );
  },
  einladungErneutGesendet() {
    portalToastSuccess(
      "Einladung erneut gesendet",
      "Der Mieter erhält den Link noch einmal per E-Mail."
    );
  },
  einstellungenGespeichert() {
    portalToastSuccess(
      "Einstellungen gespeichert",
      "Ihre Freigabe-Regeln sind aktiv."
    );
  },
  objektAngelegt() {
    portalToastSuccess(
      "Objekt angelegt",
      "Das Gebäude erscheint in der Mieter-Auswahl im Meldeformular."
    );
  },
  linkKopiert() {
    portalToastSuccess(
      "Link kopiert",
      "Der Melde-Link liegt in der Zwischenablage."
    );
  },
  aushangPdfErstellt() {
    portalToastSuccess(
      "Aushang-PDF erstellt",
      "Die PDF wurde heruntergeladen — zum Ausdrucken im Treppenhaus."
    );
  },
  objektAktualisiert() {
    portalToastSuccess(
      "Objekt gespeichert",
      "Die Objektdaten wurden aktualisiert."
    );
  },
  objektGeloescht() {
    portalToastWarning(
      "Objekt gelöscht",
      "Das Gebäude wurde aus der Liste entfernt."
    );
  },
  projektAnfrageGesendet() {
    portalToastSuccess(
      "Anfrage eingereicht",
      "Bärenwald prüft Ihr Vorhaben und meldet sich mit einem Angebot."
    );
  },
  feedbackGesendet() {
    portalToastSuccess("Feedback gesendet", "Danke für Ihre Rückmeldung.");
  },
  maengelGemeldet() {
    portalToastWarning(
      "Mängel gemeldet",
      "Bärenwald wurde informiert und kümmert sich um die Nachbearbeitung."
    );
  },
  servicepaketAnfrageGesendet() {
    portalToastSuccess(
      "Anfrage eingereicht",
      "Bärenwald meldet sich mit den nächsten Schritten zur Betreuung."
    );
  },
  saved() {
    portalToastSuccess("Gespeichert", "Die Einstellungen wurden übernommen.");
  },
};
