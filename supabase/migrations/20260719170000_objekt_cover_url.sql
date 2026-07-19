-- Portal: dekoratives Gebäudefoto je Objekt
alter table public.kunden_objekte
  add column if not exists cover_url text;

comment on column public.kunden_objekte.cover_url is
  'Öffentliche URL des Gebäudefotos (dekorativ, optional).';
