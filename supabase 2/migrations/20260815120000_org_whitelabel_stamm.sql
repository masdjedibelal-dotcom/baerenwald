-- White-Label / Mieter-Kommunikation (Wave WL)

alter table public.kunden
  add column if not exists org_primary_color text,
  add column if not exists mieter_kontakt_telefon text,
  add column if not exists mieter_kontakt_email text,
  add column if not exists mieter_kontakt_hinweis text,
  add column if not exists av_akzeptiert_am timestamptz,
  add column if not exists av_version text,
  add column if not exists impressum_url text,
  add column if not exists datenschutz_url text;

comment on column public.kunden.mieter_kontakt_telefon is 'Mieter-Fußzeile / No-Reply-Hinweis (WL)';
comment on column public.kunden.mieter_kontakt_email is 'Mieter-Fußzeile E-Mail (WL)';
comment on column public.kunden.av_akzeptiert_am is 'AV-Vertrag akzeptiert (Organisation-Onboarding)';
