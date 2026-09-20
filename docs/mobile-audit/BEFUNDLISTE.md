# Mobile-Audit Phase A — Befundliste

**Stand:** 2026-09-20 · Geräte: iPhone 13, Pixel 7
**CRM:** https://staging--baerenwald-backend.netlify.app
**Portal:** https://staging--baerenwald.netlify.app

## Messung (Ziel später: beide = 0)

| Metrik | Ist | Ziel |
|--------|-----|------|
| `touch_zu_klein` | **194** | 0 |
| `horizontal_scroll` | **0** | 0 |
| Screens OK | 60/60 | — |

**Phase A = Befund.** Phase B Layout-Fixes umgesetzt 2026-09-20 (Touch/Sheets/Listen/Foto/Offline). Neu-Messung offen.


## Häufungen (Priorität Phase B)

| Muster | Typische Größe | Vorkommen (Samples) | Hinweis |
|--------|----------------|---------------------|---------|
| CRM Header **Konto** | 30×30 | systemweit | Touch-Ziel unter 44 px |
| CRM **Transaktionsdaten leeren** | ~198×32 | systemweit (Demo-Banner) | Höhe &lt; 44 |
| CRM Filter-Chips (Alle / Anfrage / …) | Höhe 40 | Listen Vorgänge/Kunden | knapp auf 44 |
| Portal Partner-Chrome | diverse &lt;44 | Partner-Sections | Icons/Nav |
| Portal Kunde Vorgänge/Profil | 8–9 Treffer | Pixel+iPhone | Icons/Actions |
| **horizontal_scroll** | — | **0** überall | ✅ bereits ok |

### Heuristik Truncation (ellipsis)
Vor allem CRM **Vorgänge**-Liste (Kundennamen/Titel) — passt zu Ziel „Listenkarten 2 Zeilen“.

### Noch nicht gemessen (manuell / Phase B)
- Felder hinter Tastatur (`visualViewport` / S7 Sheets)
- Safe-Area Aktionsleisten
- Bottom-Nav vs. Paginierung/FAB
- Foto-Upload Kompression/Fortschritt/Retry
- Speichern bei schwachem Netz + „Erneut versuchen“

---

## Kernscreens

### CRM (15)
- `01-dashboard` → `/`
- `02-vorgaenge` → `/vorgaenge`
- `03-anfragen` → `/anfragen`
- `04-angebote` → `/angebote`
- `05-auftraege` → `/auftraege`
- `06-rechnungen` → `/rechnungen`
- `07-kunden` → `/kunden`
- `08-handwerker` → `/handwerker`
- `09-partner` → `/partner`
- `10-kalender` → `/kalender`
- `11-mehr` → `/mehr`
- `12-einstellungen` → `/einstellungen`
- `13-anfrage-detail` → `/anfragen`
- `14-auftrag-detail` → `/auftraege`
- `15-kunde-detail` → `/kunden`

### Portal (15)
- `01-hv-uebersicht` (hv) → `/portal?section=uebersicht`
- `02-hv-vorgaenge` (hv) → `/portal?section=vorgaenge`
- `03-hv-objekte` (hv) → `/portal?section=objekte`
- `04-hv-leistungen` (hv) → `/portal?section=leistungen`
- `05-hv-profil` (hv) → `/portal?section=profil`
- `06-partner-uebersicht` (partner) → `/partner?section=uebersicht`
- `07-partner-vorgaenge` (partner) → `/partner?section=vorgaenge`
- `08-partner-auftraege` (partner) → `/partner?section=auftraege`
- `09-partner-anfragen` (partner) → `/partner?section=anfragen`
- `10-partner-profil` (partner) → `/partner?section=profil`
- `11-kunde-uebersicht` (kunde) → `/portal?section=uebersicht`
- `12-kunde-vorgaenge` (kunde) → `/portal?section=vorgaenge`
- `13-kunde-profil` (kunde) → `/portal?section=profil`
- `14-portal-login` (public) → `/portal/login`
- `15-partner-login` (public) → `/partner/login`

