# GPT Raumvisualisierung — CRM-Anbindung

Die **handwerks-plattform** ist Single Source of Truth für KI-Visualisierung, Zielbild-Layout und Render-Logik. Das CRM (`baerenwald-crm-dashboard`) soll **nichts nachbauen**, sondern Daten aus `leads.funnel_daten` lesen und optional die Internal-APIs aufrufen.

## Datenfluss

1. Nutzer durchläuft GPT Studio auf der Website → Session in `gpt_raum_sessions`
2. Nach Render + Erklärung wird serverseitig ein **Feed-Zielbild (PNG 1080×1350)** komponiert → `zielbild_url`
3. Lead-Erstellung (`POST /api/gpt-viz/lead`) schreibt vollständiges `funnel_daten` in `leads`

## `leads.funnel_daten` (bei `projekt_studio: true`)

| Feld | Typ | Beschreibung |
|------|-----|----------------|
| `projekt_studio` | `boolean` | Immer `true` für GPT-Studio-Leads |
| `gpt_session_id` | `uuid` | Session-ID für Internal-API |
| `raum_analyse` | `object` | Ist-Raum (Claude Vision) |
| `inspiration_analyse` | `object` | Inspirations-Bild-Analyse |
| `viz_brief` | `object` | Render-Brief inkl. Fix-Elemente & Fragen |
| `wunsch_text` | `string` | Nutzer-Wunsch |
| `render_prompt` | `string` | Finaler Replicate-Prompt |
| `ist_bilder_urls` | `string[]` | Hochgeladene Ist-Fotos |
| `ziel_bild_url` | `string?` | Inspirationsbild |
| `ergebnis_bild_url` | `string?` | Letztes Render-Ergebnis |
| `zielbild_url` | `string?` | **Fertiges Editorial-Feed-PNG** (CRM-Anzeige) |
| `ergebnis_historie` | `array` | Alle Render-Versionen |
| `gpt_erklaerung` | `object` | Bau-Erklärung (Gewerke, Schritte, Copy) |
| `ki_chat_verlauf` | `array` | Chat für Handwerker-Kontext |
| `render_count` | `number` | Anzahl Renders |

**CRM-UI:** Primär `zielbild_url` als Hero-Bild anzeigen. Fallback: `ergebnis_bild_url` + Text aus `gpt_erklaerung`.

## Internal APIs (Bearer)

Basis-URL: `NEXT_PUBLIC_SITE_URL` (z. B. `https://baerenwaldmuenchen.de`)

Header für alle Internal-Routen:

```
Authorization: Bearer <GPT_VIZ_INTERNAL_API_SECRET oder PARTNER_INTERNAL_API_SECRET>
Content-Type: application/json
```

### GET `/api/internal/gpt-viz/brief?sessionId=<uuid>`

Vollständiger Projekt-Brief inkl. abgelaufener Sessions (für archivierte Leads).

Antwort:

```json
{
  "brief": { "session_id": "...", "zielbild_url": "...", "viz_brief": {}, ... },
  "session": { ... }
}
```

### POST `/api/gpt-viz/zielbild`

Zielbild erzeugen oder abrufen (idempotent). Mit `force: true` neu komponieren.

```json
{ "session_id": "<uuid>", "force": false }
```

Antwort: `{ "zielbild_url": "https://..." }`

### POST `/api/gpt-viz/prepare-render` / `POST /api/gpt-viz/render`

Gleiche Endpoints wie der Chat — mit Bearer **ohne Rate-Limit** und Zugriff auf abgelaufene Sessions. Nur nutzen, wenn das CRM aus der Session heraus **neu rendern** soll (selten).

### POST `/api/gpt-viz/erklaerung`

Erklärung + Zielbild-Export. Antwort enthält `gpt_erklaerung` und `zielbild_url`.

## Env (Website / Netlify)

| Variable | Beschreibung |
|----------|----------------|
| `GPT_VIZ_INTERNAL_API_SECRET` | Optional, dedizierter Bearer |
| `PARTNER_INTERNAL_API_SECRET` | Fallback-Bearer (gleicher Wert im CRM) |
| `REPLICATE_API_TOKEN` | Render-Engine |
| `GPT_VIZ_STORAGE_BUCKET` | Supabase Storage (`gpt-visualisierungen`) |
| `CLAUDE_API_KEY` | Analyse & Erklärung |

## Migrationen (Supabase)

- `20260623120000_gpt_viz_brief.sql` — Spalte `viz_brief`
- `20260624120000_gpt_viz_zielbild_url.sql` — Spalte `zielbild_url`

Nach Deploy: `supabase db push` bzw. Migrationen auf Prod anwenden.

---

## Aufgaben im CRM-Backend (`baerenwald-crm-dashboard`)

### 1. Env

```env
NEXT_PUBLIC_SITE_URL=https://baerenwaldmuenchen.de
PARTNER_INTERNAL_API_SECRET=<gleich wie Website>
# oder GPT_VIZ_INTERNAL_API_SECRET
```

### 2. Lead-Detail: `funnel_daten` auslesen

Bei Leads mit `funnel_daten.projekt_studio === true`:

- **Hero:** `<img src={funnel_daten.zielbild_url} />` (4:5 Feed)
- **Kontext:** `gpt_erklaerung.titel`, `zusammenfassung`, `gewerke`, `naechste_schritte`
- **Galerie:** `ist_bilder_urls`, `ergebnis_bild_url`, `ergebnis_historie`
- **Technisch:** `viz_brief`, `render_prompt` (nur für Power-User / Debug)

### 3. Fallback wenn `zielbild_url` fehlt (alte Leads)

```ts
const res = await fetch(`${SITE_URL}/api/gpt-viz/zielbild`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.PARTNER_INTERNAL_API_SECRET}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ session_id: funnel_daten.gpt_session_id }),
});
const { zielbild_url } = await res.json();
// Optional: zielbild_url in leads.funnel_daten zurückschreiben
```

Oder Brief nachladen:

```ts
const res = await fetch(
  `${SITE_URL}/api/internal/gpt-viz/brief?sessionId=${funnel_daten.gpt_session_id}`,
  { headers: { Authorization: `Bearer ${secret}` } }
);
```

### 4. **Nicht** im CRM implementieren

- Zielbild-Canvas / Layout (Creme-Grün, Collage) — liegt in `compose-zielbild-layout.ts` auf der Website
- Claude-Prompts für Render (`prepare-render`, `claude-render-prompt.ts`)
- Replicate-Integration

### 5. Optional: Badge & Filter

- Listenfilter „KI-Projekt“ wenn `funnel_daten.projekt_studio`
- Chat-Verlauf `ki_chat_verlauf` als aufklappbare Timeline für Handwerker
