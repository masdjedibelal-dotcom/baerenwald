# Partner — CRM-Anbindung (Notify-APIs)

Die Website sendet Handwerkern E-Mails mit Deep-Links ins Partner-Portal. Das CRM ruft die Endpoints nach den jeweiligen Aktionen auf.

**Prozess-Übersicht:** [handwerker-koordination/HANDWERKER_KOORDINATION_PROZESS.md](./handwerker-koordination/HANDWERKER_KOORDINATION_PROZESS.md)

## Übersicht

| Endpoint | Wann (CRM) | Portal-Ziel |
|----------|------------|-------------|
| `partner-notify-anfrage` | HW-Anfrage am Angebot gesendet | Anfragen |
| `partner-notify-angebot-bestaetigt` | Nach CRM „Übernehmen“ (`hw_status=bestaetigt`) | Anfragen — bestätigen |
| `partner-notify-angebot-antwort` | CRM Rückfrage oder Ablehnung | Anfragen |
| `partner-notify-zuweisung` | HW am Auftrag zugewiesen | Anfragen (`auftrag:…`) |
| *(keiner)* | Angebot → Auftrag (`auftraege.status≠offen`) | Angebote — Badge ändert sich |

---

## Neue Anfrage (Angebot)

`POST https://baerenwaldmuenchen.de/api/internal/partner-notify-anfrage`

Header:

```
Authorization: Bearer <PARTNER_INTERNAL_API_SECRET>
Content-Type: application/json
```

Body:

```json
{ "anfrageId": "<uuid aus angebot_handwerker.id>" }
```

Antwort: `{ "ok": true }` oder `{ "ok": false, "error": "..." }`

## Env (Website / Netlify)

| Variable | Beschreibung |
|----------|----------------|
| `PARTNER_INTERNAL_API_SECRET` | Geheimer Bearer-Token (gleicher Wert im CRM) |
| `RESEND_API_KEY` | Wie Lead-Funnel |
| `RESEND_FROM_SYSTEM` | Absender System-Mails |
| `INTERN_EMAIL` / `PARTNER_INTERN_EMAIL` | Interne Mails (Angebot/Bautagebuch) |
| `NEXT_PUBLIC_DASHBOARD_URL` | CRM-Links in Mails + optional Token-Fallback |

## CRM (später im Backend)

Nach `sendHandwerkerAnfrageFuerZuweisung` (oder wenn `sendEmail: true`):

```ts
await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/internal/partner-notify-anfrage`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.PARTNER_INTERNAL_API_SECRET}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ anfrageId: row.id }),
})
```

Optional: Handwerker-Mail im CRM nur noch mit Partner-Link (Template anpassen) und diesen API-Call weglassen, wenn ihr eine einzige Mail wollt.

---

## Leistung zugewiesen (Auftrag)

`POST https://baerenwaldmuenchen.de/api/internal/partner-notify-zuweisung`

Gleicher Bearer `PARTNER_INTERNAL_API_SECRET`.

Body:

```json
{
  "auftragId": "<uuid auftraege>",
  "handwerkerId": "<uuid handwerker>",
  "positionId": "<uuid auftrag_positionen — optional, eine Leistung>",
  "positionIds": ["<uuid>", "..."]
}
```

Die Mail enthält Kunde, Ort, Zeitraum, Leistungsliste und einen Button **Zum Partner-Portal** mit phasenabhängigem Link:

- offene Zuweisung → `?section=anfragen&id=auftrag:{auftragId}`
- nach Annahme (Angebot einreichen) → `?section=angebote&id={angebot_handwerker.id}`
- sonst → Übersicht `/partner`

Registrierungs-Hinweis für neue Partner.

**CRM:** wird automatisch nach `assignAuftragHandwerkerPosition` / `assignAuftragHandwerkerGewerk` ausgelöst (`notifyPartnerHandwerkerZuweisung`).

---

## Konditionen übernommen

`POST https://baerenwaldmuenchen.de/api/internal/partner-notify-angebot-bestaetigt`

Gleicher Bearer `PARTNER_INTERNAL_API_SECRET`.

Body (nach CRM setzt `hw_status = bestaetigt`):

```json
{ "anfrageId": "<uuid>", "bitteBestaetigen": true }
```

Mail: Link zu **Anfragen** — Konditionen bestätigen.

Ohne `bitteBestaetigen` (Legacy): Link zu **Angebote**.

**CRM:** nach Übernahme mit `hw_status = bestaetigt` aufrufen.

---

## CRM Rückfrage / Ablehnung (Konditionen)

`POST https://baerenwaldmuenchen.de/api/internal/partner-notify-angebot-antwort`

Gleicher Bearer `PARTNER_INTERNAL_API_SECRET`.

Body:

```json
{
  "anfrageId": "<uuid>",
  "typ": "rueckfrage",
  "crmNotiz": "Optionaler Text für den Handwerker",
  "betreff": "Optional",
  "cc": ["optional@example.com"]
}
```

`typ`: `"rueckfrage"` oder `"abgelehnt"`.

Mail: Link zu **Anfragen** — neue Konditionen prüfen.

**CRM:** nach Setzen von `hw_status = rueckfrage` bzw. `abgelehnt` aufrufen (`notify-partner-angebot-antwort.ts`).

**DB:** CRM setzt parallel `hw_status` und optional `hw_crm_notiz`.

---

## Neue Leistung nach Einigung (ohne Status-Änderung)

Wenn `hw_status = uebernommen` ist, **muss das CRM `hw_status` nicht setzen**.

Neue oder geänderte Positionen in `angebote.positionen` **oder** `auftrag_positionen` (mit passender `handwerker_id` / Gewerk) erkennt das Portal automatisch → **zusätzlicher** Eintrag unter **Anfragen** (Badge „Neue Leistung“). Unter **Angebote** bleiben die vereinbarten Leistungen unverändert sichtbar. Nach HW-Antwort: `hw_status = eingereicht`.

Details: `docs/KONDITIONEN_CRM_HANDOFF.md` §6.

---

## Auftragsfreigabe (Angebot → Auftrag)

Kein API-Endpoint. CRM-Transfer setzt `auftraege.status` ≠ `offen`.

Portal zeigt dann Badge „Auftrag freigegeben“ unter **Angebote**.

## Bereits in der Website (ohne CRM)

- **Interne Mail** bei Angebotseinreichung (`submitPartnerAngebot`)
- **Interne Mail** bei neuem Bautagebuch-Eintrag (`createPartnerBautagebuchEintrag`)
