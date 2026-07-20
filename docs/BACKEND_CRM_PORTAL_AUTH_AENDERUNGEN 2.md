# Backend (CRM) — Änderungen Portal-Login statt Token

Übertrag in **baerenwald-crm-dashboard** (oder dein anderes Backend-Repo).  
Die **Website** (`handwerks-plattform`) enthält Login/Portal separat — hier nur CRM + gemeinsame DB.

---

## 1. Supabase (einmalig, gleiche DB)

Migration ausführen (identisch in beiden Repos):

- `supabase/migrations/20260602120000_portal_auth_kunden.sql`
- Bei Problemen zuerst: `supabase/migrations/20260602120100_portal_auth_repair.sql`

Kurz: `kunden.auth_user_id`, `portal_token` weg, RLS-Hilfsfunktionen, Portal-Policies.

---

## 2. Dateien löschen

| Datei | Grund |
|-------|--------|
| `src/app/api/portal/[token]/route.ts` | Öffentliche Token-API entfällt |

---

## 3. `src/lib/portal-utils.ts` — ersetzen

**Vorher:** `buildPortalLink(portalToken)` → `/portal/{uuid}`

**Nachher:**

```typescript
export function buildPortalLoginLink(): string {
  const base = (
    process.env.FRONTEND_URL ??
    process.env.NEXT_PUBLIC_WEBSEITE_URL ??
    'https://baerenwaldmuenchen.de'
  ).replace(/\/$/, '')
  return `${base}/portal/login`
}

export function buildPortalButton(
  portalLink: string,
  anrede: 'du' | 'sie' = 'du'
): string {
  const text = 'Zu MeinBärenwald →'
  const sub =
    anrede === 'du'
      ? 'Melde dich mit deiner E-Mail an — Anfragen, Angebote und Dokumente im Blick.'
      : 'Melden Sie sich mit Ihrer E-Mail an — Anfragen, Angebote und Dokumente im Blick.'
  // … unverändert: HTML mit portalLink …
}

/** @deprecated — nutze buildPortalLoginLink() */
export function buildPortalLink(_portalToken?: string | null): string | null {
  return buildPortalLoginLink()
}
```

`FRONTEND_URL` / `NEXT_PUBLIC_WEBSEITE_URL` muss auf die Marketing-Site zeigen (z. B. `https://baerenwaldmuenchen.de`).

---

## 4. `src/app/actions/kunden.ts`

### Entfernen bei `sanitizeKundePayload` / neuem Kunden

- `portal_token: crypto.randomUUID()` beim Insert
- `delete payload.portal_token` beim Update

### Funktion ersetzen

**Entfernen:** `getOrCreatePortalToken(kundeId)`

**Neu (optional für UI):**

```typescript
export async function getPortalLoginHint(kundeId: string): Promise<
  | { ok: true; loginLink: string; hasAuthAccount: boolean }
  | { ok: false; message: string }
> {
  const supabase = createClient()
  const { data: row, error } = await supabase
    .from('kunden')
    .select('auth_user_id')
    .eq('id', kundeId)
    .maybeSingle()

  if (error) return { ok: false, message: error.message }

  const { buildPortalLoginLink } = await import('@/lib/portal-utils')
  return {
    ok: true,
    loginLink: buildPortalLoginLink(),
    hasAuthAccount: Boolean(
      (row as { auth_user_id?: string | null } | null)?.auth_user_id
    ),
  }
}
```

---

## 5. `src/app/actions/mails.ts`

### Imports

```diff
- import { buildPortalButton, buildPortalLink } from '@/lib/portal-utils'
- import { getOrCreatePortalToken } from '@/app/actions/kunden'
+ import { buildPortalButton, buildPortalLoginLink } from '@/lib/portal-utils'
```

### `getKundenPortalMailDraft`

- Kein `getOrCreatePortalToken` mehr
- `const portalLink = buildPortalLoginLink()`
- Return-Typ: **`portalToken` entfernen**, nur noch `portalLink`
- Mail-Text anpassen: Registrierung mit **dieser E-Mail** unter MeinBärenwald

