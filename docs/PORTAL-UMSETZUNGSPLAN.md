# Portal Umsetzungsplan — Außen → Innen

**Quelle:** [`docs/PORTAL-ALLTAG-AUDIT.md`](./PORTAL-ALLTAG-AUDIT.md)  
**Nordstern:** Desktop = klares Self-Service-/B2B-Portal · Mobile = **App** (gesamter Nutzungsumfang, Job-Parität, keine Pixel-Kopie).

**Surfaces (getrennt halten):** Kundenportal `/portal` · Partner `/partner` · Melde `/melden` · Auth · Admin `crm-enter`.

**Pflichtformat für jedes To-do (immer):**

| Spalte | Inhalt |
|--------|--------|
| **Markt** | Praxisbeispiel: wie gute Kunden-/Handwerker-Portale oder Field-Apps das lösen |
| **Wir heute** | IST im Code/UX |
| **Wir wollen** | SOLL-Verhalten |
| **Vergleich** | Eine Zeile: Abstand Markt ↔ heute → Änderung |
| **FE / BE** | Technische Umsetzung |
| **Abnahme** | Prüfkriterium Desktop **und** Mobile |

---

## Nordstern (Tabelle)

| Job | Desktop-Portal | Mobile-App |
|-----|----------------|------------|
| **Nav** | Sidebar 3–5 klare Ziele | ≤4 Tabs; HV: Mehr-Kacheln; Inbox/To-do first |
| **Listen** | Cards/Tabelle + Filter-Chips | Zeilen, große Targets; Filter = **Sheet** |
| **Detail** | Breite Stack + Sticky optional | Fullscreen; **eine** Action-Leiste; BottomNav aus oder zurück |
| **Erstellen** | Sidebar „+ …“ | FAB / Sheet-Wizard |
| **Bearbeiten** | Inline/Sections | Sheet oder Fullscreen-Editor |
| **Wizards** | Modal/Panel ok | Fullscreen Steps, großer Primary |
| **⋯-Menüs** | Popover ok | **Bottom-Sheet** (kein Desktop-Popover) |
| **Inbox** | Dashboard-Zone „Heute“ | Tab oder erste Viewport = To-dos |
| **Docs** | Viewer/Tabelle | Sheet/Fullscreen Viewer |
| **Suche** | Header | Header; Ergebnisse fullscreen |

Eine Codebase, zwei Nutzungsmodi. Spec-SoT: dieses Dokument + Audit; ergänzend `DESIGN_GAP_ANALYSE_PORTALE.md` (Product-Entscheidungen).  
**Surface-Kit:** [`PORTAL-SURFACE-OPTIMIERUNG.md`](./PORTAL-SURFACE-OPTIMIERUNG.md) · [`PORTAL-INTERAKTIONS-KIT.md`](./PORTAL-INTERAKTIONS-KIT.md) · [`PORTAL-PRIMARY-MATRIX.md`](./PORTAL-PRIMARY-MATRIX.md) · [`PORTAL-UX-STAND.md`](./PORTAL-UX-STAND.md)

---

## Block-Reihenfolge

| Block | Fokus | IDs |
|-------|-------|-----|
| A | Fundament Breakpoint / Jobs-Spec | P8-05, P8-01 |
| B | Shell / Chrome / Sheets | P2-04, P8-02, P1-02 |
| C | Detail-Orientierung / Primary | P3-08, P3-04, P3-06, P2-09, P1-08 |
| D | Kern-Portal-Flows | P2-01, P2-05, P2-02, P2-03, P1-05, P1-09 |
| E | Docs / Geld | P3-02 |
| F | Alltag / Orphans / Naming | P1-01, P1-06, P1-07, P2-07, P2-08, P4-03 |
| G | Inbox / Notifications | P2-10, P2-06 |
| H | Suche / Wiederfinden / Deep-Links | P1-03, P1-04, P6-08 |
| I | Flow-Katalog / Copy / Status-SoT | P8-03, P5-05, P3-07 |
| J | Optional / groß | P3-01, P3-03, P3-05, P4-01, P4-04, P5-02 |

