# Portal UX-Stand — Mobile App vs. Desktop Portal

Stand: Juli 2026 · nach Surface-Welle + offenen Todos

## Zielbild (Nordstern)

| | **Mobile** | **Desktop** |
|--|------------|-------------|
| Gefühl | Field-/Kunden-**App** | klares Self-Service-**Portal** |
| Nav | ≤4 Tabs; Detail ohne Bottom-Nav | Sidebar 3–5 Ziele |
| Overlay | Bottom Sheet / Fullscreen Funnel | Side-Over (Edit) · Center (Confirm/Funnel) |
| Listen | große Targets; Filter = Sheet | Chips / Tabelle |
| Primary | eine Sticky-Aktion | eine Primary im Header/Sticky |

## Was jetzt State-of-the-Art ist ✅

| Muster | Status |
|--------|--------|
| Mobil Sheet / Desktop Side-Over (`edit`/`preview`) | live |
| Confirm & ⋯ als ActionSheet | live |
| Dirty-Confirm + Browser-Back schließt Overlay | live |
| Detail: Bottom-Nav aus (`hideMobileChrome`) | live |
| Filter mobil = Sheet, Desktop = Chips | live (Kunde/Partner/HV) |
| Partner Termin/Rückfrage verdrahtet (Sheet-CTAs) | live |
| Planer vom Dashboard erreichbar | live |
| Kunde Angebot ablehnen | live |
| Success-Toast grüner Fill | live |
| Kurze Primary-Copy (HV Freigeben/Annehmen/Abnehmen) | live |

## Noch nicht „App-perfekt“ (nächste Welle)

| Lücke | Warum | Empfohlene Aktion |
|-------|--------|-------------------|
| Inbox-first Dashboard | Charts/KPIs vor To-dos (`P2-10`) | „Heute“-Liste über KPI-Kacheln |
| Partner Bottom-Nav ohne Planer | Planer nur Dashboard-Kachel | optional 4. Tab oder Mehr-Menü |
| Primary-Matrix Screen-Audit | Banner können noch mit Sticky konkurrieren | HV/Partner Detail Banner vs. Sticky spot-checken |
| Copy Rest | längere Hints in Sections | screenweise ≤ 12 Wörter |
| Offline / Pull-to-refresh | Field-Apps oft nativ | später |
| Segment-Tabs vs. Chip-Look Desktop | Chips ok für Portal | belassen |

## Kurzfazit

**Mobile:** Kern-Chrome und Surfaces verhalten sich wie moderne Apps (eine Action-Leiste, Sheets, Daumen-Filter, Back fängt Overlay).  
**Desktop:** Side-Over + klare Primaries + Sidebar wirken wie bedienbare B2B-/Kundenportale — nicht wie ein geschrumpftes Admin-CRM.

Größter restlicher Hebel für „fühlt sich fertig an“: **Inbox-first** (`P2-10`) und Banner-Aufräumen am Detail.
