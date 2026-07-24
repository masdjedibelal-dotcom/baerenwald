# TOM-Anlage — technische und organisatorische Maßnahmen

> Entwurf zur anwaltlichen Angemessenheitsprüfung. Stand Technik: Juli 2026.

## Zugriffskontrolle

- Rollenbasierte Berechtigungen: CRM (Bärenwald-Ops), Org-Portal (HV), Partner-Portal (Handwerker), Token-Status-Link (Mieter, read-only)
- Org-Portal: Admin vs. Nicht-Admin (`org-rbac.ts`); WL-Gate nur für Admins
- Keine geteilten Konten; Supabase Auth (Magic Link / E-Mail)

## Zugangs- / Übertragungskontrolle

- TLS für alle Verbindungen (Vercel/Hosting, Supabase)
- Mieter-Status nur über nicht erratbare Token (`meldeTrackingToken`)
- API-Routen mit Session-Checks (`requireOrganisationSession`, Partner-Auth)

## Eingabe- / Auftragskontrolle

- Vorgangs-Timeline / Kommentar-Threads / Freigabe-Log
- AVV digital (`av_akzeptiert_am`, `av_version` auf `kunden`)
- Subprozessoren-Register (docs/legal)

## Verfügbarkeit / Trennung

- Supabase Backups (Region EU — **[PRÜFEN]** Vertrag/Region prod)
- Mandantentrennung: `kunde_id` / Org-Kennung auf Leads und Objekten; Row Level Security auf `hv_portal_abnahmen` und weiteren Tabellen — **[ANWALT]** RLS-Umfang dokumentieren laufend

## Datensparsamkeit Betrieb

- **Keine E-Mails an Mieter** (`MIETER_EMAIL_ENABLED = false`); HV koordiniert
- Fotos: Hinweis „nur schadensrelevant, keine Personen“

## Offen / TODO

- [ ] Exakte Supabase-Region und Backup-Intervall aus Dashboard übernehmen
- [ ] Vercel-Region + DPA-Referenz
- [ ] Resend DPA + Versand-Logs Aufbewahrung
