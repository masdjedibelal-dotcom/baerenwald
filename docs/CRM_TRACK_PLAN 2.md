# CRM-Track — abgestimmter Plan (nur `baerenwald-crm-dashboard`)

Stand: Juli 2026  
**Repo:** `baerenwald-crm-dashboard` (nicht `handwerks-plattform`)  
**Portal-Track:** Design/WL in `handwerks-plattform` — parallel, entkoppelt  
**Verbindung:** Supabase + geteilte Resolver-Fixtures (`shared/crm-vorgang/resolve-vorgang.fixtures.json`)

---

## Repo-Trennung (fix)

| | Portal | CRM |
|--|--------|-----|
| Zielgruppe | Mieter, HV, Partner | Bärenwald-Ops |
| Mockup | Portale-Mock (Optik) | `Baerenwald CRM (standalone) (2).html` (verbindlich) |
| Umzug/Verschmelzung | **Nein** | **Nein** |

Dieses Dokument ist die **einzige Reihenfolge** für CRM-Arbeit. Die frühere „5-Punkte-Liste“ aus [ORGANISATION_PORTAL_BACKEND.md](./ORGANISATION_PORTAL_BACKEND.md) ist **kein paralleler Plan** — siehe Phase D unten.

---

## Schrittfolge (CRM-Session)

### Schritt 0 — Spec-Patch

Referenzen: `ENTWICKLER-SPEC.md`, `KOMPONENTEN.md`, Resolver-Spec, CRM-Mockup.

7 Punkte (Diff zeigen, **Stopp**):

1. Resolver kanonisch (`resolveVorgang`)
2. Liste: ohne NeedsAction-Spalte, ohne Kontext-Badges; Badges nur Detail-Header; Sortierung nach letzter Aktivität
3. Lead-Status nur Anfrage-Werte
4. Auftrag ohne `phase`-Feld
5. Rechnungsstatus `entwurf|gesendet|bezahlt|storniert` + Mahn-Badge
6. §3 + Tabs Zahlplan und Bautagebuch; Mock-Altstatuswerte **nicht** übernehmen
7. Angebots-Status: Entwurf → Gesendet → Angenommen/Abgelehnt + Abgelaufen/Ersetzt

### Schritt 1 — Checkout-Audit

Fehlende Dateien rekonstruieren, Build grün, Env-Check (`process.env` vs. `.env.local`). Liste zeigen, **Stopp**.

### Schritt 2 — `resolveVorgang()` + Fixtures

Fixtures aus Portal-Repo übernehmen:

`handwerks-plattform/shared/crm-vorgang/resolve-vorgang.fixtures.json`  
→ `baerenwald-crm-dashboard/shared/crm-vorgang/resolve-vorgang.fixtures.json`

Testlauf zeigen, **Stopp**. Siehe [shared/crm-vorgang/README.md](../shared/crm-vorgang/README.md).

### Phasen A–D (Mockup-Umbau)

Nach Schritt 0–2. Lösch-Regel und Feature-Paritäts-Regel durchgehend.

| Phase | Inhalt (Kurz) |
|-------|----------------|
| **A** | Konditionen / Anfragen bis „übernommen“ |
| **B** | Angebot → Auftrag |
| **C** | Nachreichung |
| **D** | HV-Support & Erweiterungen (ehem. 5-Punkte-Liste) |

---

## Phase D — ehem. „5-Punkte-Liste“ (einsortiert)

Aus [ORGANISATION_PORTAL_BACKEND.md](./ORGANISATION_PORTAL_BACKEND.md) — **nur als Phase-D-Einträge**, nicht vor A–C:

| ID | Thema | Portal-Stand |
|----|--------|--------------|
| **D1** | Objekte / `melde_slug`, Melde-Links, QR optional | Portal ✅ |
| **D2** | Types + Kunden-Tab Organisation (`portal_modus`, Org-Felder, Freigabe-Regeln) | Portal ✅ |
| **D3** | Anfragen-Filter + Lead-Detail-Blöcke (HV-Kontext) | CRM |
| **D4** | Freigabe-Workflow + Partner-Gate in `send-handwerker-anfrage` | Portal ✅ / CRM prüfen |
| **D5** | E-Mail-Templates CRM (M9 Org-Einladung, …) | CRM |

---

## Kickoff-Prompt (neue Cursor-Session im CRM-Repo)

```
Wir starten den abgestimmten CRM-Plan in diesem Repo. Referenzen: Baerenwald CRM (standalone) (2).html (UI verbindlich), ENTWICKLER-SPEC.md, KOMPONENTEN.md, Resolver-Spec. Schritt 0: Spec-Patch (7 Punkte: Resolver kanonisch; Liste ohne NeedsAction-Spalte und ohne Kontext-Badges, Badges nur Detail-Header, Sortierung nach letzter Aktivität; Lead-Status nur Anfrage-Werte; Auftrag ohne phase-Feld; Rechnungsstatus entwurf/gesendet/bezahlt/storniert mit Mahn-Badge; §3 + Tabs Zahlplan und Bautagebuch; Mock-Altstatuswerte nicht übernehmen; Angebots-Status reduziert auf Entwurf→Gesendet→Angenommen/Abgelehnt+Abgelaufen/Ersetzt) — Diff zeigen, Stopp. Schritt 1: Checkout-Audit, fehlende Dateien rekonstruieren, Build grün, Env-Check (process.env-Referenzen vs. .env.local) — Liste zeigen, Stopp. Schritt 2: resolveVorgang() — übernimm die Fixtures aus dem Portal-Repo als geteilte JSON-Datei (beide Repos testen gegen dieselben Fälle), Testlauf zeigen, Stopp. Danach Phasen A–D. Deine frühere 5-Punkte-Liste (Types/Objekte/Anfragen-Filter/Freigabe/Templates) wird als Phase-D-Einträge einsortiert, kein paralleler Plan. Lösch-Regel und Feature-Paritäts-Regel gelten durchgehend.
```

---

## Resolver-Parität ohne Doppelwahrheit

- **Code:** je Repo eigene `resolveVorgang()`-Implementierung (kein Shared-Package).
- **Wahrheit für Tests:** eine JSON-Datei, beide Repos laden sie in CI.
- **Portal-only Tests:** `role-status`, `portal-resolve` bleiben in `handwerks-plattform/scripts/test-crm-vorgang-resolver.ts` — nicht in der Shared-JSON.

---

## Verwandte Docs

- [ORGANISATION_PORTAL_BACKEND.md](./ORGANISATION_PORTAL_BACKEND.md) — Portal-fertig, CRM-Handoff-Details
- [DESIGN_GAP_ANALYSE_PORTALE.md](./DESIGN_GAP_ANALYSE_PORTALE.md) — Portal-Design (P0-1 PortalShell)
- [WAVE_WHITELABEL_KOMMUNIKATION.md](./WAVE_WHITELABEL_KOMMUNIKATION.md) — WL-Wave Portal
