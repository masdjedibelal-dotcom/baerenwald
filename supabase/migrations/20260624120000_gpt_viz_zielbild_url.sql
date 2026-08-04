alter table public.gpt_raum_sessions
  add column if not exists zielbild_url text;

comment on column public.gpt_raum_sessions.zielbild_url is
  'Fertig komponiertes Feed-Zielbild (PNG) — identisch mit Chat-Export, für CRM';