---

# Block A — Fundament

## P8-05 — Desktop≠Mobile Jobs spezifizieren

| | |
|--|--|
| **Markt** | Field-Apps und Kundenportale trennen explizit: Mobile = To-do + Doku; Desktop = Übersicht + Verwaltung. |
| **Wir heute** | Eine Shell, Inhalte fast 1:1; keine Job-Matrix. |
| **Wir wollen** | Kurzes `docs/PORTAL-MOBILE-DESKTOP.md` (oder Abschnitt hier als SoT): pro Surface Desktop-Job vs. Mobile-Job. |
| **Vergleich** | Markt entscheidet bewusst; wir adaptieren Desktop → Spec schreiben. |

**FE:** Doc anlegen/linken aus Audit. **BE:** —.  
**Abnahme:** Spec reviewt; jedes Portal-PR nennt Desktop-Job / Mobile-Job.

## P8-01 — Ein Breakpoint-SoT Portal

| | |
|--|--|
| **Markt** | Ein Cutoff (häufig 768): darunter App-Chrome, darüber Desktop. |
| **Wir heute** | Shell/UI stark an **`lg` = 1024**; Funnel/Marketing teils **860 / 1023** → Tablet-Grauzone. |
| **Wir wollen** | Ein Token (Empfehlung: App-Chrome `<768` **oder** bewusst `1024` dokumentieren) in CSS + Tailwind + Hook; Funnel aligned. |
| **Vergleich** | Markt = eine Regel; wir = mehrere → vereinheitlichen oder bewusst dokumentieren. |

**FE:** `globals.css` portal-shell, `PortalShell.tsx`, `funnel-ui.css`, optional `breakpoints.ts` / `useIsPortalMobile`. **BE:** —.  
**Abnahme:** Bei Cutoff−1 und Cutoff+1 BottomNav und Sidebar korrekt; kein „halbes“ Layout.

**Danach Block A:** Zielbild schriftlich; Breakpoint klar.

---

# Block B — Shell, Chrome, Sheets

## P2-04 — Eine Action-Leiste; Detail-Sheet-Pattern

| | |
|--|--|
| **Markt** | App: Detail öffnen → Tabbar weg oder nur Back; eine sticky Primary. Optional Detail als Sheet. |
| **Wir heute** | BottomNav + `PortalDetailStickyActions` gleichzeitig; `PortalMobileBottomSheet` **tot**; Liste Fullscreen-Replace; `_mobileDetailOpen` ungenutzt. |
| **Wir wollen** | Mobil im Detail: **eine** Leiste; Sheet verdrahten **oder** löschen + Back-Stack spezifizieren. |
| **Vergleich** | Markt = App-Chrome; wir = Desktop-Fuß doppelt. |

**FE:** `PortalShell.tsx` (hide mobile nav when detail), `PortalMobileBottomSheet.tsx`, `PortalClient.tsx`, `PartnerClient.tsx`, `EigentuemerPortalClient.tsx`, `PortalDetailUi.tsx`. **BE:** —.  
**Abnahme Desktop:** Sticky/Kopf wie Portal. **Mobile:** nur eine Action-Leiste; Zurück klar.

## P8-02 — Interaktions-Kit (Sheet vs Popover)

| | |
|--|--|
| **Markt** | Mobil: Filter/⋯/Bestätigen = Bottom-Sheet; Desktop: Popover/Modal. |
| **Wir heute** | Sheet-Komponente ungenutzt; Partner Leistungs-Sheet existiert lokal; kein Kit. |
| **Wir wollen** | Regel: ≤Breakpoint → Sheet für ⋯, Filter, Bestätigen; Modal→Sheet. |
| **Vergleich** | Markt lernt 1×; wir pro Screen. |

**FE:** Kit-Kurzdoc + `PortalMobileBottomSheet` als Standard; Partner Sheets angleichen. **BE:** —.  
**Abnahme:** Stichprobe Kunde-Liste, HV-Eingang, Partner-Auftrag — gleiches Muster.

