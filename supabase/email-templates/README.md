# Supabase Auth — E-Mail-Vorlagen (MeinBärenwald)

Design wie die Kunden-Mails im CRM (`mailHtmlBase`: weiß, grünes Logo, Button `#2E7D52`, Hinweis-Box `#EAF3DE`).

## Eintragen in Supabase

**Authentication → Email Templates**

Für jede Vorlage: **Body** = Inhalt der jeweiligen `.html`-Datei (komplett kopieren).  
**Subject** siehe Tabelle.  
Nach dem Speichern: **Send test email** nutzen.

| Vorlage in Supabase        | Datei                    | Betreff (Subject)                    |
|----------------------------|--------------------------|--------------------------------------|
| Confirm signup             | `confirm-signup.html`    | MeinBärenwald — E-Mail bestätigen    |
| Reset password             | `reset-password.html`    | MeinBärenwald — Passwort zurücksetzen |
| Change email address       | `change-email.html`      | MeinBärenwald — Neue E-Mail bestätigen |
| Magic link                 | `confirm-signup.html` *  | MeinBärenwald — Anmelden             |
| Invite user                | optional                 | —                                    |

\* Magic Link: gleiches Layout, Button-Text in Supabase ggf. an „Anmelden“ anpassen — oder eigene Kopie der Datei.

## Wichtige Platzhalter (nicht ändern)

Supabase ersetzt diese automatisch:

- `{{ .ConfirmationURL }}` — Bestätigungs- / Reset-Link
- `{{ .Email }}` — E-Mail des Nutzers (Confirm signup)

## Logo

Standard: `https://baerenwaldmuenchen.de/logo-mark-green.png`

Wenn das Logo in Mails nicht lädt: in allen HTML-Dateien die `img src="..."` URL prüfen (öffentlich erreichbar, HTTPS).

## Plain-Text (optional)

Unter **Authentication → Email Templates** gibt es pro Vorlage auch ein **Plain text** Feld. Kurzfassung z. B.:

**Confirm signup:**

```
Hallo,

bitte bestätige deine E-Mail für MeinBärenwald:

{{ .ConfirmationURL }}

Bärenwald München · 089 809 557 26
```

## Vorschau lokal

Dateien im Browser öffnen zeigt nur Layout — `{{ .ConfirmationURL }}` wird erst von Supabase ersetzt. Test immer über **Send test email** im Dashboard.
