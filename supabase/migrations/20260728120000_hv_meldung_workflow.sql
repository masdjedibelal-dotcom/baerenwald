-- HV-Meldungs-Workflow: Status, Preis-Unsicherheit, Kleinreparatur-Einstellungen

alter table public.kunden
  add column if not exists kleinreparatur_aktiv boolean not null default false,
  add column if not exists kleinreparatur_schwelle_eur numeric not null default 200;

comment on column public.kunden.kleinreparatur_aktiv is
  'HV darf Kleinreparaturen ohne formales Angebot freigeben (≤ Schwelle)';
comment on column public.kunden.kleinreparatur_schwelle_eur is
  'Max. geschätzter Betrag für Kleinreparatur ohne Angebot (Standard 200 €)';

alter table public.leads
  add column if not exists hv_meldung_status text,
  add column if not exists preis_unsicher boolean not null default false;

alter table public.leads
  drop constraint if exists leads_hv_meldung_status_check;

alter table public.leads
  add constraint leads_hv_meldung_status_check
  check (
    hv_meldung_status is null
    or hv_meldung_status in (
      'neu',
      'angebot_eingefordert',
      'kleinreparatur',
      'abgelehnt',
      'abgeschlossen'
    )
  );

comment on column public.leads.hv_meldung_status is
  'HV-Meldungs-Workflow: neu → angebot_eingefordert | kleinreparatur | abgelehnt';
comment on column public.leads.preis_unsicher is
  'Preisspanne konnte nicht zuverlässig berechnet werden';

create index if not exists leads_hv_meldung_status_idx
  on public.leads (auftraggeber_kunde_id, hv_meldung_status)
  where anlass = 'meldung' and auftraggeber_kunde_id is not null;
