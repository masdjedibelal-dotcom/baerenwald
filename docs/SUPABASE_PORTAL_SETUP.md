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

## 2. Custom SMTP (Pflicht für echte Kunden-Mails)

**Wichtig:** CRM-Mails laufen über **Resend** (`RESEND_API_KEY`).  
**Bestätigungs-Mails beim Portal-Login** kommen von **Supabase Auth** — das ist ein **separater** Kanal.

Ohne Custom SMTP nutzt Supabase den eingebauten Versand:

- oft **nur an Team-Mitglieder** des Supabase-Projekts (externe Kunden bekommen nichts)
- sehr niedriges Limit (z. B. ~2 Mails/Stunde)
- schlechte Zustellbarkeit / Spam

### Resend als SMTP für Supabase Auth

Supabase Dashboard → **Authentication** → **SMTP Settings** → Custom SMTP **ON**:

| Feld | Wert |
|------|------|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | dein Resend-API-Key (`re_…`) |
| Sender email | verifizierte Adresse, z. B. `info@baerenwaldmuenchen.de` |
| Sender name | `MeinBärenwald` |

Domain bei Resend verifizieren (SPF/DKIM). Danach **Send test email** in den Auth-Templates.

**Rate Limits:** Authentication → **Rate Limits** — nach SMTP-Umstellung ggf. von 30/h erhöhen.

**Logs prüfen:** Authentication → **Logs** — Fehler wie „Email address not authorized“ = noch Default-SMTP.

## 3. Authentication → Providers

| Einstellung | Wert |
|-------------|------|
| **Email** | Enabled |
| **Confirm email** | **ON** (Pflicht) |
| **Secure email change** | ON (empfohlen) |
| **Double confirm email changes** | optional |

## 4. Authentication → URL Configuration

**Site URL** (Produktion):

```
https://baerenwaldmuenchen.de
```

**Redirect URLs** (alle eintragen — oder Wildcard `https://baerenwaldmuenchen.de/**`):

```
https://baerenwaldmuenchen.de/auth/callback
https://baerenwaldmuenchen.de/auth/callback?next=%2Fportal%2Fpasswort-neu
https://baerenwaldmuenchen.de/auth/callback?next=%2Fpartner%2Fpasswort-neu
https://baerenwaldmuenchen.de/portal/auth/callback
https://baerenwaldmuenchen.de/portal/auth/callback?next=%2Fportal%2Fpasswort-neu
https://baerenwaldmuenchen.de/portal/login
https://baerenwaldmuenchen.de/portal/passwort-neu
https://baerenwaldmuenchen.de/partner/auth/callback
https://baerenwaldmuenchen.de/partner/auth/callback?next=%2Fpartner%2Fpasswort-neu
https://baerenwaldmuenchen.de/partner/passwort-neu
http://localhost:3000/auth/callback
http://localhost:3000/auth/callback?next=%2Fportal%2Fpasswort-neu
http://localhost:3000/portal/auth/callback
http://localhost:3000/portal/auth/callback?next=%2Fportal%2Fpasswort-neu
http://localhost:3000/portal/login
http://localhost:3000/portal/passwort-neu
http://localhost:3000/partner/auth/callback
http://localhost:3000/partner/auth/callback?next=%2Fpartner%2Fpasswort-neu
http://localhost:3000/partner/passwort-neu
```

> **Passwort-Reset:** Der Link aus der Mail muss auf `/auth/callback` (oder `/portal/auth/callback`) landen, tauscht den Code ein und leitet weiter zu **`/portal/passwort-neu`**. Fehlt die Redirect-URL in Supabase, landet man nur auf der **Startseite** (`https://baerenwaldmuenchen.de/#`) — dann in Auth → URL Configuration die URLs oben eintragen.

## 5. Authentication → Email Templates

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

## 6. Umgebungsvariablen (Vercel / `.env.local`)

