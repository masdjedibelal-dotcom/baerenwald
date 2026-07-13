-- Abnahmeprotokoll: Handwerker + Kunde vor Ort, PDF für Portal/CRM

alter table public.auftraege
  add column if not exists abnahme_datum date,
  add column if not exists abnahme_protokoll_url text,
  add column if not exists abschlussdokumentation_url text,
  add column if not exists abschlussdokumentation_gesendet_at timestamptz;

create table if not exists public.abnahme_protokolle (
  id uuid primary key default gen_random_uuid(),
  auftrag_id uuid not null references public.auftraege(id) on delete cascade,
  handwerker_id uuid not null references public.handwerker(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  protokoll_text text not null,
  maengel_text text,
  ort text not null,
  abnahme_datum date not null,
  hw_unterschrift_name text not null,
  kunde_unterschrift_name text not null,
  pdf_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists abnahme_protokolle_auftrag_id_idx
  on public.abnahme_protokolle (auftrag_id);

create index if not exists abnahme_protokolle_lead_id_idx
  on public.abnahme_protokolle (lead_id);