## P1-02 — Servicepakete-Label vereinheitlichen

| | |
|--|--|
| **Markt** | Ein Nav-Name Desktop und Mobile. |
| **Wir heute** | „Servicepakete“ vs. „Serviceabos“. |
| **Wir wollen** | Ein Label (Empfehlung: Servicepakete). |
| **Vergleich** | Markt konsistent; wir zwei Wörter → eines. |

**FE:** `nav-items.ts` `PORTAL_HV_MEHR_TILES`, `OrganisationMehrScreen.tsx`. **BE:** —.  
**Abnahme:** Sidebar = Mehr-Kachel Text.

**Danach Block B:** Mobile-Chrome app-artig; Labels konsistent.

---

# Block C — Detail-Orientierung & Primary

## P3-08 — Status → Primary / Banner-Matrix

| | |
|--|--|
| **Markt** | Deal/Case zeigt eine klare Primary je Stage. |
| **Wir heute** | Banner + Sticky + Section-CTAs; Freigabe und Annehmen konkurrieren. |
| **Wir wollen** | Tabelle Status×Rolle→Primary/Secondary; Banner nur wenn ≠ Primary. |
| **Vergleich** | Markt eine Stimme; wir mehrere → Matrix. |

**FE:** `OrganisationHvVorgangDetail.tsx`, `hv-detail.ts`, `hv-liste.ts`, Partner Detail-CTAs. **BE:** —.  
**Abnahme:** Je 3 Status HV/Kunde/Partner: genau eine Primary sichtbar.

## P3-06 — Freigabe ≠ Annehmen Coach

| | |
|--|--|
| **Markt** | Erste Nutzung: kurzer Hinweis, dann still. |
| **Wir heute** | Banner-Text erklärt; kein einmaliger Coach. |
| **Wir wollen** | Einmalige Erklärung am CTA oder Onboarding-Slide. |
| **Vergleich** | Markt onboarding; wir Dauer-Banner-Noise → Coach. |

**FE:** `ORG_ONBOARDING_SLIDES` / Inline Coach; Banner kürzen. **BE:** localStorage flag ok.  
**Abnahme:** Neu-User versteht Unterschied; Repeat ohne Nerv-Banner.

## P3-04 — Partner Timeline im Detail

| | |
|--|--|
| **Markt** | Auftrag zeigt Stage-Pfad (angenommen→Doku→Abnahme→RE). |
| **Wir heute** | `HW_AUFTRAG_TIMELINE` Copy ohne UI; Timeline eher HV. |
| **Wir wollen** | `VorgangTimeline` oder Strip in `PartnerAuftragDetail`. |
| **Vergleich** | Markt Orientierung; wir nur Pill → Strip. |

**FE:** `PartnerAuftragDetail.tsx`, `hw-auftrag-detail.ts`, `VorgangTimeline`. **BE:** —.  
**Abnahme:** Desktop + Mobile Strip sichtbar und statuskorrekt.

## P2-09 — VorgangDetailBlocks in Durchführung

| | |
|--|--|
| **Markt** | Gleiche Objekt/Kontakt-Infos in Anfrage und Auftrag. |
| **Wir heute** | Blocks in Offen/Anfrage; Durchführung = Einsatz-Card. |
| **Wir wollen** | Gleiche Sight-Matrix (`buildPartnerVorgangDetailVm`). |
| **Vergleich** | Markt Parität; wir Bruch → angleichen. |

**FE:** `PartnerAuftragDetail.tsx`, `build-vorgang-detail-vm.ts`. **BE:** Lead-Felder bereits in Embed.  
**Abnahme:** Kontakt vor Ort / Adresse in Durchführung = Offen.

## P1-08 — HV-Banner Partner-Auftrag

| | |
|--|--|
| **Markt** | Field-Apps kennzeichnen Property-Manager-Jobs klar. |
| **Wir heute** | Kein Banner bei `hv_meldung_status` in Durchführung. |
| **Wir wollen** | Amber-Hinweis „Im Auftrag der Hausverwaltung…“. |
| **Vergleich** | Markt Kontext; wir fehlend → Banner. |

