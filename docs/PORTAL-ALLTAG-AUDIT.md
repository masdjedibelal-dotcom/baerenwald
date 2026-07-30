# Portal Alltag-Audit — Bärenwald

**Zweck:** Bewertung aus Sicht der Person, die den Fall *jetzt* erledigen muss (Kunde, HV, Partner, Mieter).  
**Nicht:** Feature-Katalog. **Sondern:** Situation → geht das? → versteht man das? → passt Copy/UX/UI (Timing, Hierarchie)?

**Umsetzung (Bauanleitung Außen→Innen):** [`docs/PORTAL-UMSETZUNGSPLAN.md`](./PORTAL-UMSETZUNGSPLAN.md) — pro To-do **Markt · Wir heute · Wir wollen · Vergleich** + FE/BE + Abnahme.

**Scope (klar getrennt):**

| Surface | Route(s) | Wer | Einstieg |
|---------|----------|-----|----------|
| **Kundenportal** | `/portal*` | Privat/Gewerbe, HV (`portal_modus=organisation`), Eigentümer | `src/app/portal/page.tsx` → Client nach Modus |
| **Partnerportal** | `/partner*` | Ausführungspartner (DB `handwerker`, Brand „Partner“) | `src/app/partner/page.tsx` → `PartnerClient` |
| **Melde / Status** | `/melden/*` | Gast-Mieter (ohne Konto), WL der HV | `MeldeFormular`, `MeldeStatusClient` |
| **Auth / Einladung** | `/portal/login`, `/partner/login`, Einladung, Passwort | alle | `PortalLoginForm`, `PartnerLoginForm`, … |
| **Admin-View** | `/auth/crm-enter` | Büro-Impersonation | `AdminViewBanner` |

**Nicht vermischen:** CRM Innendienst (`baerenwald-crm-dashboard`) ist Referenz-*Methode*, nicht Inhalt. Melde-WL ist kein eingeloggtes Kundenportal.

**Verwandt:** [`DESIGN_GAP_ANALYSE_PORTALE.md`](./DESIGN_GAP_ANALYSE_PORTALE.md) · [`VORGANG_STATUS_ROLE_MAPPING.md`](./VORGANG_STATUS_ROLE_MAPPING.md) · Canvas `portale-ux-audit.canvas.tsx` (Kurzfassung).

**Legende Fit**

| Fit | Bedeutung |
|-----|-----------|
| **Geht** | Funktion da, Weg findbar, Copy/UX passen grob |
| **Reibung** | Geht mit Umweg / Lernen; Timing oder Labels stören |
| **Blockiert** | Funktion fehlt, tot, oder UI führt aktiv falsch |

**Dimensionen pro Situation**

1. **IST Funktion** — Wie geht es heute (konkreter Weg) oder warum nicht?  
2. **Verständlichkeit UX/UI** — Würde ein neuer Nutzer den richtigen nächsten Klick finden? Desktop vs. Mobile.  
3. **Gesamt Copy + UX + UI** — Steht das Richtige im richtigen Moment? Primary vs. Banner? Noise?  
4. **SOLL / Lösung** — Konkret, umsetzbar + Todo-IDs.

---

## Kurzfazit

Happy Paths (Melden → HV-Freigabe → Partner ausführen → Abnahme; Kunde Angebot annehmen) sind *technisch* oft da. Die Reibung kommt aus **drei Schichten**:

1. **Falsche IA / falsche Rolle im Moment** — eingeladene Mieter sehen Privat-Nav („Meine Vorgänge“); Privat-Empty klingt nach Verwaltung („Melde-Link Ihrer Verwaltung“); Freigabe ≠ Annehmen braucht Schulung; Partner-Eyebrow „Handwerker“ neben Brand „Partner“.
2. **Tote / halb verdrahtete Jobs** — `PartnerTermineRueckfrageSection` und `PortalMobileBottomSheet` ohne Import; Planer nur per URL; OAuth-Copy ohne Buttons; Einladungen E4 mit Migration-STOP; Kunden-„Angebot ablehnen“ fehlt; Überweisung explizit „nicht angebunden“.
3. **Mobile = Desktop-Shell geschrumpft** — Bottom-Nav + Sticky Detail-Actions + Fullscreen-Replace der Liste; Sheet-Kit tot; Breakpoint-Shell bei **1024** (`lg:`), Melde/Funnel teils **860/1023**; keine echte Inbox-first App-IA.

→ Kapitel **Phasen/Detail**, **Mobile First**, Situationen 1–28, Master-Todos, Befund-Matrix `PF-*`.

---

## Situations-Index

| # | Cluster | Situation | Portal | Fit |
|---|---------|-----------|--------|-----|
| 1 | Einstieg | Erster Login Kundenportal | Kunde/HV | Reibung |
| 2 | Einstieg | Partner registrieren / Login | Partner | Geht |
| 3 | Einstieg | CRM-Admin sieht Portal | Admin | Reibung |
| 4 | Inbox | Was muss ich heute tun? (Kunde) | Kunde | Reibung |
| 5 | Inbox | Was muss ich heute tun? (HV) | HV | Reibung |
| 6 | Inbox | Was muss ich heute tun? (Partner) | Partner | Geht |
| 7 | Angebot | Angebot ansehen / annehmen | Kunde/HV | Geht |
| 8 | Angebot | Angebot ablehnen (Kunde) | Kunde | Blockiert |
| 9 | Angebot | HV Freigabe vs. Annehmen | HV | Reibung |
| 10 | Anfrage | Partner Anfrage annehmen + kalkulieren | Partner | Geht |
| 11 | Anfrage | Partner ablehnen mit Grund | Partner | Geht |
| 12 | Docs | Dokumente/Rechnung einsehen | Kunde/HV | Reibung |
| 13 | Docs | Partner Rechnung einreichen | Partner | Geht |
| 14 | Vor Ort | Fotos / Leistungsdoku | Partner | Geht |
| 15 | Vor Ort | Bautagebuch | Partner | Geht |
| 16 | Vor Ort | Abnahme + Signatur | Partner | Reibung |
| 17 | Vor Ort | Termin vorschlagen / Rückfrage | Partner | Blockiert |
| 18 | Status | Mieter: Meldung → Status-Token | Melde | Geht |
| 19 | Status | Nächster Schritt im Detail verstehen | alle | Reibung |
| 20 | Kommunikation | Nachricht an Büro / Chat | Quer | Blockiert |
| 21 | Korrektur | Auftragsänderungen annehmen | Kunde | Geht |
| 22 | Korrektur | Partner Nachreichung bestätigen | Partner | Geht |
| 23 | Mobile | Unterwegs kurz handeln | Quer | Reibung |
| 24 | Mobile | Detail zurück / Sheet | Quer | Blockiert |
| 25 | Wiederfinden | Alter Vorgang / Deep-Link Mail | Quer | Reibung |
| 26 | Melde | Fehlerseite / Stockung | Melde | Blockiert |
| 27 | Mieter | Portal nach Einladung | Mieter | Reibung |
| 28 | Naming | Partner vs. Handwerker / Sie vs. Du | Quer | Reibung |

