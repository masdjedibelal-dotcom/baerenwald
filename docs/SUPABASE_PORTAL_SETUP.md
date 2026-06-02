# Supabase einrichten — MeinBärenwald (Login statt Token)

## 1. SQL ausführen

Datei im Supabase Dashboard → **SQL Editor** → New query → Inhalt einfügen → Run:

`supabase/migrations/20260602120000_portal_auth_kunden.sql`

**Fehler `auth_user_id does not exist`?** Zuerst `supabase/migrations/20260602120100_portal_auth_repair.sql` ausführen, danach die Haupt-Migration erneut (komplett).

Prüfen:

```sql
select column_name from information_schema.columns
where table_name = 'kunden' and column_name in ('auth_user_id', 'portal_token');
-- Erwartung: auth_user_id ja, portal_token nein
```

## 2. Authentication → Providers

| Einstellung | Wert |
|-------------|------|
| **Email** | Enabled |
| **Confirm email** | **ON** (Pflicht) |
| **Secure email change** | ON (empfohlen) |
| **Double confirm email changes** | optional |

## 3. Authentication → URL Configuration

**Site URL** (Produktion):

```
https://baerenwaldmuenchen.de
```

**Redirect URLs** (alle eintragen):

```
https://baerenwaldmuenchen.de/portal/auth/callback
https://baerenwaldmuenchen.de/portal/login
http://localhost:3000/portal/auth/callback
http://localhost:3000/portal/login
```

## 4. Authentication → Email Templates

Fertige HTML-Vorlagen im **Bärenwald-Design** (wie Anfrage-/Angebots-Mails):

→ Ordner `supabase/email-templates/`  
→ Anleitung: `supabase/email-templates/README.md`

Kurz:

1. **Confirm signup** — Body aus `confirm-signup.html` einfügen  
2. **Reset password** — Body aus `reset-password.html`  
3. **Change email** — Body aus `change-email.html`  
4. Betreff z. B. `MeinBärenwald — E-Mail bestätigen`  
5. **Send test email** zum Prüfen  

`{{ .ConfirmationURL }}` und `{{ .Email }}` in den Dateien **nicht** entfernen — Supabase setzt die Links ein.

## 5. Umgebungsvariablen (Vercel / `.env.local`)

**handwerks-plattform** (Website):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # nur Server, nie NEXT_PUBLIC_
NEXT_PUBLIC_SITE_URL=https://baerenwaldmuenchen.de
```

## 6. Bestehende Kunden verknüpfen

Nach der Migration:

1. Kunde registriert sich mit **derselben E-Mail** wie in `kunden.email`.
2. Nach E-Mail-Bestätigung und Login setzt die App `kunden.auth_user_id`.

Manuell (Support):

```sql
update public.kunden
set auth_user_id = 'UUID-AUS-AUTH-USERS'
where id = 'KUNDEN-UUID';
```

## 7. CRM-Sicherheit (wichtig)

Die Migration aktiviert RLS auf `kunden`, `leads`, `auftraege`, `angebote` mit **Portal-Select-Policies**.

CRM-Mitarbeiter nutzen `user_profiles`. Policies mit nur `authenticated` ohne `is_crm_staff()` müssen im CRM-Repo nachgezogen werden (siehe Kommentar am Ende der SQL-Datei).

Bis dahin: Portal lädt Daten **serverseitig** mit Service Role, aber nur nach Session-Check — kein direkter Datenbankzugriff aus dem Browser.

## 8. Token-Links

`portal_token` und `/portal/{token}` entfallen. E-Mails verlinken auf:

```
https://baerenwaldmuenchen.de/portal/login
```

## 9. Test-Checkliste

- [ ] Registrierung → Bestätigungs-Mail → Link → eingeloggt → Dashboard
- [ ] Login ohne Bestätigung → Fehlermeldung
- [ ] Bestehender Kunde (gleiche E-Mail) → sieht Anfragen/Aufträge
- [ ] CRM: Angebot-Mail enthält Login-Link, kein Token-URL
- [ ] Logout funktioniert