## Befunde je Screen

### crm/01-dashboard
- **iphone13**: touch<44: 4 · ![shot](docs/mobile-audit/screenshots/crm-iphone13-01-dashboard.png)
  - Samples: `button:Konto 30×30`, `button:Transaktionsdaten leeren 197.5×32.2`, `button:Marketing 92.1×30.2`, `button:Sichtbarkeit 106×30.2`
- **pixel7**: touch<44: 2 · ![shot](docs/mobile-audit/screenshots/crm-pixel7-01-dashboard.png)
  - Samples: `button:Konto 30×30`, `button:Transaktionsdaten leeren 197.5×32.2`

### crm/02-vorgaenge
- **iphone13**: touch<44: 6, ellipsis: 11 · ![shot](docs/mobile-audit/screenshots/crm-iphone13-02-vorgaenge.png)
  - Samples: `button:Konto 30×30`, `button:Transaktionsdaten leeren 197.5×32.2`, `button:Alle59 74×40`, `button:Anfrage19 122.5×40`, `button:Angebot15 126.5×40`
- **pixel7**: touch<44: 6, ellipsis: 10 · ![shot](docs/mobile-audit/screenshots/crm-pixel7-02-vorgaenge.png)
  - Samples: `button:Konto 30×30`, `button:Transaktionsdaten leeren 197.5×32.2`, `button:Alle59 74×40`, `button:Anfrage19 122.5×40`, `button:Angebot15 126.5×40`

### crm/03-anfragen
- **iphone13**: touch<44: 2 · ![shot](docs/mobile-audit/screenshots/crm-iphone13-03-anfragen.png)
  - Samples: `button:Konto 30×30`, `button:Transaktionsdaten leeren 197.5×32.2`
- **pixel7**: touch<44: 2 · ![shot](docs/mobile-audit/screenshots/crm-pixel7-03-anfragen.png)
  - Samples: `button:Konto 30×30`, `button:Transaktionsdaten leeren 197.5×32.2`

### crm/04-angebote
- **iphone13**: touch<44: 2 · ![shot](docs/mobile-audit/screenshots/crm-iphone13-04-angebote.png)
  - Samples: `button:Konto 30×30`, `button:Transaktionsdaten leeren 197.5×32.2`
- **pixel7**: touch<44: 2 · ![shot](docs/mobile-audit/screenshots/crm-pixel7-04-angebote.png)
  - Samples: `button:Konto 30×30`, `button:Transaktionsdaten leeren 197.5×32.2`

### crm/05-auftraege
- **iphone13**: touch<44: 2 · ![shot](docs/mobile-audit/screenshots/crm-iphone13-05-auftraege.png)
  - Samples: `button:Konto 30×30`, `button:Transaktionsdaten leeren 197.5×32.2`
- **pixel7**: touch<44: 2 · ![shot](docs/mobile-audit/screenshots/crm-pixel7-05-auftraege.png)
  - Samples: `button:Konto 30×30`, `button:Transaktionsdaten leeren 197.5×32.2`

### crm/06-rechnungen
- **iphone13**: touch<44: 2 · ![shot](docs/mobile-audit/screenshots/crm-iphone13-06-rechnungen.png)
  - Samples: `button:Konto 30×30`, `button:Transaktionsdaten leeren 197.5×32.2`
- **pixel7**: touch<44: 2 · ![shot](docs/mobile-audit/screenshots/crm-pixel7-06-rechnungen.png)
  - Samples: `button:Konto 30×30`, `button:Transaktionsdaten leeren 197.5×32.2`

### crm/07-kunden
- **iphone13**: touch<44: 6, ellipsis: 8 · ![shot](docs/mobile-audit/screenshots/crm-iphone13-07-kunden.png)
  - Samples: `button:Konto 30×30`, `button:Transaktionsdaten leeren 197.5×32.2`, `button:Alle44 74×40`, `button:Privat26 87.4×40`, `button:Hausverwaltung7 149.1×40`