---

## 1 · Erster Login Kundenportal

**Szene:** Montagabend. Einladung oder Funnel-Bestätigung — du willst wissen, ob dein Fall da ist.

### IST Funktion
- **Geht:** `/portal/login` → Passwort (`PortalLoginForm`); Kommentar im Code: kein Magic-Link-Login.
- Nach Auth: `portal/page.tsx` → `linkPortalKundeToAuthUser` → Client nach `portal_modus` (`PortalClient` / `OrganisationPortalClient` / `EigentuemerPortalClient`).
- Confirm-Gate: unbestätigte Mail → Redirect `?hint=confirm`.

### Verständlichkeit UX/UI
- **Desktop:** Auth-Frame klar („Willkommen zurück“, „Anmelden“).
- **Mobile:** Auth fullscreen ok; danach Shell mit Bottom-Nav — Orientierung ok, Inhalt oft leer/fremd.

### Gesamt Copy + UX + UI
- Login: **„Melden Sie sich bei Ihrem Portal von {brand} an.“** (`auth.ts`) — Sie-Form.
- Registrierung teils **Du** („Nutze dieselbe E-Mail…“) — Anredebruch.
- `AUTH_LOGIN` enthält Google/Microsoft-Strings **ohne Buttons** in `PortalLoginForm` → tote Erwartung.

### SOLL / Lösung
- Eine Anrede-Policy Auth; OAuth-Strings entfernen oder implementieren.
- **Todos:** `P1-06`, `P1-07`

---

## 2 · Partner registrieren / Login

**Szene:** Betrieb ist im CRM angelegt; Meister soll Portal nutzen.

### IST Funktion
- **Geht:** `/partner/registrieren` (E-Mail → Bedingungen/Rahmenvertrag → Konto) → Confirm-Mail → `/partner/login` → `linkPortalHandwerkerToAuthUser`.
- Blocked-Screen wenn Betrieb nicht gefunden (`partner/page.tsx`).

### Verständlichkeit UX/UI
- **Desktop/Mobile:** 3-Schritt-Registrierung nachvollziehbar; Copy „nur mit hinterlegter E-Mail“ ehrlich.

### Gesamt Copy + UX + UI
- Shell/Brand: „Bärenwald Partner“; Listen-Eyebrow später „Handwerker“ — Naming-Drift.
- Login-Frame teilt Kunden-Auth-Copy (Sie) mit Partner-Du-Inhalten.

### SOLL / Lösung
- Extern immer „Partner“; intern `handwerker` ok. Anrede Partner = Du durchziehen.
- **Todos:** `P2-07`, `P1-06`

---

## 3 · CRM-Admin sieht Portal (Impersonation)

**Szene:** Support prüft „was sieht der Kunde?“.

### IST Funktion
- **Geht:** `/auth/crm-enter?t=…&next=/portal|/partner` → Session + `AdminViewBanner` („Admin-Ansicht: Du siehst das Portal als …“ / „Beenden“).
- Fehler: Redirect `?hint=crm_enter_invalid|failed` — **Login-UI zeigt Hints nicht** (`PortalLoginForm` ohne Mapping).

### Verständlichkeit UX/UI
- Banner sichtbar; bei Token-Fehler Blindflug.

### Gesamt Copy + UX + UI
- Banner **Du**, Portal-Auth oft **Sie**.

### SOLL / Lösung
- Hints in Login; Anrede Admin-Banner anpassen.
- **Todos:** `P1-04`, `P1-06`

---

## 4 · Morgens: Was muss ich heute tun? (Kunde privat/gewerbe)

**Szene:** Portal auf — du willst Handlungsbedarf, keine leere KPI-Wand.

### IST Funktion
- Dashboard `?section=uebersicht`: KPIs „Offen“ / „In Arbeit“ / „Erledigt“, „Zuletzt“, „Alle ansehen“ (`PortalKundePrivatDashboard`, `kunde-dashboard.ts`).
- Keine echte **Inbox** (fällige Annahme, Termin, Zahlung).
- Glocke: `PortalUserNotificationBell` — oft leer ohne Event-Pipeline.

### Verständlichkeit UX/UI
- **Desktop:** KPI-Klick → Filter hilft halb.
- **Mobile:** Dashboard-Tab schwach handlungsfähig; Create-FAB nur wenn `createAction` (Privat: „Schaden melden“).

### Gesamt Copy + UX + UI
- Leerzustand kann **Mieter-Copy** ziehen (`PortalClient` setzt `role="mieter"` bei `isPrivatLike`): *„Für Ihre Wohnung liegt aktuell keine Meldung vor… Melde-Link Ihrer Verwaltung.“* — falsch für Direct-Kunde.

### SOLL / Lösung
- Erste Viewport = 3–5 To-dos (Annehmen, Termin, Dokument). Empty rollenspezifisch.
- **Todos:** `P1-01`, `P2-06`, `P2-10`

---

## 5 · Morgens: Was muss ich heute tun? (HV)

**Szene:** Sachbearbeitung startet — Freigaben und Eingang.

### IST Funktion
- **Geht halb:** KPI „Wartet auf Freigabe“, „In Arbeit“, „Erledigt“ (`hv-dashboard.ts`); Liste mit Chips + Sektionen „Meldungen · Eingang“, „Angebots-Freigabe“ (`hv-liste.ts`).
- Banner: *„Bärenwald hat Angebote erstellt — bitte prüfen und freigeben (Freigabe ≠ Angebot annehmen).“*
- Deep-Link Mail oft `?section=freigabe&id=` → Alias auf `vorgaenge` (`OrganisationPortalClient`).

### Verständlichkeit UX/UI
- **Desktop:** Eingang/Freigabe findbar nach Einarbeitung.
- **Mobile:** Bottom = Dashboard · Vorgänge · Objekte · Mehr; Service unter „Mehr“ als **„Serviceabos“** vs. Sidebar **„Servicepakete“**.

### Gesamt Copy + UX + UI
- Freigabe≠Annehmen wird erklärt — gut — bleibt Lernaufwand.
- Deep-Link-Semantik uneinheitlich vs. Notify-Links `section=vorgaenge`.

