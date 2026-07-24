# Arbeitshypothesen — Anwaltliche Prüfung (intern)

> **Unverbindlich.** Verbindlich macht erst der Anwalt.  
> Stand: Juli 2026 — Einschätzung Belal/Product vor Anwaltsversand.

---

## 1. Handwerker → eigene Verantwortliche (wahrscheinlich)

Aufsichtspraxis: HW verarbeitet im Rahmen der **eigenen** fachlichen Leistung, nicht auf Weisung als AV.

**Folge (Hypothese):** Keine AVV mit jedem Betrieb. Stattdessen:
- Empfängerkategorie „beauftragte Handwerksbetriebe“ in Mieter-Hinweisen
- Vertraulichkeits-/Datenschutzklausel im **HW-Rahmenvertrag** mit Bärenwald

**Offen:** Anwalt kann Subprozessor-Einordnung verlangen → dann HW-AVVs.

---

## 2. AV digital → ja (SaaS-Standard)

Art. 28 Abs. 9 DSGVO, elektronisches Format ausdrücklich zulässig.

**Beweisfest (umsetzen):**
- Checkbox + `av_version` + Zeitstempel ✅ (Schema vorhanden)
- **Volltext** jeder akzeptierten Version archivieren (nicht nur Versionsnummer)
- **User-ID** des Klickenden speichern
- Neue Version → erneute Akzeptanz beim nächsten Login + Ankündigungsfrist

---

## 3. Bestands-HVs → 30 Tage, dann hartes Gate

Formeller Mangel (Verarbeitung ohne aktuellen AVV) besteht ggf. schon — Gate **repariert**, verursacht nicht.

**Empfehlung:** 30 Tage ab aktiver Ansprache/E-Mail, danach Gate für **alle** Nutzer der Org (nicht nur Admins).

---

## 4. Rechtsgrundlage → lit. b + Unterfrage Eigentümer-Kette

Meldung = Erfüllung Mietvertrag (Instandhaltung § 535 BGB), vom Mieter ausgehend → **Art. 6 Abs. 1 lit. b**.

**Unterfrage (kritisch):** Ist HV **Verantwortliche** oder nur **Auftragsverarbeiterin** des Eigentümers?  
→ Kette Eigentümer → HV → Bärenwald würde AVV-Struktur ändern. **Explizit an Anwalt.**

---

## 5. Empfängerbenennung → generisch im Alltag

Art. 13: Kategorien genügen im Hinweis („technischer Dienstleister“, „beauftragte Handwerksbetriebe“).

**EuGH:** Bei **Art.-15-Auskunft** konkrete Empfänger nennen → Bärenwald in Antwort, WL bricht nur bei aktiver Anfrage.

---

## 6. Impressum → Doppelnennung risikoarm (Variante B) — **freigegeben**

HV als Anbieterin des Dienstes; Bärenwald als technischer Betreiber im Footer Melde-Routen.  
Live ohne Entwurfs-Banner.

---

## 7. Wohnungsfotos → Hinweis + Prozess

Upload-Hinweis (keine Personen/Dokumente); intern: Personen unkenntlich/löschen; zweckgebunden im Vorgang.

---

## 8. Löschfristen → bestätigt mit Korrektur Belege

| Daten | Frist [VORSCHLAG] |
|--------|-------------------|
| Vorgang mit Auftrag | 5 Jahre pauschal (§ 634a — alternativ 2/5 differenziert) |
| Buchungsbelege / Rechnungen | **8 Jahre** (BEG IV) |
| Handelsbücher / Abschlüsse | 10 Jahre |

Siehe [LOESCHKONZEPT_ENTWURF.md](./LOESCHKONZEPT_ENTWURF.md).

---

## 9. DSB → voraussichtlich nein

< 20 ständig Datenverarbeitung; keine extensive Überwachung als Kerntätigkeit. Bei Skalierung jährlich prüfen.

---

## 10. Eigentümer-Bericht → keine Mieternamen nötig

**Code-Stand (Juli 2026):** `generate-eigentuemer-bericht-pdf.ts` rendert nur Aggregat (Kosten, Anzahl Vorgänge, Kostenträger) — **keine Mieternamen**. Datenminimierung: Einheit statt Name.

---

## 11. Drittland → prozedural lösbar

Supabase, Vercel, Resend: DPA + SCC, EU-Region wählen, EU-US DPF. Aufgabe: DPAs archivieren, Transfer-Vermerk in [SUBPROZESSOREN_REGISTER.md](./SUBPROZESSOREN_REGISTER.md).

---

## Folgeaufgaben Dev (parallel zur Anwaltsanfrage)

- [x] AV-Archiv: Volltext + User bei Akzeptanz (`av_akzeptiert_von`, `av_text_snapshot`)
- [x] Gate-Logik: 30-Tage-Übergang Bestands-Orgs → danach Gate für alle Nutzer
- [x] Löschkonzept: 8 Jahre Belege in Docs ✅
- [x] DPA-Ordner / Subprozessoren-Register pflegen → [dpa/README.md](./dpa/README.md)
