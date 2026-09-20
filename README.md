# Bärenwald — Website + Portale

Next.js-App für Website, HV-/Partner-/Kunden-Portal und Melde-Funnel.

## Getting Started

```bash
npm install
npm run dev
```

Öffnet [http://localhost:3000](http://localhost:3000). Env: `.env.example` → `.env.local`.

## `@`-Alias (O2)

Pfad-Alias `@/*` → `./src/*` ist **doppelt** verdrahtet und bleibt so:

1. **`tsconfig.json`:** `baseUrl: "."` + `paths["@/*"]` — für TypeScript, IDE und Next-Typeresolution.
2. **`next.config.mjs` (Webpack):** `config.resolve.alias["@"]` → `src/` — weil allein die tsconfig-`paths` in diesem Projekt unzuverlässig waren (Build/Netlify: Module not found für `@/…`).

Beide beibehalten; nicht auf nur eine Variante reduzieren.

## PDF-Rendering (O5)

Portal erzeugt keine PDFs lokal (kein Chromium, kein produktives pdf-lib). Stattdessen:

- Org-/Partner-Routen laden Daten und prüfen Rechte.
- Server-seitig: `POST` an CRM `/api/pdf/render` mit `Authorization: Bearer ${PDF_SERVICE_SECRET}`.
- Env: `PDF_SERVICE_SECRET` (gleicher Wert wie CRM) + `NEXT_PUBLIC_CRM_URL` / `CRM_DASHBOARD_URL` als Basis.

Siehe CRM `docs/AUDIT-BLOCKER.md` **M10**.
