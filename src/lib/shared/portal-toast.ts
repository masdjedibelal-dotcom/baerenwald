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
    portalToastSuccess(
      "Ablehnung gesendet",
      "Bärenwald wurde informiert und meldet sich bei Rückfragen."
    );
  },
  bautagebuchGespeichert(neu: boolean) {
    portalToastSuccess(
      neu ? "Tagebucheintrag erstellt" : "Tagebucheintrag gespeichert",
      neu
        ? "Bärenwald prüft den Eintrag. Die Tagebuch-Anforderung ist damit erledigt."
        : "Deine Änderungen wurden übernommen."
    );
  },
  bautagebuchGeloescht() {
    portalToastSuccess("Eintrag gelöscht", "Der Bautagebuch-Eintrag wurde entfernt.");
  },
  unterlagenHochgeladen() {
    portalToastSuccess(
      "Unterlagen hochgeladen",
      "Bärenwald prüft die Dokumente. Du findest sie unter Unterlagen im Vorgang."
    );
  },
  rechnungEingereicht() {
    portalToastSuccess(
      "Rechnung eingereicht",
      "Bärenwald erhält deine Rechnung zur Prüfung."
    );
  },
  rahmenvertragAkzeptiert() {
    portalToastSuccess(
      "Rahmenvertrag bestätigt",
      "Deine Stammdaten sind vollständig. Neue Zuweisungen kannst du direkt annehmen."
    );
  },
  complianceHochgeladen(bezeichnung: string) {
    portalToastSuccess(
      "Dokument hochgeladen",
      `„${bezeichnung}“ wurde eingereicht und wird von Bärenwald geprüft.`
    );
  },
  complianceGeloescht(bezeichnung: string) {
    portalToastSuccess("Dokument entfernt", `„${bezeichnung}“ wurde gelöscht.`);
  },
  stammdatenGespeichert() {
    portalToastSuccess("Stammdaten gespeichert", "Deine Angaben wurden übernommen.");
  },
  projektvertragBestaetigt() {
    portalToastSuccess(
      "Projektvertrag bestätigt",
      "Der Auftrag ist verbindlich. Als Nächstes: Unterlagen im Vorgang hochladen."
    );
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
  aenderungenAngenommen() {
    portalToastSuccess(
      "Änderungen angenommen",
      "Danke — wir setzen die Anpassungen am Auftrag um."
    );
  },
};

/** Auftraggeber-Portal (Hausverwaltung) */
export const orgPortalToast = {
  meldungErfasst() {
    portalToastSuccess(
      "Meldung erfasst",
      "Die Meldung erscheint unter Eingang. Als Nächstes: Angebot einfordern oder ablehnen."
    );
  },
  einladungErstellt() {
    portalToastSuccess(
      "Einladung erstellt",
      "Sende den Link an den Mieter, damit er Details und Fotos ergänzen kann."
    );
  },
  angebotEingefordert() {
    portalToastSuccess(
      "Angebot angefordert",
      "Bärenwald erstellt ein Angebot. Du wirst informiert, sobald es zur Freigabe bereit ist."
    );
  },
  meldungAbgelehnt() {
    portalToastSuccess(
      "Meldung abgelehnt",
      "Der Mieter kann bei Bedarf eine neue Meldung einreichen."
    );
  },
  kleinreparaturFreigegeben() {
    portalToastSuccess(
      "Kleinreparatur freigegeben",
      "Bärenwald beauftragt die Reparatur ohne formales Angebot."
    );
  },
  freigegeben() {
    portalToastSuccess(
      "Angebot freigegeben",
      "Bärenwald startet die Beauftragung der Handwerker."
    );
  },
  freigabeAbgelehnt() {
    portalToastSuccess(
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
    portalToastSuccess("Einstellungen gespeichert", "Deine Freigabe-Regeln sind aktiv.");
  },
  objektAngelegt() {
    portalToastSuccess(
      "Objekt angelegt",
      "Das Gebäude erscheint in der Mieter-Auswahl im Meldeformular."
    );
  },
  linkKopiert() {
    portalToastSuccess("Link kopiert", "Der Melde-Link liegt in der Zwischenablage.");
  },
  aushangPdfErstellt() {
    portalToastSuccess(
      "Aushang-PDF erstellt",
      "Die PDF wurde heruntergeladen — zum Ausdrucken im Treppenhaus."
    );
  },
  objektAktualisiert() {
    portalToastSuccess("Objekt gespeichert", "Die Objektdaten wurden aktualisiert.");
  },
  projektAnfrageGesendet() {
    portalToastSuccess(
      "Projekt-Anfrage gesendet",
      "Bärenwald prüft dein Vorhaben und meldet sich mit einem Angebot."
    );
  },
  servicepaketAnfrageGesendet() {
    portalToastSuccess(
      "Servicepaket-Anfrage gesendet",
      "Bärenwald meldet sich mit den nächsten Schritten zur Betreuung."
    );
  },
};
