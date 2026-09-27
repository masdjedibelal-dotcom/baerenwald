# Mandantentrennung — Prüfung 2026-09-26

Repo: **baerenwald**. Nur Lesen. Keine DB, kein Browser.

**Frage:** Hebt `supabaseAdmin` die RLS auf — und prüft der Code trotzdem Zugehörigkeit, bevor Client-IDs in Abfragen landen?

---

## Kennzahlen

| | Anzahl |
|--|--------|
| **Geprüft** (Route-Methoden + relevante Server-Action-Exporte) | **≈ 130** |
| **offen** | **7** |
| **unklar** | **5** |
| **sicher** (Rest) | **≈ 118** |

`check-service-role-gate` bleibt eine Anwesenheitsprüfung: Vorkommen eines Gate-Worts in der Datei ≠ Gate vor Query ≠ Zugehörigkeit zur Session.

---

## Offen (zuerst)

### 1 · `GET /api/org/hausmeister?objektId=…`

| | |
|--|--|
| Datei | `src/app/api/org/hausmeister/route.ts` L23–39 |
| Gate | `requireOrganisationSession` — **vor** Query |
| Lücke | `objektId` aus Query → `loadHausmeisterForObjekt(objektId)` **ohne** `assertOrgObjekt` / `kunde_id` |
| Weg | Eingeloggter Org-User setzt `objektId` eines Objekts einer anderen Org. `hausmeister_objekte` wird nur nach `kunde_objekt_id` gefiltert (`org-hausmeister.ts` L60–66). Response `amObjekt` liefert Name/E-Mail/Portal-Flags des fremden Hausmeisters. |

### 2 · `POST /api/org/katalog/bestellen` — Feld `einheitId`

| | |
|--|--|
| Datei | `src/app/api/org/katalog/bestellen/route.ts` L53–74 |
| Gate | `requireOrganisationSession`; Objekt wird mit `.eq("kunde_id", session.kunde.id)` geprüft |
| Lücke | `einheitId` aus Body → `loadEinheitFlaeche(einheitId)` ohne Org-/Objekt-Bindung (`katalog-produkte.ts` L194–202) |
| Weg | Eigenes Objekt + fremde `einheitId` → fremde `wohnflaeche_m2` fließt in Preis/`betrag` und `funnel_daten` (Informationen/Preislogik über fremde Einheiten). |

### 3 · `DELETE /api/org/objekte/einheiten?id=…`

| | |
|--|--|
| Datei | `src/app/api/org/objekte/einheiten/route.ts` L178–199 |
| Gate | `requireOrganisationSession` — **vor** Update |
| Lücke | `id` ungeprüft; kein `assertOrgEinheit` (PATCH in derselben Datei hat den Assert, DELETE nicht) |
| Weg | Eingeloggter Org-User setzt `id` einer fremden Einheit → Soft-Delete `aktiv: false` über `supabaseAdmin`. |

### 4 · `POST /api/partner/signed-urls`

| | |
|--|--|
| Datei | `src/app/api/partner/signed-urls/route.ts` L9–48 |
| Gate | `requireAccountSession` + `kind === "handwerker"` |
| Lücke | Body-`paths[]` → Signed URLs **ohne** Prefix-/`handwerker_id`-Prüfung |
| Weg | Angemeldeter Partner sendet bekannte/erratene Storage-Pfade (typisch `{andereHwId}/…`) → lesbare URLs fremder Uploads. |

### 5 · Server-Action `getPartnerBautagebuchFotoUrls(paths)`

| | |
|--|--|
| Datei | `src/app/actions/partner-bautagebuch.ts` L300–304 |
| Gate | **keines** |
| Lücke | `paths` → `resolvePartnerFileUrls` → Admin-Signed-URLs |
| Weg | Aufruf der Action (auch ohne Login) mit bekannten Pfaden → fremde Bautagebuch-/Upload-Dateien. Stärker als Nr. 4, weil ohne Session. |

### 6 · `GET /api/partner/abnahme/[auftragId]?protokoll=…` / `getPartnerAbnahmeStatus`

| | |
|--|--|
| Datei | Route: `src/app/api/partner/abnahme/[auftragId]/route.ts`; Logik: `partner-abnahmeprotokoll.ts` `loadLocalAbnahmeStatus` L500–508 |
| Gate | Partner-Auth + `assertPartnerAktiveZuweisung(auftragId)` — Auftrag gehört dem HW |
| Lücke | Optional `protokollId` → `.from("auftrag_abnahmeprotokolle").eq("id", byId)` **ohne** `handwerker_id` / `auftrag_id` |
| Weg | Eigenes Auftragsrecht + fremde Protokoll-UUID → `pdf_url`, Punkte-/Mängel-Counts, Status lesen. |

### 7 · Server-Action `acceptPartnerRahmenvertragForEmail`

| | |
|--|--|
| Datei | `src/app/actions/partner-vertrag.ts` L127–169 |
| Gate | **keines** (nur E-Mail-String) |
| Lücke | Jeder Client kann `email` + `akzeptiert: true` senden |
| Weg | Fremde Partner-E-Mail → CRM-Accept + `persistPortalRahmenvertragAkzeptanz` für diesen Handwerker, ohne Besitz der Mailbox / Session. (Registrierungs-Pfad — mandantenrechtlich trotzdem offen.) |

