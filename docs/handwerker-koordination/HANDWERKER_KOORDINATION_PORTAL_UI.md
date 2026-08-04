# Handwerker-Koordination — Partner-Portal UI (Koordinations-Guide)

**Stand:** Juni 2026  
**Zielgruppe:** Bärenwald-Koordination — „Was sieht der Handwerker gerade?“

CRM-UI-Analyse: `baerenwald-crm-dashboard/docs/handwerker-koordination/HANDWERKER_KOORDINATION_UI_ANALYSE.md`

---

## 1. Navigation (3 + 1 Tabs)

```
/partner
├── Übersicht     (Dashboard, Termine)
├── Anfragen      ← Zu-/Absage, Konditionen, Nachreichung
├── Angebote      ← Nach Einigung: PDF, Vertrag, Freigabe
├── Aufträge      ← Laufendes Projekt, Bautagebuch
└── Profil / Planer / GPT
```

**Filter:** Anfragen und Angebote zeigen standardmäßig nur **„Offen“** = Handwerker muss noch handeln. Geschlossene Einträge sind ausgeblendet (nicht eigener Tab).

---

## 2. Anfragen — Karten & Badges

| Badge | Bedeutung für Koordination | Nächster Schritt |
|-------|--------------------------|------------------|
| Antwort ausstehend | CRM hat angefragt, HW hat nicht geantwortet | HW annehmen/ablehnen |
| Angebotspreis festlegen | HW hat zugesagt, Preise fehlen | HW Preise senden |
| Wartet auf Prüfung | `hw_status=eingereicht` | **CRM** Übernehmen/Rückfrage/Ablehnen |
| Konditionen bestätigen | `hw_status=bestaetigt` | HW einmal bestätigen |
| Neue Konditionen | `hw_status=rueckfrage` | HW erneut antworten |
| Neue Leistung | Nachreichung bei `uebernommen` | HW nur neue Zeile prüfen |
| *(Auftrag)* Antwort ausstehend | `id=auftrag:…` | HW Zuweisung am Projekt |

**Listen-Hinweis** (grauer Text unter der Karte):

- `→ Bitte annehmen oder ablehnen`
- `→ Neue Leistung prüfen` (Nachreichung)
- `→ Konditionen bestätigen`

### Detail — normale Konditionen-Runde

1. Projektinfos (Ort, Zeitraum, Leistungsumfang)
2. **Leistungen & Vergütung** — Tabelle mit Vorschlag netto
3. „Preis bearbeiten“ pro Zeile (Popup)
4. Aktionen: **Annehmen** / **Preise senden** / Ablehnen

### Detail — Nachreichung

Zwei Blöcke:

| Block | Inhalt | Bearbeitbar |
|-------|--------|-------------|
| **Bereits angenommen** | Vereinbarte Leistungen aus `hw_konditionen` | Nein (Badge „Angenommen“) |
| **Neue Leistung** | Delta zu CRM/Auftrag | Ja (Badge „Neu“, Preis bearbeiten) |

Meta-Zeile: *„Ergänzung zum Auftrag“*

Gleicher Vorgang bleibt parallel unter **Angebote** sichtbar (nur alte Leistungen).

---

## 3. Angebote — Karten & Badges

Erscheint erst ab `hw_status = uebernommen`.

| Badge | CRM hat … | Handwerker soll … |
|-------|-----------|---------------------|
| Warte auf Auftragsfreigabe | Konditionen OK, Auftrag noch `offen` oder fehlt | Optional PDF hochladen, warten |
| Auftrag freigegeben | `auftraege.status ≠ offen` | Vertrag prüfen, Unterlagen, **Auftrag annehmen** |
| *(Hinweis)* → Neue Leistung unter Anfragen | Nachreichung offen | In **Anfragen** weiter |

**Detail:**

