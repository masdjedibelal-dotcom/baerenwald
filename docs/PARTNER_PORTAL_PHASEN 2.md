# Partner-Portal — Menü-Phasen (Anfragen / Angebote / Aufträge)

> **Vollständiger Koordinationsprozess:** [handwerker-koordination/HANDWERKER_KOORDINATION_PROZESS.md](./handwerker-koordination/HANDWERKER_KOORDINATION_PROZESS.md)  
> **UI-Guide für Koordination:** [handwerker-koordination/HANDWERKER_KOORDINATION_PORTAL_UI.md](./handwerker-koordination/HANDWERKER_KOORDINATION_PORTAL_UI.md)

Die Website liefert **vorgefilterte Listen** aus `getPartnerDataForHandwerker()`.
Das Frontend soll **nicht** selbst nach `auftraege.status === "offen"` filtern.

## Datenquellen

| Quelle | Tabelle(n) | Typische CRM-Aktion |
|--------|------------|---------------------|
| Angebots-Funnel | `angebot_handwerker` | HW am Angebot anfragen (Wizard / Versand) |
| Auftrags-Funnel | `auftrag_handwerker`, `auftrag_positionen` | HW einer Leistung am Auftrag zuweisen |

## Phasen-Logik (`partner-portal-phase.ts`)

### `angebot_handwerker`

| Phase | Bedingung (vereinfacht) |
|-------|-------------------------|
| **anfrage** | Noch keine verbindliche Einigung: inkl. `akzeptiert` + Preise offen, `eingereicht`, `bestaetigt`, `rueckfrage`; plus Nachreichungs-Eintrag |
| **angebot** | `hw_status = uebernommen` und Vertrag noch nicht abgeschlossen |
| **auftrag** | `projektvertrag_bestaetigt_am` gesetzt |

**Wichtig:** Tab **Angebote** beginnt erst bei `hw_status = uebernommen` — nicht schon bei `status = akzeptiert`.

### Auftrag (Leistungs-Zuweisung)

| Phase | Bedingung |
|-------|-----------|
| **anfrage** | `auftraege.status === "offen"` oder HW-Status pending |
| **angebot** | Auftrag `offen`, HW `akzeptiert`, verknüpftes Angebot — Preis/PDF |
| **auftrag** | Projekt läuft, HW nicht mehr pending |

HW-Status wird aus `auftrag_handwerker.status` und `auftrag_positionen.handwerker_status` aggregiert.

## API-Response (`get-partner-data.ts`)

```ts
{
  anfragen: PartnerAnfrageItem[];       // angebot_handwerker (Phase anfrage) + Nachreichung
  angebote: PartnerAnfrageItem[];       // angebot_handwerker, Phase angebot
  auftragAnfragen: PartnerAuftragItem[]; // Auftrag Phase anfrage
  auftraege: PartnerAuftragItem[];      // Auftrag Phase auftrag
}
```

Listen-IDs in **Anfragen**:

- Angebots-Anfrage: `angebot_handwerker.id` (UUID)
- Auftrags-Anfrage: `auftrag:{auftrag_id}`

## Filter „Offen“ in der UI

`PartnerClient` filtert Anfragen mit `isPartnerAnfrageAktionErforderlich()`:

- **Sichtbar:** Zu-/Absage, Preise festlegen, bestätigen, Rückfrage, Nachreichung
- **Nicht sichtbar:** `hw_status = eingereicht` („Wartet auf Prüfung“) — CRM muss reagieren

## Nachreichung (dual listing)

Bei `hw_status = uebernommen` + neuer CRM-/Auftragsposition:

- **Angebote:** vereinbarte Leistungen (readonly)
- **Anfragen:** zusätzlicher Eintrag „Neue Leistung“

Siehe `partner-konditionen.ts` und [KONDITIONEN_CRM_HANDOFF.md](./KONDITIONEN_CRM_HANDOFF.md) §6.

## CRM-Hinweis

Wenn im CRM nur am **Auftrag** zugewiesen wird (ohne `angebot_handwerker`), erscheint der Eintrag unter **Anfragen** (`auftrag:…`), solange der Auftrag `offen` ist.

Unter **Aufträge** erscheint er erst nach Angebotseinreichung, `hw_status = uebernommen`, Vertragspaket und `projektvertrag_bestaetigt_am`.

## E-Mail-Links (`partner-site-url.ts`)

| Aktion | URL |
|--------|-----|
| HW-Anfrage (`angebot_handwerker`) | `?section=anfragen&id={uuid}` |
| Auftrags-Zuweisung (offen) | `?section=anfragen&id=auftrag:{auftragId}` |
| Konditionen bestätigen | `?section=anfragen&id={uuid}` |
| Angebot / Vertrag (nach Einigung) | `?section=angebote&id={angebot_handwerker.id}` |
| Laufender Auftrag | `?section=auftraege&id={auftragId}` |

Alle Notify-Endpoints: [PARTNER_CRM_NOTIFY_API.md](./PARTNER_CRM_NOTIFY_API.md)
