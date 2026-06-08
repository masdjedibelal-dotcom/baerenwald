-- Bärenwald GPT: Raumvisualisierung / Projekt-Studio Sessions

create table if not exists public.gpt_raum_sessions (
  id uuid primary key default gen_random_uuid(),
  ist_bilder_urls text[] not null default '{}',
  raum_analyse jsonb,
  wunsch_text text,
  render_prompt text,
  ergebnis_bild_url text,
  ergebnis_historie jsonb not null default '[]',
  gpt_erklaerung jsonb,
  render_count int not null default 0,
  ki_chat_verlauf jsonb not null default '[]',
  funnel_quelle text not null default 'gpt_raumvisualisierung',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create index if not exists gpt_raum_sessions_expires_idx
  on public.gpt_raum_sessions (expires_at);

comment on table public.gpt_raum_sessions is
  'Anonyme GPT-Raumvisualisierung / Projekt-Studio (7 Tage TTL)';

-- Service role only (API-Routes nutzen supabaseAdmin)
alter table public.gpt_raum_sessions enable row level security;

drop policy if exists "gpt_raum_sessions_service_all" on public.gpt_raum_sessions;
create policy "gpt_raum_sessions_service_all"
  on public.gpt_raum_sessions for all to service_role
  using (true)
  with check (true);
