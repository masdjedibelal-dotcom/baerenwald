-- HV-Portal: digitale Abnahme & Signatur (Design Phase D)

create table if not exists public.hv_portal_abnahmen (
  id uuid primary key default gen_random_uuid(),
  auftrag_id uuid not null references public.auftraege(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  kunde_id uuid references public.kunden(id) on delete set null,
  art text not null check (art in ('ohne_vorbehalt', 'mit_anmerkung', 'zurueckgewiesen')),
  anmerkung text,
  signatur_png text,
  signiert_name text not null,
  signiert_am timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists hv_portal_abnahmen_auftrag_id_uidx
  on public.hv_portal_abnahmen (auftrag_id);

create index if not exists hv_portal_abnahmen_lead_id_idx
  on public.hv_portal_abnahmen (lead_id);

alter table public.hv_portal_abnahmen enable row level security;