**handwerks-plattform** (Website):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # nur Server, nie NEXT_PUBLIC_
NEXT_PUBLIC_SITE_URL=https://baerenwaldmuenchen.de
```

## 7. Bestehende Kunden verknüpfen

Nach der Migration:

1. Kunde registriert sich mit **derselben E-Mail** wie in `kunden.email`.
2. Nach E-Mail-Bestätigung und Login setzt die App `kunden.auth_user_id`.

Manuell (Support):

```sql
update public.kunden
set auth_user_id = 'UUID-AUS-AUTH-USERS'
where id = 'KUNDEN-UUID';
```

## 8. CRM-Sicherheit (wichtig)

Die Migration aktiviert RLS auf `kunden`, `leads`, `auftraege`, `angebote` mit **Portal-Select-Policies**.

CRM-Mitarbeiter nutzen `user_profiles`. Policies mit nur `authenticated` ohne `is_crm_staff()` müssen im CRM-Repo nachgezogen werden (siehe Kommentar am Ende der SQL-Datei).

Bis dahin: Portal lädt Daten **serverseitig** mit Service Role, aber nur nach Session-Check — kein direkter Datenbankzugriff aus dem Browser.

## 9. Token-Links

`portal_token` und `/portal/{token}` entfallen. E-Mails verlinken auf:

```
https://baerenwaldmuenchen.de/portal/login
```

## 10. Mitarbeiter mit derselben E-Mail (CRM + Portale)

CRM, Kundenportal und Partnerportal nutzen **dieselbe Supabase-Auth**. Ein Mitarbeiter (`user_profiles`) darf alle Bereiche nutzen, wenn die E-Mail im jeweiligen Stamm steht:

| Portal | Voraussetzung |
|--------|----------------|
| **MeinBärenwald** | `kunden.email` = Login-E-Mail (wird beim ersten Login verknüpft) |
| **Partner** | `handwerker.email` = Login-E-Mail, `aktiv = true` (CRM legt Partner an) |

**Wichtig:** Es gibt **keine** Sperre mehr für CRM-Mitarbeiter im App-Code. Migration `20260605120000_unified_crm_portal_access.sql` (und ggf. `20260604170000_allow_crm_staff_partner_portal.sql`) im SQL Editor ausführen.

### Test-Account info@baerenwald-muenchen.de

Im CRM einmal prüfen/anlegen:

```sql
-- Partner-Zugang (Handwerker-Stamm)
select id, email, aktiv, auth_user_id from public.handwerker
where lower(email) = lower('info@baerenwald-muenchen.de');

-- Kundenportal (optional, gleiche Auth-ID möglich)
select id, email, auth_user_id from public.kunden
where lower(email) = lower('info@baerenwald-muenchen.de');
```

Fehlt der Handwerker-Eintrag, im CRM unter Handwerker anlegen mit dieser E-Mail — sonst erscheint: *„noch nicht als Partner hinterlegt“*.

## 11. Test-Checkliste

- [ ] **Supabase → Authentication → Logs** — nach Registrierung/Reset Eintrag sichtbar?
- [ ] **Custom SMTP aktiv** — sonst kommen Mails extern oft gar nicht an
- [ ] Registrierung → Bestätigungs-Mail → Link → eingeloggt → Dashboard
- [ ] Passwort vergessen → Mail → Link → **`/portal/passwort-neu`** → neues Passwort → Login
- [ ] Login ohne Bestätigung → Fehlermeldung + „Erneut senden“
- [ ] Bestehender Kunde (gleiche E-Mail) → sieht Anfragen/Aufträge
- [ ] CRM: Angebot-Mail enthält Login-Link, kein Token-URL
- [ ] Logout funktioniert

## 12. Häufige Probleme

| Symptom | Ursache | Fix |
|---------|---------|-----|
| Keine Bestätigungs-Mail | Default-SMTP (nur Team-E-Mails) | Custom SMTP mit Resend (Abschnitt 2) |
| „Email address not authorized“ in Auth-Logs | Absender nicht verifiziert | Domain in Resend + gleiche Adresse in SMTP Sender |
| Reset-Link öffnet Portal, Passwort ändert sich nicht | Fehlende `/passwort-neu`-Seite | Code-Deploy + Redirect-URLs (Abschnitt 4) |
| Link „invalid“ / sofort abgelaufen | Redirect-URL nicht in Allow-List | Alle URLs aus Abschnitt 4 eintragen |
| Lokal testen, Link zeigt auf Prod | `NEXT_PUBLIC_SITE_URL` falsch | Lokal `http://localhost:3000` setzen |
