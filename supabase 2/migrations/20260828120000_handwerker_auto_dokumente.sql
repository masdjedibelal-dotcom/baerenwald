-- Auto-Angebot / Auto-Rechnung: Logo, Nummerkreis, Kleinunternehmer
-- STOP: Migration anzeigen, NICHT applyen bis Belal freigibt.

alter table public.handwerker
  add column if not exists logo_url text,
  add column if not exists rechnungsnr_seq integer not null default 0,
  add column if not exists kleinunternehmer boolean not null default false;

comment on column public.handwerker.logo_url is
  'Storage-Pfad oder URL Firmenlogo für Angebote/Rechnungen';
comment on column public.handwerker.rechnungsnr_seq is
  'Fortlaufender Zähler für Partner-Rechnungsnummern (pro Jahr manuell zurücksetzbar)';
comment on column public.handwerker.kleinunternehmer is
  '§19 UStG — Rechnung ohne MwSt-Ausweis, mit Kleinunternehmer-Hinweis';
