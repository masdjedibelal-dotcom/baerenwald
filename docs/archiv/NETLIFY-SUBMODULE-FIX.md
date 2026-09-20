# Netlify: kaputter Submodule-Pfad `baerenwald`

## Was war kaputt?

Im **Portal-Repo** (`~/code/baerenwald`) lag ein Ordner `baerenwald/` mit kompletten
Kopien von Portal + CRM + teo-crm inkl. eigener `.git`-Ordner. Git hat das als
**Submodule/Gitlink** gesehen — ohne Eintrag in `.gitmodules`. Netlify bricht
beim Checkout ab:

`No url found for submodule path 'baerenwald' in .gitmodules`

## Was lokal schon erledigt ist

1. Ordner `baerenwald/` aus dem Portal-Repo **rausgeschoben** nach:
   `~/code/_fehlplatzierung-nested-aus-portal-baerenwald/`
2. In `.gitignore` ergänzt: `/baerenwald/`

Der echte Portal-Code bleibt unter `src/`, `public/`, … — **nicht** unter einem
inneren `baerenwald/`-Ordner.

## Was du in GitHub Desktop machen musst

1. Repo öffnen: **`baerenwald`** (Portal), **nicht** `baerenwald-system` (CRM).
2. Änderungen sollten zeigen:
   - gelöscht: `baerenwald` (Submodule/Ordner)
   - geändert: `.gitignore`
   - plus die Code-Fixes (Foto-Vorschau, Endkunde-Hide, …)
3. Commit z. B.: `fix: baerenwald-Gitlink entfernen (Netlify Checkout)`
4. Push → Netlify neu deployen.

### Falls Desktop den Ordner `baerenwald` nicht als „gelöscht“ anzeigt

Einmal im Terminal **im Portal-Repo** (nur du, nicht der Agent):

```bash
cd ~/code/baerenwald
git rm -rf --cached baerenwald 2>/dev/null || true
git add .gitignore
git status
```

Dann wieder GitHub Desktop → committen → pushen.