- **pixel7**: touch<44: 6, ellipsis: 4 · ![shot](docs/mobile-audit/screenshots/crm-pixel7-07-kunden.png)
  - Samples: `button:Konto 30×30`, `button:Transaktionsdaten leeren 197.5×32.2`, `button:Alle45 74×40`, `button:Privat27 87.4×40`, `button:Hausverwaltung7 149.1×40`

### crm/08-handwerker
- **iphone13**: touch<44: 7, ellipsis: 4 · ![shot](docs/mobile-audit/screenshots/crm-iphone13-08-handwerker.png)
  - Samples: `button:Konto 30×30`, `button:Transaktionsdaten leeren 197.5×32.2`, `button:Alle Gewerke6 128×40`, `button:Sanitär 72×40`, `button:Elektrik 75×40`
- **pixel7**: touch<44: 7, ellipsis: 4 · ![shot](docs/mobile-audit/screenshots/crm-pixel7-08-handwerker.png)
  - Samples: `button:Konto 30×30`, `button:Transaktionsdaten leeren 197.5×32.2`, `button:Alle Gewerke6 128×40`, `button:Sanitär 72×40`, `button:Elektrik 75×40`

### crm/09-partner
- **iphone13**: touch<44: 2 · ![shot](docs/mobile-audit/screenshots/crm-iphone13-09-partner.png)
  - Samples: `button:Konto 30×30`, `button:Transaktionsdaten leeren 197.5×32.2`
- **pixel7**: touch<44: 2 · ![shot](docs/mobile-audit/screenshots/crm-pixel7-09-partner.png)
  - Samples: `button:Konto 30×30`, `button:Transaktionsdaten leeren 197.5×32.2`

### crm/10-kalender
- **iphone13**: touch<44: 5 · ![shot](docs/mobile-audit/screenshots/crm-iphone13-10-kalender.png)
  - Samples: `button:Konto 30×30`, `button:Transaktionsdaten leeren 197.5×32.2`, `button:Tag 99.3×40`, `button:Woche 99.3×40`, `button:Monat 99.3×40`
- **pixel7**: touch<44: 5 · ![shot](docs/mobile-audit/screenshots/crm-pixel7-10-kalender.png)
  - Samples: `button:Konto 30×30`, `button:Transaktionsdaten leeren 197.5×32.2`, `button:Tag 107×40`, `button:Woche 107×40`, `button:Monat 107×40`

### crm/11-mehr
- **iphone13**: touch<44: 2 · ![shot](docs/mobile-audit/screenshots/crm-iphone13-11-mehr.png)
  - Samples: `button:Konto 30×30`, `button:Transaktionsdaten leeren 197.5×32.2`
- **pixel7**: touch<44: 2 · ![shot](docs/mobile-audit/screenshots/crm-pixel7-11-mehr.png)
  - Samples: `button:Konto 30×30`, `button:Transaktionsdaten leeren 197.5×32.2`

### crm/12-einstellungen
- **iphone13**: touch<44: 2 · ![shot](docs/mobile-audit/screenshots/crm-iphone13-12-einstellungen.png)
  - Samples: `button:Konto 30×30`, `button:Transaktionsdaten leeren 197.5×32.2`
- **pixel7**: touch<44: 2 · ![shot](docs/mobile-audit/screenshots/crm-pixel7-12-einstellungen.png)
  - Samples: `button:Konto 30×30`, `button:Transaktionsdaten leeren 197.5×32.2`

### crm/13-anfrage-detail
- **iphone13**: touch<44: 2 · ![shot](docs/mobile-audit/screenshots/crm-iphone13-13-anfrage-detail.png)
  - Samples: `button:Konto 30×30`, `button:Transaktionsdaten leeren 197.5×32.2`
