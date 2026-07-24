# MeinBärenwald — Menü-Phasen (Kundenportal)

Logik: `src/lib/portal/portal-pipeline.ts` → `splitKundePortalPipeline()`  

Deep-Links: `src/lib/portal/portal-site-url.ts` — `PortalClient` reagiert auf `?section=anfragen|angebote|auftraege&id=…` (mit `Suspense` in `portal/page.tsx`).

Daten: `src/lib/portal/get-portal-data.ts`

## Regeln (datengetrieben)

| Menü | Inhalt |
|------|--------|
| **Anfragen** | Leads ohne Angebot und ohne Auftrag |
| **Angebote** | Angebote, zu denen noch kein Auftrag existiert |
| **Aufträge** | Alle Aufträge des Kunden (`offen`, `in_arbeit`, `abgeschlossen`, …; nicht `storniert`) |

## Aufträge laden (Supabase)

Ein Auftrag wird gefunden über:

1. `auftraege.kunde_id` = Portal-Kunde  
2. `auftraege.lead_id` ∈ Leads des Kunden  
3. `auftraege.angebot_id` ∈ Angebote des Kunden (per Lead oder `angebote.kunde_id`)

**Wichtig:** Select nur existierende Spalten (`phasen` / `budget` brachen die Abfrage → leere Auftragsliste).

## Bautagebuch

Tabelle: `auftrag_bautagebuch_eintraege`, nur `fuer_kunde_freigegeben = true`.

## Frontend

`PortalClient` nutzt die vom Server gefilterten Arrays — kein erneutes Ausblenden von Aufträgen mit Status `offen`.