**FE:** `PartnerAuftragDetail.tsx`. **BE:** —.  
**Abnahme:** HV-Lead zeigt Banner; Privat-Lead nicht.

**Danach Block C:** Detail sagt „wo bin ich“ und „was jetzt“.

---

# Block D — Kern-Portal-Flows

## P2-01 — Termine / Rückfrage verdrahten

| | |
|--|--|
| **Markt** | Handwerker-App: Termin vorschlagen → Kunde/Mieter bestätigt. |
| **Wir heute** | `PartnerTermineRueckfrageSection` + Actions existieren, **kein Import**. |
| **Wir wollen** | Section in Auftragsdetail; Erfolg stoßen Mieter-Status. |
| **Vergleich** | Markt Kernjob; wir tot → verdrahten. |

**FE:** `PartnerAuftragDetail.tsx`, `PartnerTermineRueckfrageSection.tsx`. **BE:** bestehende Termin/Rückfrage-Actions; ggf. Notify.  
**Abnahme Desktop:** Section nutzbar. **Mobile:** große Buttons, Sheet ok.

## P2-05 — Angebot ablehnen (Kunde)

| | |
|--|--|
| **Markt** | Kundenportal: Annehmen **und** Ablehnen mit Grund. |
| **Wir heute** | Nur `acceptKundeAngebot`. |
| **Wir wollen** | `rejectKundeAngebot` + UI + CRM-Status. |
| **Vergleich** | Markt Abbruchpfad; wir Telefon → Action. |

**FE:** Detail-CTAs. **BE:** `src/app/actions/portal-angebot.ts` + Timeline/Status.  
**Abnahme:** Ablehnen setzt Status; Desktop+Mobile Confirm-Dialog.

## P2-02 — Planer findbar

| | |
|--|--|
| **Markt** | Kalender/To-dos in Nav oder Home. |
| **Wir heute** | `?section=planer` ohne Nav; Onboarding nennt Planer. |
| **Wir wollen** | Start-Kachel oder Nav-Eintrag. |
| **Vergleich** | Markt discoverable; wir URL-only → Nav. |

**FE:** `PartnerClient.tsx`, `nav-items.ts` oder Dashboard-Kachel; Onboarding sync. **BE:** —.  
**Abnahme:** Planer in ≤2 Taps von Start.

## P2-03 — Mieter-IA: verdrahten oder streichen

| | |
|--|--|
| **Markt** | Entweder Token-Status **oder** echtes Mieter-Konto mit klarer IA. |
| **Wir heute** | Spec-Nav `mieter` tot; Live oft Privat-Shell; Gap-Doc sagt HV-Mieter-Login streichen; E4 Einladung existiert. |
| **Wir wollen** | **PO-Entscheid** dokumentieren; Code daran ausrichten (Nav+Settings **oder** Einladung/Login-Mieter entfernen). |
| **Vergleich** | Markt eine Story; wir zwei → entscheiden. |

**FE:** `nav-items.ts`, `PortalClient.tsx`, `PortalEinstellungenMieter.tsx`, Gap-Doc Update. **BE:** Einladungen nur wenn Go.  
**Abnahme:** Keine Spec/Live-Lüge mehr; ein dokumentierter Weg.

## P1-05 — Melde-Fehler Fallback

| | |
|--|--|
| **Markt** | Fehler → zurück in denselben Flow. |
| **Wir heute** | CTA kann nach `/` führen. |
| **Wir wollen** | `/melden/{org}`. |
| **Vergleich** | Markt rettet Flow; wir wirft raus → Fix. |

**FE:** `MeldeFehlerClient.tsx`, `melden/fehler/page.tsx`. **BE:** —.  
**Abnahme:** Fehler mobil/desktop landet in Melde-Root.

## P1-09 — Aushang-Copy vs. Bestätigung