- **pixel7**: touch<44: 2 · ![shot](docs/mobile-audit/screenshots/crm-pixel7-13-anfrage-detail.png)
  - Samples: `button:Konto 30×30`, `button:Transaktionsdaten leeren 197.5×32.2`

### crm/14-auftrag-detail
- **iphone13**: touch<44: 2 · ![shot](docs/mobile-audit/screenshots/crm-iphone13-14-auftrag-detail.png)
  - Samples: `button:Konto 30×30`, `button:Transaktionsdaten leeren 197.5×32.2`
- **pixel7**: touch<44: 2 · ![shot](docs/mobile-audit/screenshots/crm-pixel7-14-auftrag-detail.png)
  - Samples: `button:Konto 30×30`, `button:Transaktionsdaten leeren 197.5×32.2`

### crm/15-kunde-detail
- **iphone13**: touch<44: 6, ellipsis: 8 · ![shot](docs/mobile-audit/screenshots/crm-iphone13-15-kunde-detail.png)
  - Samples: `button:Konto 30×30`, `button:Transaktionsdaten leeren 197.5×32.2`, `button:Alle44 74×40`, `button:Privat26 87.4×40`, `button:Hausverwaltung7 149.1×40`
- **pixel7**: touch<44: 6, ellipsis: 4 · ![shot](docs/mobile-audit/screenshots/crm-pixel7-15-kunde-detail.png)
  - Samples: `button:Konto 30×30`, `button:Transaktionsdaten leeren 197.5×32.2`, `button:Alle45 74×40`, `button:Privat27 87.4×40`, `button:Hausverwaltung7 149.1×40`

### portal/01-hv-uebersicht
- **iphone13**: ✅ keine Zähler-Treffer · ![shot](docs/mobile-audit/screenshots/portal-iphone13-01-hv-uebersicht.png)
- **pixel7**: touch<44: 1 · ![shot](docs/mobile-audit/screenshots/portal-pixel7-01-hv-uebersicht.png)
  - Samples: `a:Vergessen? 97.1×28`

### portal/02-hv-vorgaenge
- **iphone13**: ✅ keine Zähler-Treffer · ![shot](docs/mobile-audit/screenshots/portal-iphone13-02-hv-vorgaenge.png)
- **pixel7**: touch<44: 1 · ![shot](docs/mobile-audit/screenshots/portal-pixel7-02-hv-vorgaenge.png)
  - Samples: `a:Vergessen? 97.1×28`

### portal/03-hv-objekte
- **iphone13**: ✅ keine Zähler-Treffer · ![shot](docs/mobile-audit/screenshots/portal-iphone13-03-hv-objekte.png)
- **pixel7**: touch<44: 1 · ![shot](docs/mobile-audit/screenshots/portal-pixel7-03-hv-objekte.png)
  - Samples: `a:Vergessen? 97.1×28`

### portal/04-hv-leistungen
- **iphone13**: ✅ keine Zähler-Treffer · ![shot](docs/mobile-audit/screenshots/portal-iphone13-04-hv-leistungen.png)
- **pixel7**: touch<44: 1 · ![shot](docs/mobile-audit/screenshots/portal-pixel7-04-hv-leistungen.png)
  - Samples: `a:Vergessen? 97.1×28`

### portal/05-hv-profil
- **iphone13**: ✅ keine Zähler-Treffer · ![shot](docs/mobile-audit/screenshots/portal-iphone13-05-hv-profil.png)
- **pixel7**: touch<44: 1 · ![shot](docs/mobile-audit/screenshots/portal-pixel7-05-hv-profil.png)
  - Samples: `a:Vergessen? 97.1×28`

### portal/06-partner-uebersicht
- **iphone13**: touch<44: 4 · ![shot](docs/mobile-audit/screenshots/portal-iphone13-06-partner-uebersicht.png)
  - Samples: `button:Benachrichtigungen 38×38`, `button:Alle ansehen 93.1×24`, `a:Impressum 77×23.3`, `a:Datenschutz 88.2×23.3`
