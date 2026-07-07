-- GPT Viz: Render-Brief + separate Inspirations-Analyse

alter table public.gpt_raum_sessions
  add column if not exists inspiration_analyse jsonb,
  add column if not exists viz_brief jsonb;

comment on column public.gpt_raum_sessions.inspiration_analyse is
  'Claude-Analyse des Inspirationsbildes (getrennt von Ist-Raumanalyse)';

comment on column public.gpt_raum_sessions.viz_brief is
  'Nutzer-Constraints für realistische Render-Pipeline (Modus, preserve, Antworten)';
