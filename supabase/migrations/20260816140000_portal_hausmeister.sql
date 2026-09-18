-- Hausmeister-Portal: Person + Objekt-Zuordnung (1 HM pro Objekt) + Auto-Toggle
-- STOP: Migration anzeigen, NICHT applyen bis Belal freigibt.

-- 1) portal_modus um hausmeister
alter table public.kunden
  drop constraint if exists kunden_portal_modus_check;

alter table public.kunden
  add constraint kunden_portal_modus_check
  check (portal_modus in ('privat', 'organisation', 'eigentuemer', 'hausmeister'));

comment on column public.kunden.portal_modus is
  'privat | organisation (HV) | eigentuemer | hausmeister';

-- 2) Freigabe: Auto an Hausmeister
alter table public.kunden
  add column if not exists hm_auto_zuweisen boolean not null default false;

comment on column public.kunden.hm_auto_zuweisen is
  'Wenn true: neue Meldungen (nicht Akut) automatisch in hm_pruefung an den Objekt-Hausmeister.';

-- 3) Org-Hausmeister (Personenstamm der HV)
create table if not exists public.org_hausmeister (
  id uuid primary key default gen_random_uuid(),
  org_kunde_id uuid not null references public.kunden (id) on delete cascade,
  name text not null,
  email text,
  portal_zugang boolean not null default false,
  portal_kunde_id uuid references public.kunden (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists org_hausmeister_org_idx
  on public.org_hausmeister (org_kunde_id);

create unique index if not exists org_hausmeister_org_email_uidx
  on public.org_hausmeister (org_kunde_id, lower(email))
  where email is not null and length(trim(email)) > 0;

comment on table public.org_hausmeister is
  'Hausmeister-Personen einer HV; optional Portal-Zugang (portal_kunde_id).';

alter table public.org_hausmeister enable row level security;

drop policy if exists org_hausmeister_org_all on public.org_hausmeister;
create policy org_hausmeister_org_all on public.org_hausmeister
  for all to authenticated
  using (
    org_kunde_id in (
      select id from public.kunden where auth_user_id = auth.uid()
      union
      select kunde_id from public.kunden_mitglieder where auth_user_id = auth.uid()
    )
  )
  with check (
    org_kunde_id in (
      select id from public.kunden where auth_user_id = auth.uid()
      union
      select kunde_id from public.kunden_mitglieder where auth_user_id = auth.uid()
    )
  );

drop policy if exists org_hausmeister_service on public.org_hausmeister;
create policy org_hausmeister_service on public.org_hausmeister
  for all to service_role using (true) with check (true);

-- 4) Zuordnung 1 HM pro Objekt
create table if not exists public.hausmeister_objekte (
  id uuid primary key default gen_random_uuid(),
  org_hausmeister_id uuid not null references public.org_hausmeister (id) on delete cascade,
  kunde_objekt_id uuid not null references public.kunden_objekte (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (kunde_objekt_id)
);

create index if not exists hausmeister_objekte_hm_idx
  on public.hausmeister_objekte (org_hausmeister_id);

comment on table public.hausmeister_objekte is
  'Genau ein aktiver Hausmeister pro Objekt; ein HM kann viele Objekte haben.';

alter table public.hausmeister_objekte enable row level security;

drop policy if exists hausmeister_objekte_org_all on public.hausmeister_objekte;
create policy hausmeister_objekte_org_all on public.hausmeister_objekte
  for all to authenticated
  using (
    org_hausmeister_id in (
      select id from public.org_hausmeister where org_kunde_id in (
        select id from public.kunden where auth_user_id = auth.uid()
        union
        select kunde_id from public.kunden_mitglieder where auth_user_id = auth.uid()
      )
    )
  )
  with check (
    org_hausmeister_id in (
      select id from public.org_hausmeister where org_kunde_id in (
        select id from public.kunden where auth_user_id = auth.uid()
        union
        select kunde_id from public.kunden_mitglieder where auth_user_id = auth.uid()
      )
    )
  );

drop policy if exists hausmeister_objekte_hm_select on public.hausmeister_objekte;
create policy hausmeister_objekte_hm_select on public.hausmeister_objekte
  for select to authenticated
  using (
    org_hausmeister_id in (
      select id from public.org_hausmeister hm
      where hm.portal_kunde_id in (
        select id from public.kunden where auth_user_id = auth.uid()
      )
    )
  );

drop policy if exists hausmeister_objekte_service on public.hausmeister_objekte;
create policy hausmeister_objekte_service on public.hausmeister_objekte
  for all to service_role using (true) with check (true);

-- 5) Einladung: optional org_hausmeister_id
alter table public.portal_einladungen
  add column if not exists org_hausmeister_id uuid
    references public.org_hausmeister (id) on delete set null;

comment on column public.portal_einladungen.org_hausmeister_id is
  'Hausmeister-Einladung (Portal-Zugang).';
