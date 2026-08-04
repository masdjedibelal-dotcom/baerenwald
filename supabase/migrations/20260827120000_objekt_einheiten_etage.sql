-- E2: Etage je Wohnungseinheit (HV-interne Bewohner-Tabelle)

alter table public.objekt_einheiten
  add column if not exists etage text;

comment on column public.objekt_einheiten.etage is
  'Etage / Stockwerk der Einheit (z. B. EG, 1. OG) — nur intern im HV-Portal';
