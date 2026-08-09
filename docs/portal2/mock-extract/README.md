# Portal Mock Extract

Quelle: `/tmp/portal_mock_big.js` (Baerenwald Portale HTML mock, ~199KB JSON-escaped string)

## Extraktionsmethode

1. Datei via `json.loads()` entpackt (escaped JS/HTML-String)
2. `const`-Objekte per Regex + JS→JSON-Konverter extrahiert
3. Methoden-Inhalte (`navItems`, `notifData`, `STG`, Demo-States) manuell geparst

## Design Tokens (`C.json`)

| Token | Wert |
|-------|------|
| bg | `None` |
| panel | `None` |
| line | `None` |
| line2 | `None` |
| ink | `None` |
| sub | `None` |
| faint | `None` |
| faint2 | `None` |
| primary | `None` |
| primaryDk | `None` |
| primarySoft / green50 | `None` / `None` |
| greenDark | `None` |
| shadow | `None` |
| head | `None` |
| body | `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', system-ui, Roboto, 'Helvetica Neue', Arial, sans-serif` *(aus CSS, nicht in const C)* |

## Status (`STATUS.json`)

**8 Statuswerte:** gemeldet, freigegeben, angefragt, angebot, auftrag, abschluss, rechnung, bezahlt

Flow-Reihenfolge (`FLOW.json`): gemeldet → freigegeben → angefragt → angebot → auftrag → abschluss → rechnung → bezahlt

## FACHFRAGEN Kategorien

wasser, heizung, strom, fenster, dach, schimmel, sonstiges — je 3 Ja/Nein-Fragen (de+en)

## Brand Presets

5 Presets: Steiner-Blau, Anthrazit, Waldgrün, Bordeaux, Petrol

## Default ORG (White-Label Mieter)

- **name:** Immobilien Steiner GmbH
- **primary:** #22508C
- **tel:** 030 555 12 00

## Navigation (navItems.json)

| Rolle | Einträge |
|-------|----------|
| kunde (HV) | Dashboard, Vorgänge, Objekte, Servicepakete, Einstellungen |
| kunde (privat) | Übersicht, Meine Aufträge, Einstellungen |
| eigentuemer | Dashboard, Vorgänge, Objekte |
| mieter | Start, Meine Meldungen, Konto |
| handwerker | Start, Aufträge, Firmendaten |

**Nav-Icons:** ▤ ▦ ◇ ◈ ⚙

## Mieter-Status-Timeline (STG.json)

4 Stufen: Eingegangen → In Bearbeitung → Bestätigung → Erledigt
(Live-Code: `MIETER_STG` in `src/lib/portal2/status.ts`; Mock-JSON kann historisch „Beauftragt“ heißen.)

## Übersetzungen (tr)

- **Gesamt:** 74 `this.tr(de, en)` Aufrufe
- **Dump:** `tr_pairs.jsonl` (erste 74)

## Benachrichtigungen (notifData.json)

Rollen: kunde (3), eigentuemer (2), mieter (3), handwerker (3)

Tuple-Schema: `[type, title, body, time, unread, bg, color, icon]`

## Demo-States (error_empty_states)

- `normal` — regulärer Betrieb
- `leer` — Noch keine Vorgänge
- `e404` — Seite nicht gefunden
- `zugriff` — Kein Zugriff
- `server` — Etwas ist schiefgelaufen
- `offline` — Keine Verbindung

## Helper-Funktionen (`helpers.json`)

### applyBrand(p)
Setzt `ORG.primary`, `ORG.primaryDk`, `ORG.soft` aus BRAND_PRESETS und ruft `forceUpdate()`.

### canCreate()
Gibt `false` nur für Rolle `handwerker` zurück.

### createLabel()
- mieter → „Schaden melden"
- eigentuemer → „Anfrage erstellen"
- sonst → „Neuer Vorgang"

## Dateien

```
/tmp/portal_mock_extract/
├── C.json
├── BRAND_PRESETS.json
├── ORG.json
├── STATUS.json
├── FLOW.json
├── STG.json
├── FACHFRAGEN.json
├── MELDE_SLOTS.json
├── MELDE_OBJEKTE.json
├── navItems.json
├── nav_icons.json
├── error_empty_states.txt
├── error_empty_states.json
├── tr_pairs.jsonl
├── tr_pairs_meta.json
├── notifData.json
├── helpers.json
└── README.md
```