- **pixel7**: touch<44: 5, fixed-overlap: 1 · ![shot](docs/mobile-audit/screenshots/portal-pixel7-06-partner-uebersicht.png)
  - Samples: `button:Benachrichtigungen 38×38`, `button:Alle ansehen 93.1×24`, `a:Impressum 77×23.3`, `a:Datenschutz 88.2×23.3`, `button:Cookie-Einstellungen 148.4×23.3`

### portal/07-partner-vorgaenge
- **iphone13**: touch<44: 4 · ![shot](docs/mobile-audit/screenshots/portal-iphone13-07-partner-vorgaenge.png)
  - Samples: `button:Benachrichtigungen 38×38`, `button:Alle ansehen 93.1×24`, `a:Impressum 77×23.3`, `a:Datenschutz 88.2×23.3`
- **pixel7**: touch<44: 5, fixed-overlap: 1 · ![shot](docs/mobile-audit/screenshots/portal-pixel7-07-partner-vorgaenge.png)
  - Samples: `button:Benachrichtigungen 38×38`, `button:Alle ansehen 93.1×24`, `a:Impressum 77×23.3`, `a:Datenschutz 88.2×23.3`, `button:Cookie-Einstellungen 148.4×23.3`

### portal/08-partner-auftraege
- **iphone13**: touch<44: 4 · ![shot](docs/mobile-audit/screenshots/portal-iphone13-08-partner-auftraege.png)
  - Samples: `button:Benachrichtigungen 38×38`, `button:Alle ansehen 93.1×24`, `a:Impressum 77×23.3`, `a:Datenschutz 88.2×23.3`
- **pixel7**: touch<44: 5, fixed-overlap: 1 · ![shot](docs/mobile-audit/screenshots/portal-pixel7-08-partner-auftraege.png)
  - Samples: `button:Benachrichtigungen 38×38`, `button:Alle ansehen 93.1×24`, `a:Impressum 77×23.3`, `a:Datenschutz 88.2×23.3`, `button:Cookie-Einstellungen 148.4×23.3`

### portal/09-partner-anfragen
- **iphone13**: touch<44: 4 · ![shot](docs/mobile-audit/screenshots/portal-iphone13-09-partner-anfragen.png)
  - Samples: `button:Benachrichtigungen 38×38`, `button:Alle ansehen 93.1×24`, `a:Impressum 77×23.3`, `a:Datenschutz 88.2×23.3`
- **pixel7**: touch<44: 5, fixed-overlap: 1 · ![shot](docs/mobile-audit/screenshots/portal-pixel7-09-partner-anfragen.png)
  - Samples: `button:Benachrichtigungen 38×38`, `button:Alle ansehen 93.1×24`, `a:Impressum 77×23.3`, `a:Datenschutz 88.2×23.3`, `button:Cookie-Einstellungen 148.4×23.3`

### portal/10-partner-profil
- **iphone13**: touch<44: 4 · ![shot](docs/mobile-audit/screenshots/portal-iphone13-10-partner-profil.png)
  - Samples: `button:Benachrichtigungen 38×38`, `button:Alle ansehen 93.1×24`, `a:Impressum 77×23.3`, `a:Datenschutz 88.2×23.3`
- **pixel7**: touch<44: 5, fixed-overlap: 1 · ![shot](docs/mobile-audit/screenshots/portal-pixel7-10-partner-profil.png)
  - Samples: `button:Benachrichtigungen 38×38`, `button:Alle ansehen 93.1×24`, `a:Impressum 77×23.3`, `a:Datenschutz 88.2×23.3`, `button:Cookie-Einstellungen 148.4×23.3`

