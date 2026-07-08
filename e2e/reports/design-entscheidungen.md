# Offene Design-Entscheidungen (E2E HV-Plattform)

| ID | Thema | Optionen | Empfehlung Test | Status |
|----|-------|----------|-----------------|--------|
| DD-01 | Schwellen-Randfall TC-11c | Angebot = 2.500 € → `<=` direkt vs. `>` Angebot | `>` = Angebotspfad (Freigabe nötig) | **entschieden** (`<=` direkt, `>` Angebot) |
| DD-02 | Havarie vor HV-Freigabe | CRM darf Notmaßnahme ohne Freigabe | Spec: ja, informiert HV | **implementiert** (TC-01/2) |
| DD-03 | Nachtrag unter Schwelle (8b) | Nur CRM vs. CRM+HV | Spec: nur CRM | **implementiert** (`syncOrgFreigabeNachNachtrag`) |
| DD-04 | Mieter-Status Stufe 3–4 | „Beauftragt“ vs. vereinfacht „In Bearbeitung“ | Spec TC-01: vereinfacht | **implementiert** (TC-10 aktiv) |
| DD-05 | Trocknungsnachweis Versicherungsakte | Pflicht vs. optional | Spec: optional im TOC | **implementiert** (TOC Zeile 8 optional) |
| DD-06 | Abo pro-rata | Nein (Spec) | start_am = 1. Folgemonat | **implementiert** |
| DD-07 | Duplikat-Meldung 24h | Hinweis vs. Hard-Block | Spec: Hinweis only | **entschieden + implementiert** |
| DD-08 | Storno-Export | Negative Zeile vs. nur Status | Spec: Storno-Zeile | **implementiert** (TC-11e) |
| DD-09 | Dev-Bypass Production | Env-Flag allein vs. NODE_ENV-Guard | Wie Portal: `!== production` + Flag | **implementiert** (TC-08) |
| DD-10 | Notmaßnahme Betragsdeckel | Unbegrenzt vs. Cap [X] € | Vertrag + Pilot-HV (Frau Berg) | **offen — Vertrag/Produkt** |
| W2-01 | TC-01/3 Partner-Befund | Upload-Portal vs. WhatsApp-Umweg | Spec: Pflicht in Versicherungsakte | **implementiert** (Welle 2a) |