| | |
|--|--|
| **Markt** | QR-Poster versprechen nur, was der Flow hält. |
| **Wir heute** | Aushang „Bestätigung“ vs. „keine E-Mail“. |
| **Wir wollen** | Aushang: Status-Link/QR; keine Mail-Versprechen. |
| **Vergleich** | Markt ehrlich; wir widersprüchlich → Copy. |

**FE:** `aushang.ts`, PDF-Generator, `mieter-wl.ts`. **BE:** —.  
**Abnahme:** Texte aligned; Stichprobe PDF.

**Danach Block D:** Kernjobs (Termin, Ablehnen, Melde-Rettung) nutzbar.

---

# Block E — Docs / Geld

## P3-02 — Rechnung: klarer Zahlweg

| | |
|--|--|
| **Markt** | Portal zeigt „Jetzt zahlen“ (Payment) **oder** IBAN + Verwendungszweck + Status. |
| **Wir heute** | *„Überweisung veranlassen ist im Portal noch nicht angebunden.“* |
| **Wir wollen** | Mindest: Anleitung + Status; oder Payment-Integration (PO). |
| **Vergleich** | Markt schließt Geld ab; wir Dead-End → Anleitung/Payment. |

**FE:** `hv-detail.ts`, Detail-UI Rechnung. **BE:** optional Payment-Provider / bestehende RE-Felder.  
**Abnahme:** Nutzer weiß nächsten Zahlschritt Desktop+Mobile.

**Danach Block E:** Kein finanzieller Blindflug.

---

# Block F — Alltag, Orphans, Naming

## P1-01 — Privat-Empty Copy

| | |
|--|--|
| **Markt** | Empty = „Erste Anfrage“ / Create-CTA. |
| **Wir heute** | Mieter/Verwaltung-Text für Privat. |
| **Wir wollen** | `role=kunde`/`gewerbe` eigene Subtitle. |
| **Vergleich** | Markt passend; wir falsch → Copy. |

**FE:** `PortalClient.tsx`, `portal-states.ts`. **BE:** —.  
**Abnahme:** Privat-Empty ohne „Verwaltung“.

## P1-06 — Anrede-Policy

| | |
|--|--|
| **Markt** | Eine Anrede pro Produktfläche. |
| **Wir heute** | Sie-Login, Du-Partner, Du-Admin-Banner. |
| **Wir wollen** | Policy: WL-Mieter Sie; Partner Du; Auth je Surface. |
| **Vergleich** | Markt konsistent; wir Mix → Policy + Sweep. |

**FE:** `auth.ts`, Forms, `AdminViewBanner`, Sticky-Copy, Toasts. **BE:** —.  
**Abnahme:** Checkliste 10 Strings ohne Bruch.

## P1-07 — OAuth-Geister entfernen

| | |
|--|--|
| **Markt** | SSO-Buttons nur wenn live. |
| **Wir heute** | Strings ohne UI. |
| **Wir wollen** | Entfernen (oder später echtes OAuth = anderes Ticket). |
| **Vergleich** | Markt keine Geister; wir aufräumen. |

**FE:** `auth.ts`. **BE:** —.  
**Abnahme:** Keine Google/Microsoft-Erwähnung ohne Button.

## P2-07 — Naming Partner in UI

| | |
|--|--|
| **Markt** | Ein Nutzerbegriff nach außen. |
| **Wir heute** | „Partner-Portal“ + Eyebrow „Handwerker“. |
| **Wir wollen** | UI „Partner“; DB `handwerker` ok. |
| **Vergleich** | Markt ein Name; wir zwei → UI glätten. |

**FE:** `PartnerClient`, Listen-Chrome, Mail-Templates Partner. **BE:** Mail-Copy.  
**Abnahme:** Kein „Handwerker“-Eyebrow in Partner-UI (außer PO will bewusst).

## P2-08 — Glocke-Links

| | |
|--|--|
| **Markt** | Notification → richtiger Screen. |
| **Wir heute** | Legacy `section=auftraege`. |
| **Wir wollen** | `vorgaenge` + Filter. |
| **Vergleich** | Markt deep-link clean; wir Redirect → direct. |