### SOLL / Lösung
- Einheitlicher Deep-Link; Label Servicepakete überall; optional Coach-Mark Freigabe.
- **Todos:** `P1-02`, `P1-03`, `P3-06`

---

## 6 · Morgens: Was muss ich heute tun? (Partner)

**Szene:** Meister vor Tour — offene Anfragen.

### IST Funktion
- **Geht:** Start-Dashboard + Badge auf „Aufträge“; Filter „Offen“ / „Auftrag“ / „Erledigt“; Status „Aktion nötig“, „Geändert“ (`vorgang-state.ts`).
- Notifications Partner mit Subjects wie „Neuer Auftrag wartet…“.

### Verständlichkeit UX/UI
- Filter „Offen“ = richtige Inbox-Heuristik.
- Planer (`?section=planer`) existiert, **nicht in Nav** — Onboarding erwähnt ihn trotzdem.

### Gesamt Copy + UX + UI
- Empty: *„Sobald Ihnen ein Auftrag zugewiesen wird…“* (Sie) vs. Du-Toasts.

### SOLL / Lösung
- Planer-Kachel; Anrede Du; Glocke-Links auf `vorgaenge`.
- **Todos:** `P2-02`, `P2-08`, `P1-06`

---

## 7 · Angebot ansehen / annehmen (Kunde/HV)

**Szene:** Angebot liegt vor — verbindlich zusagen.

### IST Funktion
- **Geht:** Detail fast immer `OrganisationHvVorgangDetail` (`showHvAbnahme` / Privat-Pfad); `acceptKundeAngebot` → CRM Auftrag/Timeline.
- Legacy-Pfad in `PortalVorgangDetail` wenn `showHvAbnahme=false` — Doppelpflege.

### Verständlichkeit UX/UI
- Primary „Angebot annehmen“ / „Verbindlich annehmen“ erkennbar.
- **Mobile:** Sticky Actions + Bottom-Nav = Doppel-Chrome-Risiko.

### Gesamt Copy + UX + UI
- Bei HV zusätzlich Freigabe-CTAs — Timing ok, wenn Banner gelesen.

### SOLL / Lösung
- Ein Detail-Pfad; Sticky + BottomNav-Regel (Detail: eine Leiste).
- **Todos:** `P4-03`, `P2-04`

---

## 8 · Angebot ablehnen (Kunde)

**Szene:** Preis/Leistung passt nicht — Absage mit Grund.

### IST Funktion
- **Blockiert:** Kein `rejectKundeAngebot`; nur Annahme setzt andere Angebote abgelehnt.
- HV kann **Meldung** ablehnen (`/api/org/meldung-aktion`), das ist nicht Kunden-Angebots-Absage.

### Verständlichkeit UX/UI
- User sucht „Ablehnen“ neben Annehmen — findet nichts oder HV-Ablehnen (andere Semantik).

### Gesamt Copy + UX + UI
- Fehlender Abbruch = Stockung → Telefon ans Büro.

### SOLL / Lösung
- Server Action + UI + CRM-Status/Grund.
- **Todo:** `P2-05`

---

## 9 · HV: Freigabe vs. Angebot annehmen

**Szene:** Neu-MA klickt das Große Grüne.

### IST Funktion
- **Geht:** Getrennte Aktionen; Copy in `HV_DETAIL_COPY` / Banner erklärt Unterschied.

### Verständlichkeit UX/UI
- Ohne Banner-Lektüre Verwechslungsrisiko hoch.

### Gesamt Copy + UX + UI
- Klassisch „zwei ähnliche CTAs im selben Moment“.

### SOLL / Lösung
- Visuell härter trennen + einmaliger Coach; Primary = kontextabhängig nur eine.
- **Todo:** `P3-06`

---

## 10 · Partner: Anfrage annehmen + kalkulieren

**Szene:** Neue Zuweisung — annehmen und Preis einreichen.

### IST Funktion
- **Geht:** `PartnerOffenDetail` → „Annehmen“ → `PartnerHwKalkulationScreen` (Kalkulieren / PDF-Upload).
- CRM/HV sehen empfohlenes Angebot (Toasts + interne Mails).

### Verständlichkeit UX/UI
- Info-Box erklärt nächsten Schritt nach Annahme — gut.
- `VorgangDetailBlocks` in Offen/Anfrage; in `PartnerAuftragDetail` (Durchführung) eher Einsatz-Card — Paritätslücke.

### Gesamt Copy + UX + UI
- Section „Leistungen & Vergütung“, „Vergütung Brutto inkl. MwSt.“.

### SOLL / Lösung
- Behalten; Detail-Blöcke in Durchführung angleichen; Kalk-Layout laut Design-Gap polishen.
- **Todos:** `P2-09`, `P3-07`

---

## 11 · Partner: Ablehnen mit Grund

**Szene:** Keine Kapazität.

### IST Funktion
- **Geht:** Ablehnen → Grund (`handwerker-ablehnung.ts`) → `declinePartnerAnfrage` / Zuweisung-Decline → interne Mail „Bärenwald wird informiert.“

### Verständlichkeit UX/UI
- Dialoge klar („Ablehnen?“, „Zuweisung ablehnen?“).

### Gesamt Copy + UX + UI
- Kein sichtbarer Thread „Büro hat geantwortet“ im Portal → Stockung nach Ablehnung nur Mail-seitig.

### SOLL / Lösung
- Behalten; optional Status/Antwort im Portal (Welle Kommunikation).
- **Todo:** `P4-01` (langfristig)

---

## 12 · Dokumente / Rechnung einsehen (Kunde/HV)

**Szene:** Rechnung prüfen, ggf. zahlen.

### IST Funktion
- **Geht:** `DokumenteTabelle` / Anhänge im Detail.
- **Blockiert Zahlung:** Copy *„Überweisung veranlassen ist im Portal noch nicht angebunden. Rechnungsstatus siehe unten.“* (`hv-detail.ts` `ueberweisungOffen`).

### Verständlichkeit UX/UI
- Download ok; nächster finanzieller Schritt tot.

### Gesamt Copy + UX + UI
- Ehrlich, aber Dead-End ohne IBAN-Anleitung.

### SOLL / Lösung
- Entweder klarer Offline-Zahlweg (IBAN + Verwendungszweck) oder Payment-Link.
- **Todo:** `P3-02`

---

## 13 · Partner: Rechnung einreichen

**Szene:** Nach Abnahme Rechnung an Büro.

