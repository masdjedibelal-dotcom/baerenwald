# P6-2 — Primärgrün eine Variable je App

| Fläche | Kanonische Variable | Hex-Definition |
|--------|---------------------|----------------|
| Portal (`.portal-ui`) | `--p2-primary` | einmal in `globals.css` |
| Website (`:root` / Landing) | `--fl-accent` | einmal in `:root` (globals / landing) |
| White-Label Override | `--org-primary` (+ `-dk` / `-soft`) | setzt Org-Brand über Portal-Primary |

## Aliase (kein eigenes Hex)

- `--p2-green-dark` → `var(--p2-primary-dk)`
- `--p2-green-50` → `var(--p2-primary-soft)`
- Website-Bridge: `--primary` / `--accent` / `--ring` → `var(--fl-accent)`
- Portal-Bridge: dieselben → `var(--org-primary, var(--p2-primary))`

Related (dunkel/hell) bleiben als `--fl-accent-dark`, `--p2-primary-dk`, `--p2-primary-soft` usw.
