# Vorgang-Status: Resolver → Rollensicht

Stand: Juli 2026  
**Single Source of Truth (Logik):** `resolveVorgang()` in `src/lib/crm-vorgang/resolve-vorgang.ts`  
**Display-Layer (Ziel):** eine Funktionsschicht `roleStatus` / `phaseLabel` / `flowFor` — **kein fünftes paralleles Statussystem**

Verwandte Docs:
- [DESIGN_GAP_ANALYSE_PORTALE.md](./DESIGN_GAP_ANALYSE_PORTALE.md)
- [WAVE_WHITELABEL_KOMMUNIKATION.md](./WAVE_WHITELABEL_KOMMUNIKATION.md)

---

## 1. Kanonisches Resolver-Output

`resolveVorgang(input)` liefert:

| Feld | Werte |
|------|--------|
| `phase` | `anfrage` · `angebot` · `auftrag` · `rechnung` |
| `unterstatus` | phasenspezifisch (siehe §2) |
| `unterstatusLabel` | lesbar |
| `needsAction` | bool |
| `actor` | `freigabe` · `handwerker` · `kunde` · `bw` · null |
| `badges` | `notfall`, `wartet_freigabe` |
| `ueberfaellig` | bool (Rechnung) |

**Regel:** Phase wird aus **neuester aktiver Entität** abgeleitet (Rechnung > Auftrag > Angebot > Lead) — nie aus `leads.vorgang_phase` gelesen.

---

## 2. Unterstatus je Phase (Resolver)

| Phase | Unterstatus (intern) | Label (Beispiel) |
|-------|------------------------|------------------|
| **anfrage** | `neu`, `kontaktiert`, `termin`, `abgebrochen`, `storniert` | Neu, Kontaktiert, … |
| **angebot** | `entwurf`, `gesendet`, `angenommen`, `abgelehnt`, `ersetzt`, `storniert` | Entwurf, Gesendet, … |
| **auftrag** | `offen`, `in_arbeit`, `abnahme`, `abgeschlossen`, `storniert` | Offen, In Arbeit, … |
| **rechnung** | `entwurf`, `gesendet`, `bezahlt`, `storniert` | Gesendet, Bezahlt, … |

Zusätzliche Signale (kein eigener Unterstatus): `badges.notfall`, `badges.wartet_freigabe`, `ueberfaellig`.

---

## 3. Design-Meilensteine → Resolver-Phasen

Die **8 Design-Status** sind Meilensteine der **4 Resolver-Phasen** — nicht ein separates Datenmodell.

| Design-Meilenstein | Resolver-Phase | Typische Unterstatus / Badges |
|--------------------|----------------|------------------------------|
| `gemeldet` | `anfrage` | `neu`, `kontaktiert` |
| `freigegeben` | `anfrage` → `angebot` | HV-Freigabe erledigt; ggf. `angebot`/`entwurf` |
| `angefragt` | `angebot` / `auftrag` | HW angefragt; `angebot`/`gesendet` oder Auftrag `offen` + `handwerkerAktionOffen` |
| `angebot` | `angebot` | `gesendet`, `angenommen` |
| `auftrag` | `auftrag` | `offen`, `in_arbeit` |
| `abschluss` | `auftrag` | `abnahme`, ggf. `abgeschlossen` (vor Rechnung) |
| `rechnung` | `rechnung` | `gesendet`, `ueberfaellig` |
| `bezahlt` | `rechnung` | `bezahlt` |

**Mieter (Option A):** Phasen `rechnung` / `bezahlt` erscheinen **nicht** — siehe §5.

---

## 4. Pill-Semantik (Design)

Farbe nur im **Status-Pill** — keine Regenbogen-Akzente an Listenkarten.

| Semantik | Farbe (Design) | `pillKind` (Display-Layer) | Wann |
|----------|----------------|----------------------------|------|
| Neu / wartet passiv | Blau | `neu` | `phase=anfrage`, kein Notfall |
| Aktion / wartet aktiv | Gelb | `warten` | `wartet_freigabe`, `needsAction` |
| Aktiv / in Arbeit | Grün | `aktiv` | `angebot`, `auftrag`, `rechnung` offen |
| Fertig | Grau | `fertig` | abgeschlossen / bezahlt |
| Storniert | Grau | `storniert` | `unterstatus=storniert` / abgebrochen |
| Notfall | Rot (Ausnahme) | Meta-Zeile, optional eigener Pill | `badges.notfall` |