### IST Funktion
- **Geht:** „Rechnung prüfen & einreichen“ mit Blocker bis Abschluss/Signatur; `submitPartnerRechnung` → interne Mail.

### Verständlichkeit UX/UI
- Sequenz Abschluss → Rechnung ist nachvollziehbar.

### Gesamt Copy + UX + UI
- Blocker-Text mischt Sie („Danach können Sie…“) mit Du-Portal.

### SOLL / Lösung
- Anrede angleichen; Flow behalten.
- **Todo:** `P1-06`

---

## 14 · Vor Ort: Fotos / Leistungsdokumentation

**Szene:** Auf der Baustelle Leistung dokumentieren.

### IST Funktion
- **Geht:** Positions-Lebenszyklus, Bottom Sheet, `PartnerDirektKameraSlot`, Toasts („Leistung dokumentiert…“).

### Verständlichkeit UX/UI
- **Mobile:** Stark (Kamera, Sheet) — bestes App-Feeling im Partner-Portal.
- **Desktop:** Sidebar Einsatz-Card.

### Gesamt Copy + UX + UI
- Primary-Pfad stimmig.

### SOLL / Lösung
- Behalten; Safe-Area vs. Sticky prüfen.
- **Todo:** `P4-04` (Polish)

---

## 15 · Bautagebuch

**Szene:** Zusatznotiz für Verwaltung / Mieter.

### IST Funktion
- **Geht:** CRUD + Fotos; Banner „Bitte Tagebucheintrag erstellen.“; Notify HV/Mieter/intern.

### Verständlichkeit UX/UI
- Findbar im Auftragsdetail.

### Gesamt Copy + UX + UI
- „Zusatznotiz für die Verwaltung“ — klar.

### SOLL / Lösung
- Behalten.

---

## 16 · Abnahme + Signatur

**Szene:** Kunde/HV unterschreibt vor Ort.

### IST Funktion
- **Geht:** `PartnerAbschlussModal` / Abnahme-Flow; Mobile-Hint Querformat.

### Verständlichkeit UX/UI
- **Mobile:** Signaturfeld eng; Bottom-Nav + Sticky können kollidieren.

### Gesamt Copy + UX + UI
- Hint hilft, Pattern noch Desktop-Modal auf Phone.

### SOLL / Lösung
- Fullscreen-Signatur; BottomNav im Abschluss ausblenden.
- **Todo:** `P4-04`

---

## 17 · Termin vorschlagen / Rückfrage an Büro (Partner)

**Szene:** Meister will 3 Slots an Mieter / Frage an Büro.

### IST Funktion
- **Blockiert (UI tot):** `PartnerTermineRueckfrageSection.tsx` existiert; Server-Actions/Slots existieren; **kein Import** in Detail-Komponenten.
- Mieter-Bestätigung auf Status-Seite **geht**, wenn Slots woanders gesetzt wurden (CRM/andere Wege).

### Verständlichkeit UX/UI
- User findet keine UI → Telefon.

### Gesamt Copy + UX + UI
- Onboarding/Planer suggerieren Termin-Fähigkeit ohne sichtbaren Einstieg.

### SOLL / Lösung
- Section in `PartnerAuftragDetail` verdrahten; ggf. Planer-Nav.
- **Todos:** `P2-01`, `P2-02`

---

## 18 · Mieter: Meldung → Status-Token

**Szene:** QR am Aushang → Schaden → später Termin.

### IST Funktion
- **Geht:** `/melden/[org]` → Formular → Bestätigung → `/melden/status/[token]` (STG-Timeline, Termine, Feedback).
- `MIETER_EMAIL_ENABLED = false` — **keine** Status-Mails (`mieter-mail-policy.ts`); Bestätigung sagt das.

### Verständlichkeit UX/UI
- WL-Frame stark; Buttons groß — gutes Mobile-App-Feeling für diesen Flow.
- Token-Verlust = Stockung.

### Gesamt Copy + UX + UI
- Aushang kann „Sofort eine Bestätigung“ suggerieren vs. „keine Bestätigungs-E-Mail“ — Widerspruch.
- Fehlerseite: CTA „Zur Objektauswahl“ kann nach `/` führen (`MeldeFehlerClient`).

### SOLL / Lösung
- Aushang-Copy angleichen; Fehler-Link reparieren; PO-Entscheid Mail Opt-in.
- **Todos:** `P1-05`, `P1-09`, `P3-03`

---

## 19 · Nächster Schritt im Detail verstehen

**Szene:** Detail offen — was jetzt?

### IST Funktion
- Phasen-Strip / Flow-Chips teilweise (`PortalAuftragPhasenStrip`, `PortalFlowStatusChip`); Partner hat `HW_AUFTRAG_TIMELINE` Copy **ohne** Timeline-UI im Detail.
- Mehrere Statussysteme (Resolver, FLOW-Mock, Partner-Labels, Mieter-STG) — Mapping in Docs, UI inkonsistent.

### Verständlichkeit UX/UI
- Ohne Strip/Primary-Matrix: Scrollen + Raten.

### Gesamt Copy + UX + UI
- Banner + Sticky + Section-CTAs = mehrere Stimmen.

### SOLL / Lösung
- Statusabhängige Primary + dauerhafter Phasen-Hinweis pro Rolle (role-status).
- **Todos:** `P3-04`, `P3-08`, `P5-05`

---

## 20 · Nachricht / Kommunikation im Portal

**Szene:** Kurze Frage an Büro ohne Telefon.

### IST Funktion
- **Blockiert:** Kein Vorgangs-Thread. Nur E-Mails, Toasts, optional GPT (`PortalBaerenwaldGpt` → `/portal-tools/rechner`).
- Partner-Rückfrage-UI tot (siehe 17).

### Verständlichkeit UX/UI
- GPT wird als Ersatz missverstanden — ist kein Case-Chat.

### Gesamt Copy + UX + UI
- Markt (Kundenportale / Field-Service) erwartet Messaging oder klare „Büro kontaktieren“-Aktion.

### SOLL / Lösung
- Leichter Thread oder zumindest „Rückfrage“-Job verdrahten; GPT nicht als Comms verkaufen.
- **Todos:** `P2-01`, `P4-01`, `P5-02`

---

## 21 · Auftragsänderungen annehmen (Kunde)

**Szene:** Nachtrag/Preisanpassung.

### IST Funktion
- **Geht:** `acceptKundeAuftragAenderungen` + UI „Änderungen annehmen“ in `PortalVorgangDetail`.

### Verständlichkeit UX/UI
- Wenn angeboten, klar.

### SOLL / Lösung
- Behalten.

---

## 22 · Partner: Nachreichung bestätigen

