# Bärenwald GPT — Raumvisualisierung mit Replicate + Lead-Anfrage

> **Ziel:** Neue Funktion in **Bärenwald GPT** (`handwerks-plattform`): Endkunde visualisiert seinen Raum per KI, bekommt eine **Bau-/Gewerk-Erklärung**, kann alles **weiter bearbeiten** und schickt eine **Anfrage** — Lead landet im CRM mit Bildern + GPT-Kontext.

---

## PO-Entscheidungen (fix)

| Thema | Entscheidung |
|-------|--------------|
| Renders pro Session | **3** |
| Login | **Anonym erlaubt** (Portal + Rechner) |
| Preishinweis in Erklärung | **Optional** im JSON, nicht aufdringlich |
| Bilder im Lead | **URLs in `funnel_daten`** (kein extra CRM-Upload nötig) |
| Interne Mail | **Nein** — kein zusätzlicher Versand für `gpt_raumvisualisierung`; Lead reicht (CRM zeigt Anfrage wie gewohnt) |
| CRM-Dashboard (`baerenwald-crm-dashboard`) | **MVP: nichts Pflicht** — Lead kommt über bestehende `leads`-Tabelle; schöne Vorher/Nachher-Ansicht in Anfrage-Detail optional Phase 2 |

---

## Wo wird gebaut? (Backend-Klarstellung)

```
handwerks-plattform     ← ALLE neuen APIs, UI, Replicate, Claude, Lead-Submit
        │
        ▼
   Supabase (shared)     ← leads + optional gpt_raum_sessions + Storage-Bucket
        │
        ▼
baerenwald-crm-dashboard ← MVP: nichts. Anfrage erscheint automatisch in /anfragen
```

**Im CRM-Backend gibt es für MVP nichts zu tun**, solange:

- `persistLead` in der Website weiterhin `leads` befüllt (bestehend)
- `funnel_quelle: gpt_raumvisualisierung` + `funnel_daten` mit Bild-URLs reichen für Vertrieb

Optional später im CRM: Karte „KI-Visualisierung“ in `AnfrageDetailClient` — reine UI, keine neue API.

---

## Kern-Idee: Zwei Einstiege, ein Flow

Der Nutzer kann **von beiden Seiten** starten — der Prompt/Wunsch ist immer **editierbar**:

### Einstieg A — **Bild zuerst**

```
Foto hochladen
    → Claude erkennt Raum (Bad, Küche, Wohnzimmer …)
    → liefert Beschreibung + 3 Stil-Vorschläge passend zum Raum
    → Nutzer bearbeitet Text / wählt Chips / tippt weiter
    → Render → Vorher/Nachher → Bau-Erklärung → Anfrage
```

### Einstieg B — **Wunsch zuerst**

```
Freitext („helles Bad, Walk-in-Dusche“) oder Stil-Chips wählen
    → optional später Foto hochladen (empfohlen für gutes Ergebnis)
    → Claude schärft Prompt + schlägt fehlende Details vor
    → Render → …
```

**Ohne Foto:** Render erst freischalten, wenn mindestens 1 Ist-Bild da ist (Replicate braucht `image`). Bis dahin: Beratung + Stil-Vorschläge im Textfeld.

---

## UX-Details (das „Geile“)

### Nach Bild-Upload: `/api/gpt-viz/analyze-room`

Claude Vision liefert JSON:

```json
{
  "raum_typ": "bad",
  "raum_label": "Badezimmer",
  "ist_beschreibung": "Kleines Bad ca. 4 m², beige Fliesen, Wanne, Fenster …",
  "erkannte_elemente": ["Wanne", "Waschtisch", "Oberlicht"],
  "einschaetzung": "Gute Basis für Teilsanierung oder Komplettumbau.",
  "stil_vorschlaege": [
    { "titel": "Modern & hell", "kurz": "Großformat-Fliesen, Glasdusche", "prompt_de": "…" },
    { "titel": "Skandinavisch", "kurz": "Holz, Weiß, reduziert", "prompt_de": "…" },
    { "titel": "Spa-Feeling", "kurz": "Naturstein, indirektes Licht", "prompt_de": "…" }
  ],
  "wunsch_entwurf": "Modernes, helles Bad mit Dusche statt Wanne …"
}
```

