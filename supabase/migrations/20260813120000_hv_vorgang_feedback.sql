-- HV-Feedback / Mängelmeldung nach Handwerker-Abschluss
create table if not exists public.hv_vorgang_feedback (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  auftrag_id uuid references public.auftraege(id) on delete set null,
  kunde_id uuid not null references public.kunden(id) on delete cascade,
  feedback_typ text not null,
  sterne int,
  freitext text,
  created_at timestamptz not null default now(),
  constraint hv_vorgang_feedback_typ_check check (
    feedback_typ in ('bewertung', 'maengel')
  ),
  constraint hv_vorgang_feedback_sterne_check check (
    sterne is null or (sterne >= 1 and sterne <= 5)
  ),
  constraint hv_vorgang_feedback_bewertung_sterne check (
    feedback_typ <> 'bewertung' or sterne is not null
  )
);

create unique index if not exists hv_vorgang_feedback_bewertung_uidx
  on public.hv_vorgang_feedback (lead_id, kunde_id)
  where feedback_typ = 'bewertung';

create index if not exists hv_vorgang_feedback_lead_idx
  on public.hv_vorgang_feedback (lead_id, created_at desc);

alter table public.hv_vorgang_feedback enable row level security;
drop policy if exists hv_vorgang_feedback_service on public.hv_vorgang_feedback;
create policy hv_vorgang_feedback_service on public.hv_vorgang_feedback
  for all to service_role using (true) with check (true);