**Szene:** Bärenwald hat Leistungen geändert.

### IST Funktion
- **Geht:** `PartnerOffenDetail` State `geaendert` → „Änderungen bestätigen“ / Info-Texte zu entfernt/geändert.

### Verständlichkeit UX/UI
- Info-Boxen gut.

### SOLL / Lösung
- Behalten.

---

## 23 · Mobile unterwegs kurz handeln

**Szene:** 2 Minuten auf dem Handy.

### IST Funktion
- Shell: Bottom-Nav `lg:hidden` (Tailwind **1024px**); FAB Create bei HV/Privat; Detail ersetzt Liste (`_mobileDetailOpen` gesetzt, Sheet ungenutzt).
- Partner-Doku mobil stark; GPT Overlay nur `lg:hidden` Entry, Desktop embedded.

### Verständlichkeit UX/UI
- Zu viele gleichwertige Tabs ohne Inbox-First.
- HV „Mehr“ bündelt Rest — ok, Labels inkonsistent.

### Gesamt Copy + UX + UI
- Desktop-on-Mobile: gleiche Cards/Tabellen-Dichte.

### SOLL / Lösung
- Mobile-Job-Spec; Inbox-Tab; Detail eine Action-Leiste; Sheet-Kit.
- **Todos:** `P2-04`, `P2-10`, `P8-01`, `P8-05`

---

## 24 · Mobile Detail zurück / Sheet

**Szene:** Liste → Detail → zurück ohne Kontextverlust.

### IST Funktion
- **Blockiert Muster:** `PortalMobileBottomSheet` **tot** (keine Imports außer eigener Datei).
- Clients nutzen Fullscreen-Replace; State `_mobileDetailOpen` ohne Sheet-Binding.

### Verständlichkeit UX/UI
- „‹ Zurück“ existiert in Partner; Kundenpfad wirkt wie Navigationsbruch.

### SOLL / Lösung
- Sheet verdrahten **oder** Dead Code löschen + Back-Stack spezifizieren.
- **Todo:** `P2-04`

---

## 25 · Alter Vorgang / Deep-Link aus Mail

**Szene:** Mail vom System — Fall wiederfinden.

### IST Funktion
- **Geht mit Reibung:** Links `/portal?section=vorgaenge&id=` oder `section=freigabe&id=` (Alias).
- Partner: `resolve-partner-portal-link.ts` (Offen vs. Auftrag); Legacy `section=auftraege` Redirect.
- Suche: Header-Search vorhanden; Tiefe unklar für alte RE/Docs.

### Verständlichkeit UX/UI
- Wenn Alias greift ok; Analytics/Doku verwirren.

### SOLL / Lösung
- Kanonische Deep-Links; Suche über Titel/Ref/Status.
- **Todos:** `P1-03`, `P2-08`, `P6-08`

---

## 26 · Melde-Fehler / Stockung

**Szene:** Upload/Netz fehlgeschlagen.

### IST Funktion
- `/melden/fehler` → `MeldeFehlerClient`; ohne `objektAuswahlHref` Fallback **`/`** (Marketing-Home) — falsch.

### Verständlichkeit UX/UI
- CTA „Zur Objektauswahl“ lügt.

### SOLL / Lösung
- Fallback `/melden/{org}`.
- **Todo:** `P1-05`

---

## 27 · Mieter: Portal nach Einladung

**Szene:** HV lädt Mieter ein — Konto statt Token.

### IST Funktion
- Route `/portal/einladung/[token]`; API `portal-einladungen`; Server kann Migration-STOP melden.
- Nach Login: typisch **`PortalClient` privat**, nicht Spec-Nav `mieter` („Start · Meine Meldungen · Konto“ in `nav-items.ts` ungenutzt).
- `PortalEinstellungenMieter` unverdrahtet.
- Product-Doc `DESIGN_GAP`: MeinBärenwald für HV-Mieter **streichen** — Spannung Live vs. Spec.

### Verständlichkeit UX/UI
- User denkt „Privatkunden-Portal“.

### SOLL / Lösung
- PO-Entscheid: Token-only **oder** Mieter-IA verdrahten; E4 Migration freischalten wenn gewollt.
- **Todos:** `P3-01`, `P2-03`, `P8-05`

---

## 28 · Naming & Anrede (Quer)

**Szene:** Jede Surface.

### IST Funktion
- Partner-Brand vs. Handwerker-Eyebrow; Sie/Du gemischt; Servicepakete/Serviceabos; Mail-Copy „Anfragen“ vs. UI „Vorgänge“.

### SOLL / Lösung
- Copy-SoT + Flow-Katalog.
- **Todos:** `P1-02`, `P1-06`, `P2-07`, `P8-03`

---

## Querbefund: „Falsches Ding im falschen Moment“

| Moment | Falsches Signal | Richtiges Signal |
|--------|-----------------|------------------|
| Privat Empty | Mieter/Verwaltung-Text | „Erste Anfrage anlegen“ |
| HV Detail | Freigabe und Annehmen ähnlich prominent | Nur eine Primary je State |
| Partner Start | „Handwerker“-Eyebrow | „Partner“ |
| Partner Baustelle | Kein Termin-UI, aber Onboarding „Planer“ | Termin-CTA im Auftrag |
| Rechnung Kunde | Status ohne Zahlweg | IBAN-Schritte oder Payment |
| Melde Erfolg | Aushang „Bestätigung“ | Status-Link speichern |
| GPT | Wirkt wie Support-Chat | Rechner/KI, nicht Case-Comms |
| Mobile Detail | BottomNav + Sticky | Eine Action-Leiste |

---

## Phasen / Detail-Orientierung, Historie, Wizards, Copy

### Gesamtbefund
Orientierung ist **rollenweise fragmentiert**: HV hat reichste Detail-UI; Partner stark in Ausführung, schwach in Termin/Timeline; Kunde/Mieter oft Status ohne klare Primary-Matrix. Status-SoT ist dokumentiert (`status-mapping.ts`, `VORGANG_STATUS_ROLE_MAPPING.md`), UI konsumiert noch Legacy-Labels parallel.

### Detail-Kopf / Phasen
| Rolle | IST | Lücke |
|-------|-----|-------|
| HV/Kunde | Flow-Status, Timeline teils, Sticky Actions | Default-Tab/Primary-Matrix fehlt als SoT |
| Partner | Status-Pill + Einsatz-Card | `HW_AUFTRAG_TIMELINE` nicht gerendert |
| Mieter Status | STG 4 Stufen | Kein Konto-Historie |