---

## Unklar → entschieden (FIX6 Commit 4)

| Stelle | Entscheidung | Begründung / Fix |
|--------|--------------|------------------|
| `GET /api/org/einheit-bewohner` + `objektId` | **war offen** → behoben | `assertOrgObjekt` vor Einheiten-Query (Defense-in-Depth; Bewohner waren schon `.eq("kunde_id", session)`) |
| `POST /api/portal/ki-assist` `hm_befund_notiz` | **war offen** (8.) → behoben | Nur `getUser` → jetzt `requireBefundActor` (Org oder HM am Objekt) |
| `POST /api/portal/ki-assist` `funnel_beschreibung` | **sicher** | Absichtlich öffentlich + Rate-Limit; keine Mandanten-ID, kein `supabaseAdmin` |
| `POST …/abnahme/bestaetigen` + `versenden` | **war offen** → behoben | `assertProtokollIdForAuftrag`: lokale Zeile muss zu Auftrag+HW gehören; fehlt lokal → CRM mit geprüftem `auftragId` |
| CRM-`protokoll_id` Spiegel / `loadOwnAbnahmeLink` | **war offen** → behoben | Select/Update an `auftrag_id` + `handwerker_id` gebunden |

---

## Sicher (Zusammenfassung)

Gleiche Gate-Muster, Zugehörigkeit gegen Session — Detailzeilen weggelassen, Anzahl reicht.

### Org-API (`src/app/api/org/`) — ≈ 75 Methoden sicher

| Muster | Beispiele |
|--------|-----------|
| `requireOrganisationSession` + `.eq("kunde_id" \| "auftraggeber_kunde_id", session.kunde.id)` | Objekte CRUD, Suche, Abos, Wiedervorlagen, Export, HV-Notifications, Meldungen, Vorgang-Storno/Feedback/Kommentare, … |
| Session + `assertOrgObjekt` / `assertOrgEinheit` / `assertOrgLead` | Akten-Notizen, Dokumente, Kontakte, Prüfpflichten, Kalender, Portal-Einladungen, Cover, … |
| `requireOrgAdminSession` / `requireOrgFreigabeSession` | Branding, Einstellungen, Whitelabel, Freigabe, Kostenträger |
| Token-Gate | `kalender/ics` (Feed-Token → `kunde_id` des Feeds) |
| Schreibschutz fest | `objekte/dokumente` POST/DELETE → 403, kein DB-Zugriff |

### Portal-API — sicher (Gruppe)

| Route | Gate / Zugehörigkeit |
|-------|----------------------|
| `suche` | `requireAccountSession` + `leads.kunde_id` |
| `vorgaenge/[id]` | Account oder Org-Session; Detail nur eigenes Lead/Auftraggeber |
| `notifications` GET/PATCH | `empfaenger_user_id = user.id` |
| `einladung/[token]` | Token (öffentlich GET; POST + User) |
| `eigentuemer/anfrage` | `requireEigentuemerSession` + Objekt-Eigentum |
| `eigentuemer/objekte` | Session-`kundeId` beim Insert |
| `eigentuemer/freigabe` | 410, kein Datenzugriff |

### Partner-API — sicher (Gruppe)

| Route | Gate / Zugehörigkeit |
|-------|----------------------|
| `suche` | `linkPortalHandwerker` + Queries auf eigene `handwerker_id` |
| `ki-korrigieren` | Partner-Auth, keine Ressourcen-IDs |
| `abnahme/nach-signatur` | `assertPartnerAktiveZuweisung` |
| `abnahme/entwurf` | No-Op |

### Server-Actions — sicher (Gruppe, Auswahl)

Partner: Positionen/Zeiten/Regie, Angebote/PDFs/Rechnungen, Compliance, Fachdoku, Profil, Notifications, Auftrag annehmen/ablehnen/erledigt, Auto-Dokumente, Bautagebuch create/update/delete (mit `handwerker_id`), Projektvertrag (eingeloggt), Konditionen.  
Kunde: `accept`/`reject` Angebot, Auftragsänderungen, Feedback, Termin-Slots — jeweils nach `linkPortalKunde` / `auftragGehoertKunde` / Lead-`kunde_id`.

---

## Fazit

Ja — es liegt ein **echtes Problem** vor, nicht nur ein schwacher Guard:

1. **Service-Role ist flächendeckend**; Sicherheit hängt an Code-Gates.
2. Die meisten Org-/Portal-/Partner-Pfade binden IDs an die Session (**≈ sicher**).
3. **Sieben offene Stellen** erlauben IDOR oder unauthentifizierten Zugriff (HM-Kontakte, Einheiten-m², Soft-Delete Einheit, Storage-URLs ×2, Abnahme-Protokoll, Rahmenvertrag per E-Mail).
4. `check-service-role-gate` hätte **keinen** dieser Fälle verhindert (Gate-Wort steht oft in derselben Datei).

Keine Änderung in diesem Auftrag.

---

*Ende Prüfung 2026-09-26*