### portal/11-kunde-uebersicht
- **iphone13**: touch<44: 2 · ![shot](docs/mobile-audit/screenshots/portal-iphone13-11-kunde-uebersicht.png)
  - Samples: `button:Benachrichtigungen 38×38`, `button:Alle ansehen 93.1×24`
- **pixel7**: touch<44: 5, fixed-overlap: 1 · ![shot](docs/mobile-audit/screenshots/portal-pixel7-11-kunde-uebersicht.png)
  - Samples: `button:Benachrichtigungen 38×38`, `button:Alle ansehen 93.1×24`, `a:Impressum 77×23.3`, `a:Datenschutz 88.2×23.3`, `button:Cookie-Einstellungen 148.4×23.3`

### portal/12-kunde-vorgaenge
- **iphone13**: touch<44: 8, fixed-overlap: 1 · ![shot](docs/mobile-audit/screenshots/portal-iphone13-12-kunde-vorgaenge.png)
  - Samples: `button:Benachrichtigungen 38×38`, `button:Alle 57.5×41.3`, `button:Offen 70.9×41.3`, `button:In Arbeit 92×41.3`, `button:Erledigt 86.7×41.3`
- **pixel7**: touch<44: 8, fixed-overlap: 1 · ![shot](docs/mobile-audit/screenshots/portal-pixel7-12-kunde-vorgaenge.png)
  - Samples: `button:Benachrichtigungen 38×38`, `button:Alle 57.5×41.3`, `button:Offen 70.9×41.3`, `button:In Arbeit 92×41.3`, `button:Erledigt 86.7×41.3`

### portal/13-kunde-profil
- **iphone13**: touch<44: 9, fixed-overlap: 1 · ![shot](docs/mobile-audit/screenshots/portal-iphone13-13-kunde-profil.png)
  - Samples: `button:Benachrichtigungen 38×38`, `button:Profil 68.5×41.3`, `button:Benachrichtigungen 177.1×41.3`, `button:Profil bearbeiten 36×36`, `button:Passwort ändern 149.9×38`
- **pixel7**: touch<44: 9, fixed-overlap: 1 · ![shot](docs/mobile-audit/screenshots/portal-pixel7-13-kunde-profil.png)
  - Samples: `button:Benachrichtigungen 38×38`, `button:Profil 68.5×41.3`, `button:Benachrichtigungen 177.1×41.3`, `button:Profil bearbeiten 36×36`, `button:Passwort ändern 149.9×38`

### portal/14-portal-login
- **iphone13**: ✅ keine Zähler-Treffer · ![shot](docs/mobile-audit/screenshots/portal-iphone13-14-portal-login.png)
- **pixel7**: touch<44: 1 · ![shot](docs/mobile-audit/screenshots/portal-pixel7-14-portal-login.png)
  - Samples: `a:Vergessen? 97.1×28`

### portal/15-partner-login
- **iphone13**: ✅ keine Zähler-Treffer · ![shot](docs/mobile-audit/screenshots/portal-iphone13-15-partner-login.png)
- **pixel7**: ✅ keine Zähler-Treffer · ![shot](docs/mobile-audit/screenshots/portal-pixel7-15-partner-login.png)

## Offene Punkte für Freigabe (Phase B+)

1. Touch-Ziele ≥ 44 px (Buttons/Icons/Checkboxen) — Priorität nach Samples.
2. Sheets: `visualViewport` (S7) überall.
3. Aktionsleisten + Safe-Area; Bottom-Nav ohne Overlap Paginierung/FAB.
4. Listenkarten: Kundennamen max. 2 Zeilen, nicht abschneiden ohne Hinweis.
5. Foto-Upload: Kompression, Fortschritt, Retry.
6. Schwaches Netz: Speichern → Fehler + „Erneut versuchen“, Formular behalten (UX-2).

## Skript

```bash
node scripts/mobile-audit-playwright.mjs
# JSON: docs/mobile-audit/json/latest.json
```

**STOPP Phase A.**