### Historie / Aktivität
- HV: `verlauf` / Feedback-Sections.
- Partner: Bautagebuch = operative Historie; keine einheitliche Aktivitätsliste „Büro schrieb…“.
- Kunde: Dokumente + Status; kein Chat-Log.

### Wizards / Flows
| Flow | Dateien | Fit |
|------|---------|-----|
| Melde-Funnel | `MeldeFormular` → `PortalFunnelHost` | Geht; Wunschtermin-Step laut Design-Gap **fehlt** in UI |
| Privat Create | `PortalCreateFunnelModal` | Geht |
| HV Neu | `OrganisationAnfrageHub` | Geht |
| Partner Kalk | `PartnerHwKalkulationScreen` | Geht; Layout-Polish |
| Partner Registrierung | 3 Steps + Rahmenvertrag | Geht |

### Copy-Konsistenz (Querschnitt)
- Anrede Sie/Du; Partner/Handwerker; Servicepakete/Serviceabos; Freigabe-Jargon; OAuth-Geister; Mail vs. UI-Nav-Namen.
- **Todo-Cluster:** `P1-*` Copy, `P8-03` Flow-Katalog.

---

## Mobile First vs. Desktop-on-Mobile

### Diagnose
Gebaut wurde eine **gemeinsame Shell** (`PortalShell`) mit Sidebar-Desktop und Bottom-Nav ab `<lg` (**1024px**). Inhalte (Listen, Detail-Cards, Tabellen) sind weitgehend dieselben — **Desktop-on-Mobile**, nicht App-First. Positiv: Partner Foto/Doku und Melde-WL sind näher am App-Ideal.

### Breakpoints (Code)
| Ort | Cutoff |
|-----|--------|
| `PortalShell` Bottom-Nav / FAB | `lg:` = **1024** |
| `globals.css` `.portal-ui` Shell | oft **1024 / 1023** |
| Funnel / teils Marketing | **860**, **1023** |
| Folge | Tablet 768–1023 = „Mobile-Chrome + Desktop-Dichte“ — Grauzone |

### Doppel-Chrome
- Bottom-Nav bleibt auf Detail sichtbar + `PortalDetailStickyActions` / Partner Sticky — zwei Fußleisten.
- Sheet-Komponente tot → kein Ersatz-Pattern für ⋯/Filter/Detail.

### Tab-IA Mobile
| Rolle | Tabs | Problem |
|-------|------|---------|
| Privat | Übersicht · Vorgänge · Einstellungen | Kein Inbox-Tab |
| HV | Dashboard · Vorgänge · Objekte · Mehr | Mehr-Labels ≠ Sidebar |
| Partner | Start · Aufträge · Firmendaten | Planer fehlt |
| Spec Mieter | Start · Meine Meldungen · Konto | **Nicht verdrahtet** |

### Markt-Orientierung (kurz)
- Kundenportale (Versicherer/HV): Status + eine Primary + Docs.
- Field-Service-Apps (ToolTime-ähnlich): Inbox → Auftrag → Doku/Fotos → Abnahme; Termin in Auftrag.
- **Wir:** Partner-Doku gut; Termin-UI tot; Kunde ohne Ablehnen/Zahlen; Mobile Shell ohne Sheet-Kit.

### SOLL-Zielbild
| | Desktop-Portal | Mobile-App |
|--|----------------|------------|
| Nav | Sidebar 3–5 | ≤4 Tabs + optional FAB; Inbox first |
| Listen | Tabelle/Cards dicht | Zeilen + Filter-Sheet |
| Detail | Split ok | Fullscreen **eine** Action-Leiste; BottomNav hide |
| Erstellen | Sidebar-Button | FAB / Sheet |
| Menüs | Popover ok | **Sheet** |
| Docs | Viewer | Sheet/Fullscreen |
| Suche | Header | Header oder Tab |

**Todos:** `P8-01`, `P8-02`, `P8-05`, `P2-04`

---

## Master-To-dos (vollständig)

### Übersicht

| ID | Welle | Art | Impact | Aufwand | To-do | Situationen |
|----|-------|-----|--------|---------|-------|-------------|
| P1-01 | 1 | Copy | hoch | S | Privat-Empty ohne Mieter-Text | 4 |
| P1-02 | 1 | Copy | mittel | S | Servicepakete = ein Label | 5, 28 |
| P1-03 | 1 | CRM | hoch | S | Deep-Link `freigabe`→kanonisch `vorgaenge` | 5, 25 |
| P1-04 | 1 | UX | mittel | S | `crm_enter_*` Hints im Login | 3 |
| P1-05 | 1 | Bug | hoch | S | MeldeFehler Fallback-Link | 18, 26 |
| P1-06 | 1 | Copy | mittel | M | Sie/Du-Policy | 1, 2, 3, 13, 28 |
| P1-07 | 1 | TechDebt | niedrig | S | OAuth-Copy entfernen oder bauen | 1 |
| P1-08 | 1 | UX | hoch | S | Partner HV-Auftrag-Banner | 10, 14 |
| P1-09 | 1 | Copy | hoch | S | Aushang vs. keine Mail | 18 |
| P2-01 | 2 | Feature | hoch | M | Termine/Rückfrage UI verdrahten | 17, 20 |
| P2-02 | 2 | UX | mittel | S | Planer in Nav/Start | 6, 17 |
| P2-03 | 2 | UX | hoch | M | Mieter-Nav Spec oder streichen | 27 |
| P2-04 | 2 | Mobile | hoch | M | Sheet-Kit / eine Action-Leiste | 7, 23, 24 |
| P2-05 | 2 | Feature | hoch | M | Angebot ablehnen Kunde | 8 |
| P2-06 | 2 | Feature | hoch | M | Notifications befüllen | 4, 5, 6 |
| P2-07 | 2 | Copy | mittel | M | Naming Partner (UI) | 2, 28 |
| P2-08 | 2 | Bug | mittel | S | Glocke-Links `vorgaenge` | 6, 25 |
| P2-09 | 2 | UX | mittel | M | Detail-Blöcke Partner-Durchführung | 10 |
| P2-10 | 2 | UX | hoch | M | Inbox-first Dashboard (alle Rollen) | 4, 5, 23 |
| P3-01 | 3 | Feature | hoch | L | Einladungen E4 Migration | 27 |
| P3-02 | 3 | Feature | hoch | L | Rechnung Zahlweg | 12 |
| P3-03 | 3 | Feature | hoch | L | Mieter-Mail-Policy | 18 |
| P3-04 | 3 | UX | mittel | M | Partner Timeline im Detail | 19 |
| P3-05 | 3 | UX | mittel | M | Eigentümer Settings (wenn Surface bleibt) | — |
| P3-06 | 3 | UX | mittel | S | Freigabe≠Annehmen Coach | 9 |
| P3-07 | 3 | UX | mittel | M | Kalk-Layout Polish | 10 |
| P3-08 | 3 | UX | hoch | M | Primary/Banner-Matrix je Status | 19 |
| P4-01 | 4 | Feature | hoch | XL | Vorgangs-Nachrichten | 11, 20 |
| P4-03 | 4 | TechDebt | mittel | M | Ein Detail-Pfad Kunde | 7 |
| P4-04 | 4 | Mobile | hoch | M | Abnahme Fullscreen / Chrome | 16, 14 |
| P5-02 | 5 | UX | niedrig | M | GPT Mobile-Strategie | 20, 23 |
| P5-05 | 5 | TechDebt | mittel | L | role-status UI durchziehen | 19 |
| P6-08 | 5 | Feature | mittel | M | Suche Wiederfinden stärken | 25 |
| P8-01 | 1–2 | Fundament | hoch | M | Breakpoint-SoT Portal | 23 |
| P8-02 | 2 | Fundament | hoch | M | Interaktions-Kit Sheet | 24 |
| P8-03 | 2 | Copy | mittel | M | Flow-Katalog + Copy-SoT | 28 |
| P8-05 | 1 | Fundament | hoch | S | Desktop≠Mobile Jobs Spec-Doc | 23, 27 |