**FE:** Partner notification href builder. **BE:** —.  
**Abnahme:** Klick öffnet Vorgänge ohne Legacy-Hop.

## P4-03 — Ein Kunde-Detail-Pfad

| | |
|--|--|
| **Markt** | Ein Record-Detail. |
| **Wir heute** | `OrganisationHvVorgangDetail` + Legacy `PortalVorgangDetail`-Annehmen. |
| **Wir wollen** | Ein Pfad; Legacy löschen/flaggen. |
| **Vergleich** | Markt eine Codepath; wir zwei → konsolidieren. |

**FE:** `PortalVorgangDetail.tsx`, `PortalClient.tsx`. **BE:** Actions bleiben.  
**Abnahme:** Annehmen nur noch über einen UI-Pfad.

**Danach Block F:** Weniger Orphans und Naming-Noise.

---

# Block G — Inbox & Notifications

## P2-10 — Inbox-first Dashboards

| | |
|--|--|
| **Markt** | Home = „Heute erledigen“ (5–8 Zeilen), KPIs darunter. |
| **Wir heute** | KPI-first (`kunde-dashboard`, `hv-dashboard`, Partner Start). |
| **Wir wollen** | Zone „Heute“ oben (Annehmen, Freigabe, Offen, Termin). |
| **Vergleich** | Markt Arbeit; wir Reporting-Feeling → Inbox. |

**FE:** Dashboard-Komponenten + Mapper. **BE:** ggf. Aggregationen existing data.  
**Abnahme:** Mobile erste Viewport = Handlungen; Desktop ebenso.

## P2-06 — Notifications befüllen

| | |
|--|--|
| **Markt** | In-App-Glocke für Kernereignisse. |
| **Wir heute** | Glocke UI; Events oft leer. |
| **Wir wollen** | Create bei Freigabe, Zuweisung, Termin, Rechnung, Ablehnung. |
| **Vergleich** | Markt lebendig; wir tot → Events. |

**FE:** Bell-Clients. **BE:** `create-portal-notification.ts`, Hooks in Actions/APIs.  
**Abnahme:** Nach Test-Aktion erscheint Eintrag; Deep-Link funktioniert.

**Danach Block G:** „Was heute?“ ohne E-Mail-Zwang.

---

# Block H — Suche & Wiederfinden

## P1-03 — Deep-Links kanonisch

| | |
|--|--|
| **Markt** | Eine URL-Form in allen Mails. |
| **Wir heute** | `freigabe` vs `vorgaenge`. |
| **Wir wollen** | Kanonisch `section=vorgaenge&id=`; optional Query `focus=`. |
| **Vergleich** | Markt eine Form; wir zwei → eine. |

**FE/BE:** Mail-Templates + API `portalPath` Builder zentral (`portal-site-url.ts`).  
**Abnahme:** Alle neuen Mails gleicher Path; Alias darf bleiben.

## P1-04 — crm_enter Login-Hints

| | |
|--|--|
| **Markt** | Fehler der Impersonation sichtbar. |
| **Wir heute** | Query ohne UI. |
| **Wir wollen** | Hinweistexte. |
| **Vergleich** | Markt feedback; wir stumm → Hints. |

**FE:** `PortalLoginForm.tsx`, `auth.ts`. **BE:** `crm-enter/route.ts` unverändert ok.  
**Abnahme:** invalid/failed zeigt Meldung.

## P6-08 — Suche stärken

| | |
|--|--|
| **Markt** | Suche findet Vorgang nach Titel/Ref/Adresse. |
| **Wir heute** | Header-Search vorhanden; Tiefe unklar. |
| **Wir wollen** | Mindestens Titel + Kurz-ID + Status; leere States klar. |
| **Vergleich** | Markt Wiederfinden; wir schwach → erweitern. |

**FE:** `PortalHeaderSearch` + Client-Filter. **BE:** optional.  
**Abnahme:** 3 Stichproben Desktop+Mobile finden Datensatz.