- Leistungstabelle **readonly** (vereinbarte Preise)
- Dokumente: Rahmenvertrag, ggf. HW-PDF
- Bei Freigabe: Sticky-Footer **Auftrag annehmen** (`PartnerAngebotAuftragAnnehmen`)

---

## 4. Aufträge

Nach `projektvertrag_bestaetigt_am` und Compliance-Check.

- Vereinbarte Partnerpreise (`preis_partner`)
- Bautagebuch, Dokumente
- Rechnung-Upload nach Abschluss (wenn freigeschaltet)

---

## 5. Koordinations-Spiegel: CRM-Aktion → Portal-Reaktion

| CRM tut … | DB (kurz) | Portal (sichtbar) |
|-----------|-----------|-------------------|
| Anfrage senden | `status=angefragt` | Anfragen, Badge offen |
| — | HW akzeptiert | Anfragen, Preise festlegen |
| — | HW sendet Preise | Anfragen **verschwindet aus „Offen“** (Wartet auf Prüfung) |
| Übernehmen | `hw_status=bestaetigt` | Anfragen, Konditionen bestätigen + Mail |
| — | HW bestätigt | **Angebote** erscheint |
| Auftrag anlegen + Freigabe | `auftrag.status≠offen` | Angebote, Auftrag freigegeben |
| Leistung nachrüsten | neue Position | Angebote + **Anfragen** (Neue Leistung) |
| Rückfrage | `hw_status=rueckfrage` + Notify | Anfragen, Neue Konditionen |

---

## 6. E-Mail-Links (Deep Links)

| Situation | URL-Muster |
|-----------|------------|
| Angebots-Anfrage | `/partner?section=anfragen&id={angebot_handwerker.id}` |
| Auftrags-Zuweisung | `/partner?section=anfragen&id=auftrag:{auftragId}` |
| Konditionen bestätigen | `/partner?section=anfragen&id={id}` |
| Nach Annahme Angebot | `/partner?section=angebote&id={id}` |
| Laufender Auftrag | `/partner?section=auftraege&id={auftragId}` |

Implementierung: `partner-site-url.ts`, `resolve-partner-portal-link.ts`

---

## 7. UX-Probleme & geplante Verbesserungen (Portal)

| Problem | Auswirkung | Empfehlung |
|---------|------------|------------|
| `eingereicht` nicht in „Offen“ | HW sieht Vorgang nicht mehr bis CRM reagiert | Tab „In Prüfung“ oder Badge in Übersicht |
| `status=akzeptiert` vs. Preis OK | Verwechslung mit CRM-Badge „Akzeptiert“ | Schulung + CRM-Badge umbenennen |
| Nachreichung unsichtbar | Falsche `handwerker_id`/Gewerk | CRM-Checkliste (s. Prozess-Doc §9) |
| Kein Push bei Rückfrage ohne API | HW merkt Rückfrage nicht | `partner-notify-angebot-antwort` immer aufrufen |

**CRM-Redesign (parallel):** Positions-Tab v2 mit 3 Tabs statt Accordion — siehe CRM `ui-referenz.html`. Portal-Redesign ist **nicht** Teil dieses CRM-UI-Projekts, aber die **Badge-Sprache** sollte langfristig angleichen (z. B. „Gegenvorschlag“ / „Bestätigung ausstehend“).

---

## 8. Komponenten-Map

| UI | Datei |
|----|-------|
| Listen + Tabs | `PartnerClient.tsx` |
| Anfrage-Karte | `partner-list-mappers.ts` → `mapAnfrageAngebotToCard` |
| Anfrage-Detail | `PartnerAnfrageDetail.tsx` |
| Konditionen-Tabelle | `PartnerLeistungenKonditionenCard.tsx` |
| Angebot-Detail | `PartnerAngebotDetail.tsx` |
| Auftrag-Zuweisung | `PartnerAuftragAnfrageDetail.tsx` |
| Auftrag-Detail | `PartnerAuftragDetail.tsx` |
