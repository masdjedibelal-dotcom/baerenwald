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

**Nur gegen lokale oder dedizierte Staging-Supabase.** Nie mit Produktions-`.env.local`
bzw. Prod-`SUPABASE_SERVICE_ROLE_KEY` ausführen.

Ohne explizite Credentials nutzt das Skript `INTERN_EMAIL` und kann per
`SUPABASE_SERVICE_ROLE_KEY` ein **temporäres Passwort** setzen (danach ggf. „Passwort
vergessen“). Das ist für **Prod-Accounts verboten** — immer dedizierte `AUDIT_*`-Zugänge:

```bash
AUDIT_KUNDE_EMAIL=… AUDIT_KUNDE_PASSWORD=… \
AUDIT_PARTNER_EMAIL=… AUDIT_PARTNER_PASSWORD=… \
npm run audit:screenshots
```

Service-Role-Passwort-Reset läuft nur gegen `localhost` / `127.0.0.1`. Gegen remote
Supabase (Prod/Staging) bricht er ab — außer mit `AUDIT_*_PASSWORD` oder explizit
`AUDIT_ALLOW_SERVICE_ROLE_PASSWORD_RESET=true` (nur Staging).

Cookie-Banner wird per `localStorage` (`bw_cookie_consent_v1`) umgangen.

## Ausgabe

`docs/design-audit/screenshots/{desktop|mobile}/`

- `marketing/` — Startseite, Rechner/GPT (`?modus=ki`), Ratgeber, Rechtliches, Cookie-Panel, Mobile-Menü (Kontakt)
- `portal-auth/` — Login, Registrierung, Passwort vergessen/neu
- `partner-auth/` — Login, Registrierung (+ RV-Block), Passwort
- `portal/` — MeinBärenwald: Übersicht, Anfragen, Angebote, Aufträge, GPT
- `partner/` — Partner: Übersicht, Profil, Planer, Anfragen, Angebote, Aufträge, GPT