### Detail: IST · SOLL · Umsetzung

##### `P1-01` — Privat-Empty
- **IST:** `PortalClient` Empty mit `role="mieter"` → Verwaltung-Copy.
- **SOLL:** Rollen-Copy privat/gewerbe.
- **Umsetzung:** `PortalClient.tsx`, `portal-states.ts`.

##### `P1-02` — Servicepakete-Label
- **IST:** Sidebar „Servicepakete“, Mehr „Serviceabos“ (`nav-items.ts`).
- **SOLL:** Ein Label.
- **Umsetzung:** `PORTAL_HV_MEHR_TILES`, `OrganisationMehrScreen`.

##### `P1-03` — Deep-Links
- **IST:** Mails `section=freigabe`; Alias → vorgaenge; Notify teils `vorgaenge`.
- **SOLL:** Kanonisch `vorgaenge` (+ optional `focus=freigabe`).
- **Umsetzung:** `meldung/route.ts`, `meldung-direkt`, `meldung-aktion`, `meldung-mail-templates.ts`.

##### `P1-04` — crm_enter Hints
- **IST:** Query-Hints ohne UI.
- **SOLL:** Fehlermeldung im Login.
- **Umsetzung:** `PortalLoginForm.tsx`, `auth.ts`.

##### `P1-05` — MeldeFehler-Link
- **IST:** Fallback `/`.
- **SOLL:** `/melden/{org}`.
- **Umsetzung:** `MeldeFehlerClient.tsx`, Fehler-Page Props.

##### `P1-06` — Anrede-Policy
- **IST:** Sie/Du gemischt.
- **SOLL:** Dokumentierte Policy (WL Sie, Partner Du, Admin wie Support).
- **Umsetzung:** `auth.ts`, Partner-Forms, Banner, Toasts, Sticky-Copy.

##### `P1-07` — OAuth-Geister
- **IST:** Strings ohne Buttons.
- **SOLL:** Entfernen oder OAuth.
- **Umsetzung:** `auth.ts`, `PortalLoginForm.tsx`.

##### `P1-08` — HV-Banner Partner
- **IST:** Kein Banner in `PartnerAuftragDetail` bei HV-Meldung.
- **SOLL:** Hinweis „Im Auftrag der Hausverwaltung…“.
- **Umsetzung:** `PartnerAuftragDetail.tsx`.

##### `P1-09` — Aushang-Copy
- **IST:** Bestätigungsversprechen vs. keine Mail.
- **SOLL:** Status-Link/QR betonen.
- **Umsetzung:** `aushang.ts`, `mieter-wl.ts`.

##### `P2-01` — Termine/Rückfrage
- **IST:** Komponente unimportiert.
- **SOLL:** In Auftragsdetail.
- **Umsetzung:** `PartnerAuftragDetail.tsx`, `PartnerTermineRueckfrageSection.tsx`.

##### `P2-02` — Planer Nav
- **IST:** Nur URL.
- **SOLL:** Nav oder Start-Kachel.
- **Umsetzung:** `nav-items.ts`, `PartnerClient.tsx`, Onboarding-Slides.

##### `P2-03` — Mieter-IA
- **IST:** Spec-Nav tot; Privat-Shell.
- **SOLL:** PO: streichen (Gap-Doc) **oder** verdrahten + Settings.
- **Umsetzung:** `nav-items.ts`, `PortalClient.tsx`, `PortalEinstellungenMieter.tsx`, `DESIGN_GAP` abgleichen.

##### `P2-04` — Sheet / Action-Leiste
- **IST:** Sheet tot; Doppel-Chrome.
- **SOLL:** Kit: mobil Sheet; Detail ohne BottomNav oder eine Leiste.
- **Umsetzung:** `PortalMobileBottomSheet.tsx`, `PortalShell.tsx`, `PortalDetailStickyActions`, Clients.

##### `P2-05` — Angebot ablehnen
- **IST:** Fehlt.
- **SOLL:** Action + UI + CRM.
- **Umsetzung:** `portal-angebot.ts`, HV/Kunde Detail.

##### `P2-06` — Notifications
- **IST:** UI oft leer.
- **SOLL:** Events bei Kernaktionen.
- **Umsetzung:** `create-portal-notification.ts`, Partner/HV Notify-Hooks.

##### `P2-07` — Partner Naming
- **IST:** Brand Partner, Eyebrow Handwerker.
- **SOLL:** UI Partner.
- **Umsetzung:** `PartnerClient`, Listen-Chrome, Mails.

##### `P2-08` — Glocke-Links
- **IST:** Legacy `auftraege`.
- **SOLL:** `vorgaenge`.
- **Umsetzung:** Partner notification link builder.

##### `P2-09` — Detail-Blöcke Durchführung
- **IST:** Nur Offen/Anfrage haben `VorgangDetailBlocks`.
- **SOLL:** Auch `PartnerAuftragDetail`.
- **Umsetzung:** `PartnerAuftragDetail.tsx`, `build-vorgang-detail-vm.ts`.

##### `P2-10` — Inbox-first
- **IST:** KPI-Dashboards.
- **SOLL:** 5 To-do-Zeilen first viewport.
- **Umsetzung:** `*-dashboard.ts`, Dashboard-Komponenten.

