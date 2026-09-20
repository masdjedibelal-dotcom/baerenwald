# P0-6 / Staging = Prod — Checkliste (manuell)

GitHub-CLI hier nicht eingeloggt (`gh auth login` nötig). Bitte lokal:

## Portal/Web (`baerenwald`)

1. Alte Branches prüfen und löschen (`fix/*`, `chore/*`, `cursor/*`, `agent-*`), wenn gemerged.
2. Default-Branch: Workflow **staging → main**.

## Beide Repos — Branch-Schutz `main`

Settings → Branches → Rule for `main`:

- [ ] Require pull request before merging
- [ ] Require approvals (mind. 1) optional
- [ ] Restrict who can push
- [ ] **Allow merge only from `staging`** (bzw. required status checks + PR base = staging-Prozess)
- [ ] Keine direkten Pushes auf `main`
- [ ] Keine Force-Pushes

## Staging = Prod Stand

1. Features nur auf `staging` deployen und abnehmen.
2. Merge `staging` → `main` → Prod-Deploy.
3. Hotfixes ebenfalls über staging (oder sofort zurückmergen).

Fertig, wenn: `main` geschützt und beide Sites denselben Commit fahren.
