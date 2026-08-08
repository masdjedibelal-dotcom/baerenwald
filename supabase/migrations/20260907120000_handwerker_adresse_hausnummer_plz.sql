-- Handwerker-Anschrift: Hausnummer + PLZ getrennt (Portal Firmendaten ↔ CRM)
-- Bestehend: strasse, ort (oft „PLZ Ort“ kombiniert), adresse (Legacy / Einsatzgebiet).

alter table public.handwerker
  add column if not exists hausnummer text,
  add column if not exists plz text;

comment on column public.handwerker.hausnummer is
  'Hausnummer zur Straße (Portal Firmendaten / CRM Stammdaten)';
comment on column public.handwerker.plz is
  'PLZ (Portal Firmendaten / CRM Stammdaten); ort nur noch Ortsname';

-- PLZ aus kombiniertem ort („80331 München“) herauslösen
update public.handwerker
set
  plz = coalesce(nullif(trim(plz), ''), substring(trim(ort) from '^\d{5}')),
  ort = nullif(trim(regexp_replace(trim(ort), '^\d{5}\s*', '')), '')
where ort is not null
  and trim(ort) ~ '^\d{5}(\s+|$)'
  and (plz is null or trim(plz) = '');

-- Hausnummer am Ende von strasse („Musterstraße 12a“) herauslösen, wenn leer
update public.handwerker
set
  hausnummer = coalesce(
    nullif(trim(hausnummer), ''),
    nullif(trim((regexp_match(trim(strasse), '\s+(\d+\s*[a-zA-Z]?)$'))[1]), '')
  ),
  strasse = nullif(
    trim(regexp_replace(trim(strasse), '\s+\d+\s*[a-zA-Z]?$', '')),
    ''
  )
where strasse is not null
  and trim(strasse) ~ '\s+\d+\s*[a-zA-Z]?$'
  and (hausnummer is null or trim(hausnummer) = '');