**Danach Block H:** Mail und Suche landen zuverlässig.

---

# Block I — Flows, Copy, Status-SoT

## P8-03 — Flow-Katalog + Copy-SoT

| | |
|--|--|
| **Markt** | Ein Weg pro Job; Glossar. |
| **Wir heute** | Mehrere CTAs/Mails/Nav-Namen. |
| **Wir wollen** | Katalog: Job → Screen → Primary; Glossar Partner/Freigabe/… |
| **Vergleich** | Markt lernt 1×; wir Katalog. |

**FE:** Doc `docs/PORTAL-FLOW-KATALOG.md` (oder Abschnitt). **BE:** —.  
**Abnahme:** Review; neue Features referenzieren Katalog.

## P5-05 — role-status UI durchziehen

| | |
|--|--|
| **Markt** | Ein Statusmodell, rollenspezifische Labels. |
| **Wir heute** | Mapping dokumentiert; UI teils Legacy-Labels. |
| **Wir wollen** | Chips/Timeline/Hints nur noch über Mapping-Module. |
| **Vergleich** | Markt ein Modell; wir parallel → konsolidieren. |

**FE:** `status.ts`, `status-mapping.ts`, Listen/Details. **BE:** —.  
**Abnahme:** Keine Roh-`hv_meldung_status`-Strings in UI ohne Label-Map.

## P3-07 — Kalk-Layout Polish

| | |
|--|--|
| **Markt** | Klare Netto-Zeilen, Summe, PDF-Alternative. |
| **Wir heute** | Funktioniert; Design-Gap „BEARBEITEN“. |
| **Wir wollen** | Layout laut Gap/Mock. |
| **Vergleich** | Markt polish; wir roh → UI. |

**FE:** `PartnerHwKalkulationScreen.tsx`. **BE:** —.  
**Abnahme:** Desktop+Mobile lesbar, Primary klar.

**Danach Block I:** Weniger Jargon-Drift; Status verlässlich.

---

# Block J — Optional / groß

## P3-01 — Einladungen E4 freischalten

| | |
|--|--|
| **Markt** | HV lädt Mieter per Link ins Konto. |
| **Wir heute** | Migration-STOP / Tabelle ggf. nicht live. |
| **Wir wollen** | Nach PO + Migration end-to-end. |
| **Vergleich** | Markt onboardet; wir gestoppt → freischalten oder Feature flag off. |

**FE:** Einladungs-UI. **BE:** `portal-einladungen-server.ts`, Migration apply.  
**Abnahme:** Einladen → Konto → Portal (nur wenn PO Go; sonst dokumentiert aus).

## P3-03 — Mieter-Mail-Policy

| | |
|--|--|
| **Markt** | Status-Mails oder bewusst Link-only. |
| **Wir heute** | `MIETER_EMAIL_ENABLED=false`. |
| **Wir wollen** | PO-Entscheid + Copy/Aushang aligned; optional Opt-in. |
| **Vergleich** | Markt klar; wir silent → entscheiden. |

**FE:** Bestätigung/Aushang. **BE:** `mieter-mail-policy.ts` + Mailer.  
**Abnahme:** Policy schriftlich; Code folgt.

## P3-05 — Eigentümer Settings / Scope

| | |
|--|--|
| **Markt** | Entweder Surface mit Konto-Settings oder kein Portal. |
| **Wir heute** | Live `EigentuemerPortalClient`; Gap-Doc „No-Go“. |
| **Wir wollen** | PO: Settings nachziehen **oder** Surface entfernen/flaggen. |
| **Vergleich** | Markt eine Linie; wir Widerspruch → PO. |

**FE/BE:** je Entscheidung.  
**Abnahme:** Doc und Code deckungsgleich.

## P4-01 — Vorgangs-Nachrichten

| | |
|--|--|
| **Markt** | Case-Thread Kunde↔Büro↔Partner. |
| **Wir heute** | Mail/Toast/GPT. |
| **Wir wollen** | Leichter Thread pro Lead (Epic). |
| **Vergleich** | Markt chatzt; wir mailt → Epic. |

