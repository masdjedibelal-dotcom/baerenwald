# Design-Audit Screenshots

Automatische Screenshots für Desktop (1440×900) und Mobile (390×844).

**Index:** [`INDEX.md`](./INDEX.md) · **PDF:** [`design-audit.pdf`](./design-audit.pdf)

## Ausführen

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run audit:screenshots

# Optional: PDF aus Screenshots
npm run audit:pdf
```

Der Server wird automatisch auf Port **3000** oder **3001** erkannt (`AUDIT_BASE_URL` überschreibt).

### Eingeloggt (Portal + Partner)

Ohne explizite Credentials nutzt das Skript `INTERN_EMAIL` aus `.env.local` und setzt per `SUPABASE_SERVICE_ROLE_KEY` ein **temporäres Passwort** für den Audit-Login (danach ggf. „Passwort vergessen“ nutzen). Für Produktiv-Accounts besser dedizierte `AUDIT_*`-Zugänge verwenden.

Optional eigene Accounts:

```bash
AUDIT_KUNDE_EMAIL=… AUDIT_KUNDE_PASSWORD=… \
AUDIT_PARTNER_EMAIL=… AUDIT_PARTNER_PASSWORD=… \
npm run audit:screenshots
```

Cookie-Banner wird per `localStorage` (`bw_cookie_consent_v1`) umgangen.

## Ausgabe

`docs/design-audit/screenshots/{desktop|mobile}/`

- `marketing/` — Startseite, Rechner/GPT (`?modus=ki`), Ratgeber, Rechtliches, Cookie-Panel, Mobile-Menü (Kontakt)
- `portal-auth/` — Login, Registrierung, Passwort vergessen/neu
- `partner-auth/` — Login, Registrierung (+ RV-Block), Passwort
- `portal/` — MeinBärenwald: Übersicht, Anfragen, Angebote, Aufträge, GPT
- `partner/` — Partner: Übersicht, Profil, Planer, Anfragen, Angebote, Aufträge, GPT
