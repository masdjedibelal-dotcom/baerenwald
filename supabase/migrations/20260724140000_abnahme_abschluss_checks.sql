-- F3: Abschluss-Checkliste je Leistung persistieren (JSONB)

alter table public.abnahme_protokolle
  add column if not exists abschluss_checks jsonb;

comment on column public.abnahme_protokolle.abschluss_checks is
  'Checkliste je Leistung + globale Checks (Partner-Abschluss).';