**FE:** neue UI. **BE:** Tabellen + Notify CRM.  
**Abnahme:** Nachricht erscheint beiden Seiten; Mobile Sheet.

## P4-04 — Abnahme Mobile Polish

| | |
|--|--|
| **Markt** | Fullscreen-Signatur, großer Stift. |
| **Wir heute** | Modal + Querformat-Tipp; Chrome-Kollision möglich. |
| **Wir wollen** | Fullscreen; BottomNav hide. |
| **Vergleich** | Markt app-native; wir Modal → Fullscreen. |

**FE:** `PartnerAbschlussModal`, Shell detail-mode. **BE:** —.  
**Abnahme:** Signatur auf 390px Breite nutzbar.

## P5-02 — GPT Mobile-Strategie

| | |
|--|--|
| **Markt** | KI klar als Tool, nicht als Support-Ersatz. |
| **Wir heute** | Desktop embedded; Mobile Overlay; kein Nav. |
| **Wir wollen** | Entry spezifizieren oder „nur Desktop“ kommunizieren. |
| **Vergleich** | Markt klar; wir uneindeutig → Spec. |

**FE:** `PortalBaerenwaldGpt.tsx`, Clients. **BE:** —.  
**Abnahme:** Erwartung dokumentiert und UI matched.

**Danach Block J:** Nur nach PO/Kapazität; keine Blockierung von A–I.

---

# PR-Schnitt & Abhängigkeit

```text
A (P8-05, P8-01)
 └─ B (P2-04, P8-02, P1-02)
     └─ C (P3-08, P3-06, P3-04, P2-09, P1-08)
         ├─ D (P2-01, P2-05, P2-02, P2-03*, P1-05, P1-09)
         ├─ E (P3-02)
         ├─ F (P1-01, P1-06, P1-07, P2-07, P2-08, P4-03)
         ├─ G (P2-10, P2-06)  // nach D/F sinnvoll
         ├─ H (P1-03, P1-04, P6-08)
         └─ I (P8-03, P5-05, P3-07)
J parallel nach PO (P3-01, P3-03, P3-05, P4-01, P4-04, P5-02)

* P2-03 blockiert ggf. P3-01
```

**Empfohlene erste PRs**
1. Copy/Bug: P1-01, P1-02, P1-05, P1-09, P1-03, P1-04  
2. Spec+Breakpoint: P8-05, P8-01  
3. Mobile Kit: P2-04, P8-02  
4. Partner Termin + HV-Banner: P2-01, P1-08  
5. Ablehnen + Inbox: P2-05, P2-10  

---

# Abnahme-Meta (jeder PR)

| Check | Frage |
|-------|--------|
| **Markt-Check** | Entspricht das Ticket dem „Markt“-Satz? |
| **Desktop-Portal-Check** | Self-Service klar, Primary eine, wenig Jargon? |
| **Mobile-App-Check** | Eine Action-Leiste, Sheets wo nötig, große Targets, Job erledigbar ohne Desktop-Denken? |
| **Vergleich geschlossen?** | Zeile Markt↔heute→Änderung im Ticket erfüllt? |
| **Surface getrennt?** | Kunde / Partner / Melde nicht vermischt? |
| **Audit-Link** | `PF-*` / Situation im Audit abhakbar? |

---

## Danach anders (gesamt, nach A–I)

- Mobile fühlt sich wie App an (Chrome + Kit), Desktop bleibt Portal.
- Kernjobs Termin, Ablehnen, Melde-Rettung, Deep-Links funktionieren.
- Inbox und Glocke beantworten „Was heute?“.
- Naming/Anrede/Status weniger Lärm.
- Große Epics (Chat, Payment, Einladung) sind bewusste PO-Wellen, keine stillen Halbfertigprodukte.

---

*Stand: Umsetzungsplan zu PORTAL-ALLTAG-AUDIT · keine Feature-Implementierung in diesem Schritt.*
