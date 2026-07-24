-- Untertitel Header: Legacy „Hausverwaltung“ → „Verwaltung“

update public.kunden
set org_sub = 'Verwaltung'
where lower(trim(coalesce(org_sub, ''))) = 'hausverwaltung'
   or nullif(trim(org_sub), '') is null;

comment on column public.kunden.org_sub is
  'Untertitel Sidebar/Header, Default Verwaltung';