### `sendKundenPortalLinkMail` / `previewKundenPortalMail`

```diff
- const tokenRes = await getOrCreatePortalToken(...)
- const portalLink = buildPortalLink(tokenRes.token)
+ const portalLink = buildPortalLoginLink()
```

### `kundenPortalMailHtml` (falls Text noch „persönlicher Link“ sagt)

Text z. B.:

- du: „Registriere dich mit dieser E-Mail-Adresse unter MeinBärenwald …“
- sie: „Registrieren Sie sich mit dieser E-Mail-Adresse …“

---

## 6. `src/lib/templates/angebot-mail.ts`

### Typ `AngebotMailInput`

```diff
-  portalToken?: string
+  portalLink?: string
```

### Mail-Body (Portal-Button)

```diff
- data.portalToken
-   ? buildPortalButton(buildPortalLink(data.portalToken)!, ...)
+ data.portalLink
+   ? buildPortalButton(data.portalLink, ...)
```

---

## 7. `src/app/(dashboard)/angebote/actions.ts`

### Import

```diff
- import { getOrCreatePortalToken } from '@/app/actions/kunden'
+ import { buildPortalLoginLink } from '@/lib/portal-utils'
```

### Beim Angebots-Mail-Bau (ca. Zeile 669)

```diff
- const portalRes = detail.kunde_id
-   ? await getOrCreatePortalToken(detail.kunde_id)
-   : { ok: false as const, message: '...' }
+ const portalLink = detail.kunde_id ? buildPortalLoginLink() : null
```

```diff
- portalToken: portalRes.ok ? portalRes.token : undefined,
+ portalLink: portalLink ?? undefined,
```

---

## 8. `src/lib/email-templates.ts` (Lead-Bestätigung)

Falls `emailLeadBestaetigung` noch `portalToken` nutzt:

```diff
- portalToken?: string
+ includePortalLink?: boolean
```

```diff
- portalToken ? buildPortalButton(buildPortalLink(portalToken)!) : ''
+ includePortalLink ? buildPortalButton(buildPortalLink()!) : ''
```

(`buildPortalLink()` ohne Argument liefert jetzt `/portal/login`.)

---

## 9. UI (optional, Texte)

`KundeDetailClient.tsx` — funktioniert oft **ohne Code-Änderung**, wenn `getKundenPortalMailDraft` noch `portalLink` liefert:

| Alt (optional) | Neu (empfohlen) |
|----------------|-----------------|
| „Portal-Link senden“ | „MeinBärenwald-Einladung senden“ |
| Modal-Titel „Portal-Link senden“ | „Zugang zu MeinBärenwald“ |
| Feld „Portal-Link“ | „Login: baerenwaldmuenchen.de/portal/login“ |

„Kundenportal öffnen“ → öffnet `buildPortalLoginLink()` (nicht mehr Token-URL).

Optional Anzeige: `auth_user_id` gesetzt → „Portal-Konto aktiv“ via `getPortalLoginHint().hasAuthAccount`.

---

## 10. Env (CRM)

Keine neuen Keys nötig, wenn schon gesetzt:

```env
FRONTEND_URL=https://baerenwaldmuenchen.de
# oder
NEXT_PUBLIC_WEBSEITE_URL=https://baerenwaldmuenchen.de
```

---

## 11. Suche im Repo (alles bereinigen)

```bash
rg "portal_token|getOrCreatePortalToken|portalToken|/portal/\$"
```

Sollte nach dem Umbau nur noch Deprecated-Kommentare oder `buildPortalLink`-Wrapper treffen.

---

## 12. Checkliste nach dem Merge

- [ ] SQL-Migration auf Produktions-Supabase
- [ ] CRM deployen
- [ ] Website mit Portal-Auth deployen
- [ ] Supabase Auth: Redirect URLs + E-Mail-Templates
- [ ] Test: „Portal-Link senden“ → Mail mit `/portal/login`
- [ ] Test: Angebot-Mail → Button MeinBärenwald
- [ ] Kunde registriert sich mit Kunden-E-Mail → sieht Daten im Portal