**UI:**

- `ist_beschreibung` als editierbares Textfeld („So sehen wir deinen Raum“)
- 3 **Stil-Karten** antippbar → füllen/ergänzen `wunsch_entwurf`
- Freitext darunter — alles kombinierbar und jederzeit änderbar
- Button **„So visualisieren“** → Render

### Während der Bearbeitung

- **Nachprompt** nach erstem Render: „Fliesen heller“, „mehr Licht“ (Chips aus CRM `VIZ_NACHPROMPT_TAGS`)
- Jeder Render aktualisiert den englischen SD-Prompt serverseitig, Anzeige für Nutzer bleibt Deutsch
- Versionen-Slider wie im CRM (max. 3 Renders)

### Nach Render: Bau-Erklärung

Unverändert: Gewerke, Ablauf, Bärenwald-GU — dann Lead-Formular.

---

## Produkt-Flow (gesamt)

```
Tab „Raum visualisieren“ in Bärenwald GPT
│
├─ [Optional] Einstieg wählen: „Mit Foto“ | „Mit Idee starten“
│
├─ Bild? → Upload → analyze-room → Beschreibung + Stil-Vorschläge (editierbar)
├─ Idee?  → Text/Chips → optional Upload nachziehen
│
├─ Wunsch finalisieren (immer editierbar)
├─ Replicate Render → Vorher/Nachher (bis 3×)
├─ GPT Bau-Erklärung
└─ Anfrage senden → Lead (Kunden-Bestätigungsmail wie bei anderen Leads, keine Extra-Intern-Mail)
```

---

## Kontext (bestehende Codebasis)

| Bereich | Pfad |
|--------|------|
| Bärenwald GPT | `src/components/portal/PortalBaerenwaldGpt.tsx` |
| Chat | `src/components/funnel/KiRechnerChat.tsx`, `/api/ki-rechner` |
| Lead | `src/lib/lead/persist-lead.ts`, `submit-funnel-lead.ts` |
| Fotos | `src/components/funnel/PhotoUpload.tsx` |
| CRM-Referenz Replicate | `baerenwald-crm-dashboard/src/lib/visualize/replicate-client.ts` |

---

## UI-Komponenten (neu)

```
src/components/gpt/
  GptRaumVisualisierung.tsx     # State-Machine: bild|idee → wunsch → render → erklaerung → lead
  GptVizEinstieg.tsx            # Zwei Karten: Mit Foto / Mit Idee
  GptVizRaumAnalyse.tsx         # Beschreibung + Stil-Vorschläge (editierbar)
  GptVizWunschEditor.tsx        # Textarea + Stil-Chips + Nachprompt-Chips
  GptVizBeforeAfter.tsx
  GptVizLeadForm.tsx
  gpt-viz.css
```

**`PortalBaerenwaldGpt.tsx`:** Tabs `Beratung` | `Raum visualisieren`

---

## Backend (nur handwerks-plattform)

### ENV

```env
REPLICATE_API_TOKEN=r8_...
CLAUDE_API_KEY=sk-ant-...
GPT_VIZ_STORAGE_BUCKET=gpt-visualisierungen
```

### Lib

```
src/lib/gpt-viz/
  constants.ts
  replicate-client.ts
  storage.ts
  session.ts
  claude-analyze-room.ts      # NEU: Bild → Beschreibung + Stil-Vorschläge
  claude-render-prompt.ts     # Deutsch/JSON → englischer SD-Prompt
  claude-bauerklaerung.ts
  types.ts
```

### API Routes

| Route | Aufgabe |
|-------|---------|
| `POST /api/gpt-viz/session` | Session anlegen |
| `POST /api/gpt-viz/upload` | Foto → Storage |
| `POST /api/gpt-viz/analyze-room` | **Bild → Raumbeschreibung + Stil-Vorschläge + wunsch_entwurf** |
| `POST /api/gpt-viz/render` | Replicate (braucht `ist_bild_url` + `wunsch_text`) |
| `POST /api/gpt-viz/erklaerung` | Bau-Erklärung nach Render |
| `POST /api/gpt-viz/lead` | Lead via `persistLead` |

