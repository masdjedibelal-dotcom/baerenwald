-- Funnel-Website: 4-stelliger Registrierungs-Code + Auth-E-Mail-Check

create table if not exists public.funnel_portal_otp (
  email text primary key,
  code_hash text not null,
  user_id uuid references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists funnel_portal_otp_expires_idx
  on public.funnel_portal_otp (expires_at);

alter table public.funnel_portal_otp enable row level security;

-- Nur Service-Role (Server Actions) — keine Client-Policies
revoke all on table public.funnel_portal_otp from anon, authenticated;

create or replace function public.portal_auth_email_registered(p_email text)
returns boolean
language sql
security definer
set search_path = auth, public
as $$
  select exists(
    select 1
    from auth.users u
    where lower(u.email) = lower(trim(p_email))
  );
$$;

revoke all on function public.portal_auth_email_registered(text) from public;
grant execute on function public.portal_auth_email_registered(text) to service_role;
