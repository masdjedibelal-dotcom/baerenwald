-- Portal 2.0 D8 — Eigentümer-Rolle
-- STOP: Migration anzeigen, NICHT applyen bis Belal freigibt.
--
-- Spec: Auth-Rolle (portal_modus), Zuordnung Eigentümer↔Objekte,
-- Schwellenwert am Eigentümer, Freigabe-Feld am Vorgang (Lead).

-- 1) portal_modus um 'eigentuemer' erweitern
alter table public.kunden
  drop constraint if exists kunden_portal_modus_check;

alter table public.kunden
  add constraint kunden_portal_modus_check
  check (portal_modus in ('privat', 'organisation', 'eigentuemer'));

comment on column public.kunden.portal_modus is
  'privat | organisation (HV) | eigentuemer — Portal 2.0 D7/D8';

-- 2) Schwellenwert am Eigentümer-Kundenstamm
alter table public.kunden
  add column if not exists eigentuemer_freigabe_schwelle_eur numeric(10,2);

comment on column public.kunden.eigentuemer_freigabe_schwelle_eur is
  'D8: Kostenfreigabe-Schwelle des Eigentümers (Mock-Beispiel 500 €)';

-- 3) Zuordnung Eigentümer ↔ Objekte
create table if not exists public.eigentuemer_objekte (
  id uuid primary key default gen_random_uuid(),
  kunde_id uuid not null references public.kunden (id) on delete cascade,
  kunde_objekt_id uuid not null references public.kunden_objekte (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (kunde_id, kunde_objekt_id)
);

create index if not exists eigentuemer_objekte_kunde_idx
  on public.eigentuemer_objekte (kunde_id);

create index if not exists eigentuemer_objekte_objekt_idx
  on public.eigentuemer_objekte (kunde_objekt_id);

comment on table public.eigentuemer_objekte is
  'D8: Welche Objekte ein Eigentümer-Portal-Nutzer sehen darf (Sichtbarkeit Vorgänge/Objekte).';

alter table public.eigentuemer_objekte enable row level security;

drop policy if exists eigentuemer_objekte_select_own on public.eigentuemer_objekte;
create policy eigentuemer_objekte_select_own
  on public.eigentuemer_objekte for select to authenticated
  using (
    kunde_id in (
      select id from public.kunden where auth_user_id = auth.uid()
    )
  );

drop policy if exists eigentuemer_objekte_service on public.eigentuemer_objekte;
create policy eigentuemer_objekte_service
  on public.eigentuemer_objekte for all to service_role
  using (true) with check (true);

-- 4) Freigabe-Feld am Vorgang (Lead)
alter table public.leads
  add column if not exists eigentuemer_freigabe_status text;

do $$ begin
  alter table public.leads
    drop constraint if exists leads_eigentuemer_freigabe_status_check;
  alter table public.leads
    add constraint leads_eigentuemer_freigabe_status_check
    check (
      eigentuemer_freigabe_status is null
      or eigentuemer_freigabe_status in (
        'ausstehend', 'freigegeben', 'abgelehnt', 'nicht_noetig'
      )
    );
exception when others then null;
end $$;

comment on column public.leads.eigentuemer_freigabe_status is
  'D8: Eigentümer-Kostenfreigabe — ausstehend | freigegeben | abgelehnt | nicht_noetig';
