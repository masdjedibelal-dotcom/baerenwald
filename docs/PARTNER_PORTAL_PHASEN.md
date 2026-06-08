# Partner-Portal — Menü-Phasen (Anfragen / Angebote / Aufträge)

Die Website liefert **vorgefilterte Listen** aus `getPartnerDataForHandwerker()`.
Das Frontend soll **nicht** selbst nach `auftraege.status === "offen"` filtern.

## Datenquellen

| Quelle | Tabelle(n) | Typische CRM-Aktion |
|--------|------------|---------------------|
| Angebots-Funnel | `angebot_handwerker` | HW am Angebot anfragen (Wizard / Versand) |
| Auftrags-Funnel | `auftrag_handwerker`, `auftrag_positionen` | HW einer Leistung am Auftrag zuweisen |

## Phasen-Logik (`partner-portal-phase.ts`)

### `angebot_handwerker`

1. **anfrage** — `isPartnerAnfrageOffen()` (noch keine Antwort / Pending)
2. **angebot** — Status `akzeptiert`, `hw_status` ≠ `uebernommen` (Einreichung offen, in Prüfung oder übernommen-Anzeige)
3. Sonst nicht in den drei Menü-Listen

### Auftrag (Leistungs-Zuweisung)

1. **anfrage** — `auftraege.status === "offen"` **oder** HW-Status `angefragt` / `ausstehend` / `warten`
2. **auftrag** — Projekt läuft (`in_arbeit`, `abgeschlossen`, …) und HW nicht mehr pending

HW-Status wird aus `auftrag_handwerker.status` und `auftrag_positionen.handwerker_status` aggregiert.

## API-Response (`get-partner-data.ts`)

```ts
{
  anfragen: PartnerAnfrageItem[];      // nur angebot_handwerker, Phase anfrage
  angebote: PartnerAnfrageItem[];      // nur angebot_handwerker, Phase angebot
  auftragAnfragen: PartnerAuftragItem[]; // Auftrag Phase anfrage
  auftraege: PartnerAuftragItem[];     // Auftrag Phase auftrag (+ portalPhase, hwStatus)
}
```

Listen-IDs in **Anfragen**:

- Angebots-Anfrage: `angebot_handwerker.id` (UUID)
- Auftrags-Anfrage: `auftrag:{auftrag_id}`

## CRM-Hinweis

Wenn im CRM nur am **Auftrag** zugewiesen wird (ohne `angebot_handwerker`), erscheint der Eintrag unter **Anfragen** (nicht Aufträge), solange der Auftrag `offen` ist.

Nach Annahme (`respondPartnerAuftragZuweisung`) wird die verknüpfte `angebot_handwerker`-Zeile auf **akzeptiert** gesetzt — der Eintrag erscheint unter **Angebote** (Preis/PDF). Er verschwindet aus **Anfragen**.

Unter **Aufträge** erscheint er erst nach:
1. Angebotseinreichung + CRM-Bestätigung (`hw_status = uebernommen`)
2. Projektvertrag + fehlende Unterlagen im Tab **Angebote**
3. Verbindlicher Bestätigung (`auftrag_handwerker.projektvertrag_bestaetigt_am`)

Ohne `angebot_handwerker`-Zeile am Angebot kann im Portal kein HW-Angebot eingereicht werden (Hinweis im Detail).

## E-Mail-Links (`partner-site-url.ts`)

| Aktion | URL |
|--------|-----|
| HW-Anfrage (`angebot_handwerker`) | `?section=anfragen&id={uuid}` |
| Auftrags-Zuweisung (offen) | `?section=anfragen&id=auftrag:{auftragId}` |
| Laufender Auftrag | `?section=auftraege&auftrag={auftragId}` |
| Angebot einreichen (nach Annahme) | `?section=angebote&id={angebot_handwerker.id}` |

Zuweisungs-Mail: `partnerLoginForAuftragAnfrageUrl()` → Anfragen-Tab, nicht Aufträge.