Implementierung heute teils in `resolveVorgangDisplay()` → `pillKind`; Ziel: ein Mapping-Modul `src/lib/crm-vorgang/role-status.ts`.

---

## 5. Timeline-Schritte pro Rolle

### 5.1 Mieter (Token-Status, HV-Flow) — **4 Schritte**

| Timeline-ID | Label (DE) | Resolver → Schritt |
|-------------|------------|---------------------|
| `eingegangen` | Eingegangen | `phase=anfrage` |
| `in_bearbeitung` | In Bearbeitung | `phase=angebot` |
| `beauftragt` | Bestätigung | `phase=auftrag` **oder** `phase=rechnung` (kein Rückfall), `unterstatus` ∉ `abgeschlossen,storniert` |
| `erledigt` | Erledigt | Auftrag `abgeschlossen` **oder** Lead/HV erledigt (siehe `portalErledigtFromLeadAndAuftrag`) |

**Abnahme** ist intern (`auftrag`/`abnahme`) — Mieter bleibt bei **Bestätigung** bis Erledigt.

Live-Referenz: `buildMieterStatusTimeline()` + `resolveMieterStatusStufe()` in `src/lib/vorgang/vorgang-phase.ts`.

### 5.2 Mieter — Resolver-Phase → Listen-Pill

| `phase` | Pill-Label | Timeline-Schritt |
|---------|------------|------------------|
| `anfrage` | Eingegangen | `eingegangen` |
| `angebot` | In Bearbeitung | `in_bearbeitung` |
| `auftrag` | Bestätigung | `beauftragt` |
| `rechnung` | Bestätigung | `beauftragt` (kein Rechnungs-Wording, kein Rückfall auf In Bearbeitung) |

### 5.3 Hausverwaltung (`role: hv`) — voller Flow, CRM-Labels

Timeline (Detail, optional 5–6 Schritte im UI): orientiert an CRM-Phasen, nicht an Mieter-4er.

| Resolver | Listen-Label (`resolveVorgangDisplay`) | Hinweis |
|----------|------------------------------------------|---------|
| `anfrage` | Neu | |
| `angebot` + `wartet_freigabe` | In Bearbeitung | `actionHint`: Freigabe ausstehend |
| `angebot` | In Bearbeitung | |
| `auftrag` | In Bearbeitung | |
| `rechnung` + `ueberfaellig` | In Bearbeitung | Meta: Überfällig |
| `rechnung` + `bezahlt` | (fertig) | KPI „Erledigt“ |

Rechnung sichtbar für HV (Abrechnung an HV, Option A — keine Mieter-Rechnung).

### 5.4 Kunde privat (`role: kunde`, kein HV-Mieter)

| Resolver-Phase | Listen-Label (Legacy + Ziel) |
|----------------|------------------------------|
| `anfrage` | Eingegangen |
| `angebot` + `entwurf` | Angebot wird erstellt |
| `angebot` + `gesendet` | Angebot liegt vor |
| `auftrag` | In Ausführung |
| `rechnung` | Abgeschlossen / Rechnung (je nach Unterstatus) |

Mittelfristig: `kunde-vorgang-status.ts` nur noch Wrapper um Resolver + Mapping.

### 5.5 Handwerker

Design-Kompression:

| Resolver | HW-Sicht | Timeline-Schritt |
|----------|----------|------------------|
| `anfrage`, `angebot`/`entwurf` | Angefragt | `angefragt` |
| `angebot`/`gesendet`+ | Angebot | `angebot` |
| `auftrag`/`offen`,`in_arbeit` | Auftrag | `auftrag` |
| `auftrag`/`abnahme` | Abschluss | `abschluss` |
| `rechnung`, `bezahlt` | Erledigt | `erledigt` |

Live-Partner-States (`neu`, `geaendert`, `in_bearbeitung`, `erledigt`) → über Mapping auf Resolver legen.

