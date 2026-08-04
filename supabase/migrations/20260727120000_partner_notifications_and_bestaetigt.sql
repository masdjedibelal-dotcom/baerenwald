-- Partner-Benachrichtigungen + bestaetigt_at auf angebot_handwerker (Vereinfachter Bestätigungs-Flow)

alter table public.angebot_handwerker
  add column if not exists bestaetigt_at timestamptz;

comment on column public.angebot_handwerker.bestaetigt_at is
  'Zeitpunkt verbindlicher Auftragsannahme durch Handwerker (Portal Tab Offen)';

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  handwerker_id uuid not null references public.handwerker(id) on delete cascade,
  typ text not null check (typ in ('neu', 'geaendert', 'entfernt', 'erinnerung')),
  projekt_name text not null default '',
  leistung_name text,
  gelesen boolean not null default false,
  link text,
  created_at timestamptz not null default now()
);

create index if not exists notifications_handwerker_unread_idx
  on public.notifications (handwerker_id, gelesen, created_at desc);

comment on table public.notifications is
  'Partner-Portal: Glocke + E-Mail-Trigger (CRM → /api/internal/partner-notify)';

alter table public.notifications enable row level security;

drop policy if exists "notifications_portal_select" on public.notifications;
create policy "notifications_portal_select"
  on public.notifications for select to authenticated
  using (handwerker_id = public.portal_handwerker_id());

drop policy if exists "notifications_portal_update" on public.notifications;
create policy "notifications_portal_update"
  on public.notifications for update to authenticated
  using (handwerker_id = public.portal_handwerker_id())
  with check (handwerker_id = public.portal_handwerker_id());

drop policy if exists "notifications_crm_staff_all" on public.notifications;
create policy "notifications_crm_staff_all"
  on public.notifications for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());
