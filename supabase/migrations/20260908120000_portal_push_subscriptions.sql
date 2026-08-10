-- PWA Web Push: Subscriptions + Master-Prefs je Auth-User

create table if not exists public.push_prefs (
  auth_user_id uuid primary key references auth.users (id) on delete cascade,
  push_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

comment on table public.push_prefs is
  'Master-Toggle für OS-/PWA-Push (In-App-Glocke bleibt unabhängig).';

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  portal text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (endpoint)
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (auth_user_id);

comment on table public.push_subscriptions is
  'Web-Push-Endpoints (VAPID) je Gerät/Browser für eingeloggte Portal-User.';

alter table public.push_prefs enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists push_prefs_select_own on public.push_prefs;
create policy push_prefs_select_own
  on public.push_prefs for select to authenticated
  using (auth.uid() = auth_user_id);

drop policy if exists push_prefs_upsert_own on public.push_prefs;
create policy push_prefs_upsert_own
  on public.push_prefs for all to authenticated
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
create policy push_subscriptions_select_own
  on public.push_subscriptions for select to authenticated
  using (auth.uid() = auth_user_id);

drop policy if exists push_subscriptions_insert_own on public.push_subscriptions;
create policy push_subscriptions_insert_own
  on public.push_subscriptions for insert to authenticated
  with check (auth.uid() = auth_user_id);

drop policy if exists push_subscriptions_update_own on public.push_subscriptions;
create policy push_subscriptions_update_own
  on public.push_subscriptions for update to authenticated
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

drop policy if exists push_subscriptions_delete_own on public.push_subscriptions;
create policy push_subscriptions_delete_own
  on public.push_subscriptions for delete to authenticated
  using (auth.uid() = auth_user_id);
