-- Portal 2.0 D11 — Angebot-Herkunft (Handwerker-Kalkulation)
-- STOP: Migration anzeigen, NICHT applyen bis Belal freigibt.
--
-- Spec: Einreichen erzeugt Angebots-Datensatz mit Quelle „handwerker“,
-- sichtbar im CRM und in D3 als „Empfohlenes Angebot“.

alter table public.angebote
  add column if not exists herkunft text;

do $$ begin
  alter table public.angebote
    drop constraint if exists angebote_herkunft_check;
  alter table public.angebote
    add constraint angebote_herkunft_check
    check (
      herkunft is null
      or herkunft in ('crm', 'handwerker', 'kunde', 'system')
    );
exception when others then null;
end $$;

comment on column public.angebote.herkunft is
  'D11: Quelle des Angebots — handwerker = HW-Kalkulation (Empfohlenes Angebot in D3)';

create index if not exists angebote_herkunft_idx
  on public.angebote (herkunft)
  where herkunft is not null;
