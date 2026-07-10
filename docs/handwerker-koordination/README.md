# Handwerker-Koordination — Dokumentation (Partner-Portal)

**Stand:** Juni 2026  
**Repo:** `handwerks-plattform` (`baerenwaldmuenchen.de/partner`)  
**CRM-Pendant:** `baerenwald-crm-dashboard/docs/handwerker-koordination/`

Dieser Ordner beschreibt den **kompletten Koordinationsprozess aus Sicht des Partner-Portals** — ergänzend zur CRM-Doku, mit korrekter Tab-/Badge-Logik und Code-Referenzen.

---

## Dateien in diesem Ordner

| Datei | Zielgruppe | Inhalt |
|-------|------------|--------|
| [HANDWERKER_KOORDINATION_PROZESS.md](./HANDWERKER_KOORDINATION_PROZESS.md) | Koordination, Dev | Gesamtprozess Schritt 0–10, Status-Matrix **Portal-Tab**, Mermaid, APIs |
| [HANDWERKER_KOORDINATION_PORTAL_UI.md](./HANDWERKER_KOORDINATION_PORTAL_UI.md) | Koordination, UX | Was der Handwerker wo sieht, Badges, Filter „Offen“, Nachreichung |

---

## Verwandte Portal-Docs

| Datei | Inhalt |
|-------|--------|
| [PARTNER_PORTAL_PHASEN.md](../PARTNER_PORTAL_PHASEN.md) | Kurzreferenz Phasen-Logik + API-Listen |
| [KONDITIONEN_CRM_HANDOFF.md](../KONDITIONEN_CRM_HANDOFF.md) | `hw_konditionen`, SQL, CRM-Übernehmen |
| [PARTNER_CRM_NOTIFY_API.md](../PARTNER_CRM_NOTIFY_API.md) | Notify-Endpoints CRM → Website |

---

## CRM-Docs (andere Repo)

| Datei | Inhalt |
|-------|--------|
| `HANDWERKER_KOORDINATION_PROZESS.md` | Prozess inkl. CRM-Ort je Schritt |
| `HANDWERKER_KOORDINATION_UI_ANALYSE.md` | CRM-UI Redesign v2, Accordion-Problem |
| `ui-referenz.html` | Statische CRM-Positions-UI v2 |

---

## Wichtigste Abweichung CRM ↔ Portal (häufige Verwechslung)

| Begriff / Status | Bedeutung |
|------------------|-----------|
| `angebot_handwerker.status = akzeptiert` | Partner hat die **Zuweisung** angenommen — **nicht** „Preise final OK“ |
| `hw_status = uebernommen` | Preise sind **verbindlich** bestätigt |
| Tab **Angebote** | Erst ab `hw_status = uebernommen` (PDF, Vertrag, Auftragsfreigabe) |
| Tab **Anfragen** | Zu-/Absage, **gesamte** Konditionen-Runde bis `uebernommen`, plus Nachreichung |

Die CRM-Prozess-Doku nennt teils „nach Annahme → Angebote“ — im Portal bleibt der Vorgang bis `uebernommen` unter **Anfragen** (Preise festlegen, bestätigen, neue Runde).
