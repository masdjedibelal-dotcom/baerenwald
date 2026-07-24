-- Portal-Dashboard-Hero je Organisation (ersetzt Default header-hero.jpg)
alter table public.kunden
  add column if not exists org_hero_url text;

comment on column public.kunden.org_hero_url is
  'Öffentliche URL des Dashboard-Hero-Bildes (optional, Fallback: Portal-Default).';