##### `P3-01` … `P8-05`
- Siehe Übersicht + Umsetzungsplan (ausführliche Markt/FE/BE-Tabellen).

### Empfohlene Reihenfolge
1. Fundament Spec + Breakpoint (`P8-05`, `P8-01`) parallel zu Copy-Quickwins `P1-01…P1-09`
2. Mobile Kit + Termin verdrahten (`P2-04`, `P2-01`, `P2-10`)
3. Ablehnen + Notifications + Naming (`P2-05`, `P2-06`, `P2-07`)
4. Einladungen / Zahlung / Mail-Policy (`P3-*`)
5. Messaging / Detail-Konsolidierung (`P4-*`)

---

## Befund-Matrix (PF-* → Master)

| ID | Finding | Portal | Master |
|----|---------|--------|--------|
| PF-01 | Privat-Empty = Mieter-Copy | Kunde | P1-01 |
| PF-02 | Servicepakete ≠ Serviceabos | HV | P1-02 |
| PF-03 | Deep-Link freigabe vs vorgaenge | HV/CRM | P1-03 |
| PF-04 | crm_enter Hints unsichtbar | Admin | P1-04 |
| PF-05 | MeldeFehler → `/` | Melde | P1-05 |
| PF-06 | Sie/Du-Mischung | Quer | P1-06 |
| PF-07 | OAuth-Copy ohne UI | Auth | P1-07 |
| PF-08 | Kein HV-Banner Partner-Detail | Partner | P1-08 |
| PF-09 | Aushang vs. keine E-Mail | Melde | P1-09 |
| PF-10 | Termine/Rückfrage-UI tot | Partner | P2-01 |
| PF-11 | Planer nicht in Nav | Partner | P2-02 |
| PF-12 | Mieter-Nav Spec ungenutzt | Mieter | P2-03 |
| PF-13 | PortalMobileBottomSheet tot | Mobile | P2-04 |
| PF-14 | `_mobileDetailOpen` ohne Sheet | Mobile | P2-04 |
| PF-15 | Kein Kunden-Angebot-Ablehnen | Kunde | P2-05 |
| PF-16 | Notifications oft leer | Quer | P2-06 |
| PF-17 | Partner vs Handwerker Naming | Partner | P2-07 |
| PF-18 | Glocke Legacy-Links | Partner | P2-08 |
| PF-19 | Detail-Blöcke fehlen Durchführung | Partner | P2-09 |
| PF-20 | Keine Inbox-first Dashboards | Quer | P2-10 |
| PF-21 | Einladungen Migration-STOP | Mieter | P3-01 |
| PF-22 | Überweisung nicht angebunden | Kunde/HV | P3-02 |
| PF-23 | MIETER_EMAIL_ENABLED=false | Melde | P3-03 |
| PF-24 | Keine HW-Timeline UI | Partner | P3-04 |
| PF-25 | Eigentümer ohne Settings | Eigentümer | P3-05 |
| PF-26 | Freigabe/Annehmen Lernkurve | HV | P3-06 |
| PF-27 | Kalk-Layout Design-Gap | Partner | P3-07 |
| PF-28 | Mehrere Status-Label-Systeme in UI | Quer | P3-08 / P5-05 |
| PF-29 | Kein Vorgangs-Chat | Quer | P4-01 |
| PF-30 | Doppelter Annehmen-Detail-Pfad | Kunde | P4-03 |
| PF-31 | Abnahme Mobile Doppel-Chrome | Partner | P4-04 |
| PF-32 | GPT als Comms-Missverständnis | Quer | P5-02 |
| PF-33 | Breakpoint 1024 vs Funnel 860 | Mobile | P8-01 |
| PF-34 | Kein Interaktions-Kit mobil | Mobile | P8-02 |
| PF-35 | Kein Flow-Katalog/Copy-SoT | Quer | P8-03 |
| PF-36 | Keine Desktop≠Mobile Job-Spec | Quer | P8-05 |
| PF-37 | PortalEinstellungenMieter tot | Mieter | P2-03 |
| PF-38 | Onboarding nennt Planer ohne Nav | Partner | P2-02 |
| PF-39 | Sticky + BottomNav gleichzeitig | Mobile | P2-04 |
| PF-40 | Wunschtermin-Step Melde fehlt (Gap-Doc) | Melde | P3-03 / Design-Gap NEU |
| PF-41 | PartnerControllingSection tot | TechDebt | optional löschen |
| PF-42 | DESIGN_GAP Eigentümer No-Go vs. Live-Client | PO | P3-05 / P8-05 |

**Mapping-Hinweis:** Jedes `PF-*` hat Master-ID — kein „—“. Mehrere PF können dieselbe ID teilen.

---

## Hinweise für Claude / weitere Reviews

1. Portale **nicht** mit CRM-Staff vermischen; CRM nur Methoden-Vorlage.
2. Melde-WL und eingeloggtes `/portal` getrennt beschreiben.
3. Bei „fehlt“ immer Dateipfad oder explizit „kein Code gefunden“.
4. Product-Spannungen (`DESIGN_GAP` vs. Live Eigentümer/Mieter-Login) als PO-Entscheid markieren, nicht still „fixen“.
5. Umsetzung nur über [`PORTAL-UMSETZUNGSPLAN.md`](./PORTAL-UMSETZUNGSPLAN.md).

### Zentrale Dateien (Orientierung)

| Bereich | Pfade |
|---------|-------|
| Router | `src/app/portal/page.tsx`, `src/app/partner/page.tsx` |
| Shell | `src/components/shared/PortalShell.tsx`, `globals.css` (portal-shell-*) |
| Nav | `src/lib/portal2/nav-items.ts` |
| Kunde | `PortalClient.tsx`, `PortalVorgangDetail.tsx` |
| HV | `OrganisationPortalClient.tsx`, `OrganisationHvVorgangDetail.tsx` |
| Partner | `PartnerClient.tsx`, `PartnerOffenDetail.tsx`, `PartnerAuftragDetail.tsx`, `VorgangCard.tsx` |
| Melde | `src/app/melden/**`, `MeldeStatusClient.tsx`, `mieter-wl.ts` |
| Auth | `src/lib/portal2/auth.ts`, Login-Forms, `crm-enter/route.ts` |
| Status | `src/lib/portal2/status.ts`, `status-mapping.ts` |
| States | `src/lib/portal2/portal-states.ts` |

---

*Stand: Code-Audit handwerks-plattform · Methode analog CRM-ALLTAG-AUDIT · Keine Feature-Implementierung in diesem Dokument.*
