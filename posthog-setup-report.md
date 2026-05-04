<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into **Bärenwald München** (Next.js 14, App Router). The setup covers the full user journey — from landing page hero engagement through the multi-step Preisrechner (price calculator) funnel to server-confirmed lead creation.

## Summary of changes

| File | Change |
|------|--------|
| `package.json` | Added `posthog-js` and `posthog-node` dependencies |
| `.env.local` | Added `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` |
| `next.config.mjs` | Added `/ingest` reverse proxy rewrites for EU PostHog endpoints + `skipTrailingSlashRedirect: true` |
| `src/app/providers.tsx` | **New file** — `PHProvider` client component that initialises `posthog-js` and wraps the app in `PostHogProvider` |
| `src/app/layout.tsx` | Wrapped `<body>` children with `<PHProvider>` |
| `src/lib/posthog-server.ts` | **New file** — singleton `getPostHogClient()` for server-side event capture via `posthog-node` |
| `src/app/rechner/FunnelClient.tsx` | 5 client-side funnel events (see table below) |
| `src/app/baerenwald-landing-client.tsx` | 3 landing page events — hero search, chip clicks, phone CTA |
| `src/app/api/leads/route.ts` | Server-side `server_lead_created` event after successful lead persistence |
| `src/app/api/save-price/route.ts` | Server-side `server_price_email_sent` event after successful price email delivery |

## Events instrumented

| Event | Description | File |
|-------|-------------|------|
| `funnel_situation_selected` | User confirms a situation selection (Renovierung, Neubau, Akut, etc.) and advances from step 0 | `src/app/rechner/FunnelClient.tsx` |
| `funnel_price_calculated` | User completes the PLZ/Zeitraum step and triggers price calculation before the loading screen | `src/app/rechner/FunnelClient.tsx` |
| `funnel_result_viewed` | Price result screen is shown after the loading animation completes | `src/app/rechner/FunnelClient.tsx` |
| `funnel_contact_step_reached` | User advances from result screen to the contact/appointment step | `src/app/rechner/FunnelClient.tsx` |
| `funnel_lead_submitted` | Lead form is submitted successfully and user reaches the thank-you screen | `src/app/rechner/FunnelClient.tsx` |
| `hero_search_submitted` | User submits the hero search form on the landing page | `src/app/baerenwald-landing-client.tsx` |
| `hero_chip_clicked` | User clicks a quick-access service chip (Bad, Boden, Streichen, etc.) on the landing page | `src/app/baerenwald-landing-client.tsx` |
| `cta_phone_clicked` | User clicks a phone CTA link on the landing page | `src/app/baerenwald-landing-client.tsx` |
| `server_lead_created` | Server-side: a lead is successfully persisted via the /api/leads endpoint | `src/app/api/leads/route.ts` |
| `server_price_email_sent` | Server-side: price estimate email is successfully sent via /api/save-price | `src/app/api/save-price/route.ts` |

## Next steps

We've built a dashboard and five insights to monitor user behavior based on the events just instrumented:

- **Dashboard — Analytics basics**: https://eu.posthog.com/project/171845/dashboard/658606

| Insight | URL |
|---------|-----|
| Rechner-Funnel: Situation → Lead | https://eu.posthog.com/project/171845/insights/uTVakr9S |
| Leads erstellt (täglich) | https://eu.posthog.com/project/171845/insights/A86lhX6S |
| Hero-Engagement: Suche & Chips | https://eu.posthog.com/project/171845/insights/hyQLgYXK |
| Telefon-CTA Klicks | https://eu.posthog.com/project/171845/insights/b8IOTdwm |
| Preisrechner-Situationen (Aufschlüsselung) | https://eu.posthog.com/project/171845/insights/yJYaiCTm |

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
