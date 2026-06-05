# Partner — CRM-Anbindung (E-Mail „Neue Anfrage“)

Die Website sendet Handwerkern eine **Partner-Portal-Mail** (Link `/partner/login`). Das CRM soll diese Mail **zusätzlich** oder **statt** der reinen Token-Mail auslösen.

## Endpoint

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

## Angebot übernommen (nach CRM-Bestätigung)

`POST https://baerenwaldmuenchen.de/api/internal/partner-notify-angebot-bestaetigt`

Gleicher Bearer `PARTNER_INTERNAL_API_SECRET`.

Body:

```json
{ "anfrageId": "<uuid aus angebot_handwerker.id>" }
```

Mail an den Handwerker mit Link `?section=angebote&id={anfrageId}` und Status-Hinweis „übernommen“.

**CRM:** wird aus `bestaetigeHandwerkerEinreichung` ausgelöst (`notifyPartnerHandwerkerAngebotBestaetigt`).

## Bereits in der Website (ohne CRM)

- **Interne Mail** bei Angebotseinreichung (`submitPartnerAngebot`)
- **Interne Mail** bei neuem Bautagebuch-Eintrag (`createPartnerBautagebuchEintrag`)