**Rate-Limits:** Render 3/h/IP (Session max 3), analyze-room 10/h, Lead 3/h.

### Session-Tabelle (Supabase, eine Migration in handwerks-plattform)

```sql
create table public.gpt_raum_sessions (
  id uuid primary key default gen_random_uuid(),
  ist_bilder_urls text[] not null default '{}',
  raum_analyse jsonb,
  wunsch_text text,
  render_prompt text,
  ergebnis_bild_url text,
  ergebnis_historie jsonb not null default '[]',
  gpt_erklaerung jsonb,
  render_count int not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);
```

Storage-Bucket `gpt-visualisierungen` (public read für Replicate-URLs oder signed).

---

## Replicate

- Modell: **`adirik/interior-design`**
- Version: **`76604baddc85b1b4616e1c6475eca080da339c8875bd4996705440484a6eac38`**

---

## Claude — drei Rollen

1. **`analyze-room`** — Raum erkennen, beschreiben, Stil-Vorschläge, ersten Wunsch-Entwurf (editierbar)
2. **`render-prompt`** — Nutzer-Wunsch (DE) + Raumkontext → englischer SD-Prompt
3. **`bauerklaerung`** — nach Render: Gewerke, Ablauf, GU (JSON, siehe unten)

### analyze-room System-Prompt (Kern)

```
Du analysierst ein Raumfoto für Bärenwald München (Handwerk/Renovierung).
Erkenne Raumtyp, beschreibe den Ist-Zustand sachlich auf Deutsch (Du-Form).
Schlage 3 unterschiedliche Stil-Richtungen vor, passend zum erkannten Raum.
Formuliere einen ersten Visualisierungs-Wunsch als Entwurf — der Nutzer bearbeitet ihn.
Antwort NUR als JSON (Schema siehe Doku).
Keine Preise erfinden. Keine Kontaktdaten erfragen.
```

---

## Lead

- `funnel_quelle`: **`gpt_raumvisualisierung`**
- **Keine** zusätzliche Intern-Mail — in `persistLead` bei dieser Quelle `internTo` überspringen (oder gar nicht triggern)
- Kunden-Bestätigungsmail: optional wie andere Leads
- `funnel_daten` ergänzt um:

```json
{
  "raum_analyse": { "raum_typ": "bad", "ist_beschreibung": "…", "stil_vorschlaege": [] },
  "wunsch_text": "…",
  "ist_bilder_urls": [],
  "ergebnis_bild_url": "…",
  "gpt_erklaerung": {}
}
```

---

## Akzeptanzkriterien

- [ ] Zwei Einstiege: Mit Foto / Mit Idee
- [ ] Nach Upload: Raumbeschreibung + 3 Stil-Vorschläge, alles editierbar
- [ ] Prompt-first ohne Foto: Hinweis „Foto für Visualisierung nötig“
- [ ] Render + Vorher/Nachher, max. 3 Versionen
- [ ] Bau-Erklärung + Anfrage → Lead in CRM
- [ ] **Keine** Extra-Intern-Mail für diese Quelle
- [ ] Mobile im GPT-Sheet

---

## Implementierungs-Reihenfolge

1. Lib + Replicate + Storage + Session + Migration
2. `analyze-room` API + UI (Bild-Pfad)
3. Wunsch-Editor + Idee-Pfad
4. Render + Before/After
5. Erklärung + Lead (ohne Intern-Mail)
6. Tab in `PortalBaerenwaldGpt`

---

## Cursor-Agent-Prompt

```
Implementiere „Raum visualisieren“ in handwerks-plattform gemäß
docs/GPT_RAUMVISUALISIERUNG_IMPLEMENTIERUNG.md.

PO fix: 3 Renders/Session, anonym, keine Intern-Mail für funnel_quelle gpt_raumvisualisierung,
CRM-Dashboard MVP unberührt.

Kern-UX: Zwei Einstiege (Bild zuerst ODER Idee zuerst). Nach Bild-Upload analyze-room:
Raumbeschreibung + 3 Stil-Vorschläge — Nutzer bearbeitet alles, dann Render (Replicate adirik/interior-design).

Alles nur in handwerks-plattform + Supabase. persistLead erweitern, Intern-Mail für diese Quelle aus.
```
