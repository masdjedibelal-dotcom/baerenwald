-- Einheit-Personen: Rolle Mieter/Eigentümer + Grunddaten

alter table public.einheit_bewohner
  add column if not exists rolle text not null default 'mieter';

do $$ begin
  alter table public.einheit_bewohner
    drop constraint if exists einheit_bewohner_rolle_check;
  alter table public.einheit_bewohner
    add constraint einheit_bewohner_rolle_check
    check (rolle in ('mieter', 'eigentuemer'));
exception when others then null;
end $$;

comment on column public.einheit_bewohner.rolle is
  'mieter | eigentuemer — Person an der Einheit';

-- Mieter-Grunddaten (optional)
alter table public.einheit_bewohner
  add column if not exists mietbeginn date,
  add column if not exists mietende date,
  add column if not exists miete_hinweis text;

-- Eigentümer: SE-Verwaltung durch HV?
alter table public.einheit_bewohner
  add column if not exists sondereigentum_verwaltung boolean not null default false;

comment on column public.einheit_bewohner.sondereigentum_verwaltung is
  'Nur Eigentümer: HV führt Sondereigentum (Default false).';

alter table public.einheit_bewohner
  add column if not exists notiz text;

-- Nach Portal-Einladung
alter table public.einheit_bewohner
  add column if not exists portal_kunde_id uuid references public.kunden (id) on delete set null;

create index if not exists einheit_bewohner_rolle_idx
  on public.einheit_bewohner (objekt_einheit_id, rolle)
  where aktiv = true and anonymisiert_am is null;
