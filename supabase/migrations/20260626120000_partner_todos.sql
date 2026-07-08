-- Partner-Portal: persönliche To-Do-Liste pro Handwerker

create table if not exists public.partner_todos (
  id uuid primary key default gen_random_uuid(),
  handwerker_id uuid not null references public.handwerker (id) on delete cascade,
  titel text not null check (char_length(trim(titel)) > 0),
  erledigt boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_todos_handwerker_sort_idx
  on public.partner_todos (handwerker_id, erledigt, sort_order, created_at desc);

comment on table public.partner_todos is
  'Private Aufgabenliste im Partner-Portal (keine Kundendaten).';

alter table public.partner_todos enable row level security;

drop policy if exists "partner_todos_crm_staff_all" on public.partner_todos;
create policy "partner_todos_crm_staff_all"
  on public.partner_todos for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

drop policy if exists "partner_todos_portal_select_own" on public.partner_todos;
create policy "partner_todos_portal_select_own"
  on public.partner_todos for select to authenticated
  using (
    public.is_portal_handwerker()
    and handwerker_id = public.portal_handwerker_id()
  );

drop policy if exists "partner_todos_portal_insert_own" on public.partner_todos;
create policy "partner_todos_portal_insert_own"
  on public.partner_todos for insert to authenticated
  with check (
    public.is_portal_handwerker()
    and handwerker_id = public.portal_handwerker_id()
  );

drop policy if exists "partner_todos_portal_update_own" on public.partner_todos;
create policy "partner_todos_portal_update_own"
  on public.partner_todos for update to authenticated
  using (
    public.is_portal_handwerker()
    and handwerker_id = public.portal_handwerker_id()
  )
  with check (
    public.is_portal_handwerker()
    and handwerker_id = public.portal_handwerker_id()
  );

drop policy if exists "partner_todos_portal_delete_own" on public.partner_todos;
create policy "partner_todos_portal_delete_own"
  on public.partner_todos for delete to authenticated
  using (
    public.is_portal_handwerker()
    and handwerker_id = public.portal_handwerker_id()
  );

create or replace function public.partner_todos_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists partner_todos_updated_at on public.partner_todos;
create trigger partner_todos_updated_at
  before update on public.partner_todos
  for each row execute function public.partner_todos_set_updated_at();