---

## 6. Vollständige Mapping-Matrix (Implementierung)

Eingabe: `ResolvedVorgang` + `PortalRole`  
Ausgabe: `{ listLabel, timelineStep, pillKind, pillSemantic, actionHint?, metaLine? }`

### 6.1 Mieter (`mieter` / Token-Status)

| phase | unterstatus (Auszug) | badges | timelineStep | listLabel | pillKind |
|-------|----------------------|--------|--------------|-----------|----------|
| anfrage | * | notfall | eingegangen | Eingegangen | neu |
| anfrage | * | | eingegangen | Eingegangen | neu |
| angebot | * | | in_bearbeitung | In Bearbeitung | aktiv |
| auftrag | offen, in_arbeit, abnahme | | beauftragt | Bestätigung | aktiv |
| auftrag | abgeschlossen | | erledigt | Erledigt | fertig |
| rechnung | * | | beauftragt | Bestätigung | aktiv |
| * | storniert | | erledigt | Abgelehnt | storniert |

### 6.2 HV (`hv`)

| phase | unterstatus | badges | listLabel | actionHint (wenn needsAction) |
|-------|-------------|--------|-----------|-------------------------------|
| anfrage | neu | | Neu | |
| anfrage | * | wartet_freigabe | In Bearbeitung | Freigabe ausstehend |
| angebot | entwurf | wartet_freigabe | In Bearbeitung | Freigabe ausstehend |
| angebot | gesendet | | In Bearbeitung | |
| auftrag | * | | In Bearbeitung | |
| rechnung | gesendet | ueberfaellig | In Bearbeitung | Meta: Überfällig |
| rechnung | bezahlt | | Abgeschlossen | |
| * | storniert | | Storniert | |

### 6.3 Handwerker (`handwerker`)

| phase | unterstatus | needsAction + actor | listLabel |
|-------|-------------|----------------------|-----------|
| anfrage / angebot | entwurf, gesendet | actor=handwerker | Aktion nötig |
| angebot | * | | Angebot |
| auftrag | offen, in_arbeit | actor=handwerker | Aktion nötig |
| auftrag | abnahme | | Abschluss |
| auftrag | abgeschlossen | | Erledigt |
| rechnung / bezahlt | * | | Erledigt |

---

## 7. Deprecation (mittelfristig)

| Modul | Rolle | Ziel |
|-------|-------|------|
| `plattform-status.ts` | HV Freigabe-Liste | Mapping-Konsument von Resolver + HV-Filter |
| `kunde-vorgang-status.ts` | Kunden-Portal | Wrapper → `resolvePortalKundeVorgangStatus` |
| `vorgang-phase.ts` (Mieter) | Token-Status | Timeline aus Resolver-Mieter-Mapping |
| Harte UI-Labels | überall | nur noch aus Mapping-Modul |

**Nicht deprecaten:** `resolveVorgang`, `resolveVorgangDisplay` — erweitern um `roleStatus.ts`.

---

## 8. Nächster Implementierungsschritt (Dev)

1. `src/lib/crm-vorgang/role-status.ts` — pure functions aus §6
2. Tests in `scripts/test-crm-vorgang-resolver.ts` — je Rolle 2–3 Fixtures
3. `build-kunde-vorgaenge` / Freigabe-Liste auf Mapping umstellen
4. Designer: **P0-2 Status-Design-System** erst **nach** Freigabe dieser Tabelle

---

## 9. Sonderfälle

| Fall | Verhalten |
|------|-----------|
| Notfall | Meta „Notfall“, ggf. roter Pill — **zusätzlich** zum Phasen-Pill |
| `wartet_freigabe` | Badge; HV `actionHint` Pflicht |
| Alle Angebote storniert | `phase=anfrage`, `unterstatus=storniert` |
| Mieter + Rechnung (Option A) | Kein Mieter-Rechnungs-UI; Timeline max. „In Bearbeitung“ |
| Termin offen (Mieter) | Zusatz-Hint auf Status-Seite, **kein** eigener Resolver-Status |
| Privat-Kunde | Weiterhin Bärenwald-Portal; Mapping `role: kunde` |
