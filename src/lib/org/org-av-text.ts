import { ORG_AV_VERSION_CURRENT } from "@/lib/org/org-mieter-kontakt";

/** Volltext des Org-AVV zum Archivieren bei digitaler Akzeptanz (Entwurf — Anwalt prüft). */
const ORG_AV_TEXT_BY_VERSION: Record<string, string> = {
  "2026-07": `Auftragsverarbeitungsvertrag (AVV) gemäß Art. 28 DSGVO
Version 2026-07 — Entwurf

1. Parteien
Verantwortlicher (Auftraggeber): jeweilige Hausverwaltung (Kundin)
Auftragsverarbeiter: Bärenwald München, Beran Cakmak, Bärenwaldstraße 20, 81737 München

2. Gegenstand und Dauer
Verarbeitung personenbezogener Daten im Rahmen des Auftraggeber-Portals und der Mieter-Schadenmeldungen über /melden.
Dauer: Laufzeit des Hauptvertrags plus Abwicklungspflichten nach Vertragsende.

3. Art und Zweck
- Melde-Erfassung über öffentliches Formular
- Portal (Eingang, Freigabe, Objektverwaltung)
- Koordination mit internen Prozessen und Handwerksbetrieben
- E-Mail-Benachrichtigungen an Hausverwaltung
- Dokumentation (Fotos, Vorgangshistorie, Freigabe-Log)

4. Betroffene Personen
Mieter/Melder, Ansprechpartner der Hausverwaltung, ggf. Eigentümer (Objektbezug).

5. Datenarten
Name, E-Mail, Telefon, Wohnung/Einheit, Schadensbeschreibung, Kategorie, Fotos, Objektadresse, technische Protokolldaten (IP, Zeitstempel), Portal-Login der HV-Mitarbeiter.

6. Weisungsrecht
Die Hausverwaltung erteilt Weisungen schriftlich oder über das Portal. Bärenwald verarbeitet nur im Rahmen dieser Weisungen und des Vertrags.

7. Pflichten Auftragsverarbeiter
Verarbeitung nur auf dokumentierte Weisung; Vertraulichkeit; technische und organisatorische Maßnahmen (TOM); Unterstützung bei Betroffenenrechten; Meldung von Datenschutzvorfällen unverzüglich; Löschung/Rückgabe nach Vertragsende.

8. Pflichten Verantwortlicher
Rechtsgrundlage für Datenübermittlung; Information der Mieter (Art. 13/14); erste Ansprechstelle für Betroffenenanfragen (empfohlen); rechtmäßige Weisungen.

9. Subprozessoren
Siehe Subprozessoren-Register (Supabase, Vercel, Resend u. a.). Änderungen werden mit Widerspruchsfrist mitgeteilt.

10. Handwerker
Handwerksbetriebe werden als eigene Verantwortliche oder Empfänger im Rahmen der Auftragsausführung behandelt; Einordnung gemäß Hauptvertrag.

Mit der Checkbox-Akzeptanz im Org-Portal bestätigt die Hausverwaltung diesen AVV in der genannten Version.`,
};

export function getOrgAvTextForVersion(version: string = ORG_AV_VERSION_CURRENT): string {
  return ORG_AV_TEXT_BY_VERSION[version] ?? ORG_AV_TEXT_BY_VERSION[ORG_AV_VERSION_CURRENT]!;
}
