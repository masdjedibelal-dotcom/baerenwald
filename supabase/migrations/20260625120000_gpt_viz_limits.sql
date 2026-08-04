alter table public.gpt_raum_sessions
  add column if not exists lead_submitted_at timestamptz,
  add column if not exists kunde_id uuid references public.kunden (id) on delete set null,
  add column if not exists visitor_token text,
  add column if not exists analyze_count int not null default 0;

create index if not exists gpt_raum_sessions_visitor_created_idx
  on public.gpt_raum_sessions (visitor_token, created_at desc)
  where visitor_token is not null;

create index if not exists gpt_raum_sessions_kunde_created_idx
  on public.gpt_raum_sessions (kunde_id, created_at desc)
  where kunde_id is not null;

comment on column public.gpt_raum_sessions.lead_submitted_at is
  'Anfrage über GPT-Lead-API — schaltet zusätzliche Renders frei';
comment on column public.gpt_raum_sessions.kunde_id is
  'Eingeloggter Portal-Kunde — höhere Limits';
comment on column public.gpt_raum_sessions.visitor_token is
  'Anonymer Browser-Token — Session-Quota ohne IP-Limit';
