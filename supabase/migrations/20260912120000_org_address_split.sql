-- HV-Profil: Straße / Hausnummer / PLZ / Ort getrennt (wie Registrierung/CRM-Stamm).

alter table public.kunden
  add column if not exists org_hausnummer text,
  add column if not exists org_plz text;

comment on column public.kunden.org_strasse is 'HV-Stammdaten Straße (ohne Hausnummer)';
comment on column public.kunden.org_hausnummer is 'HV-Stammdaten Hausnummer';
comment on column public.kunden.org_plz is 'HV-Stammdaten PLZ';
comment on column public.kunden.org_ort is 'HV-Stammdaten Ort (ohne PLZ)';

-- Aus CRM-Registrierung übernehmen, wenn Portal-Felder leer
update public.kunden
set
  org_strasse = coalesce(nullif(trim(org_strasse), ''), nullif(trim(strasse), '')),
  org_hausnummer = coalesce(nullif(trim(org_hausnummer), ''), nullif(trim(hausnummer), '')),
  org_plz = coalesce(nullif(trim(org_plz), ''), nullif(trim(plz), '')),
  org_ort = coalesce(nullif(trim(org_ort), ''), nullif(trim(ort), ''))
where portal_modus = 'organisation';

-- Altes kombiniertes „PLZ Ort“ in org_ort aufteilen
update public.kunden
set
  org_plz = coalesce(
    nullif(trim(org_plz), ''),
    (regexp_match(trim(org_ort), '^(\d{5})\s+'))[1]
  ),
  org_ort = trim(regexp_replace(trim(org_ort), '^\d{5}\s+', ''))
where portal_modus = 'organisation'
  and org_ort ~ '^\d{5}\s+.+'
  and (org_plz is null or trim(org_plz) = '');

-- org_ort fälschlich = Hausnummer → Stamm-Ort übernehmen
update public.kunden
set org_ort = nullif(trim(ort), '')
where portal_modus = 'organisation'
  and nullif(trim(ort), '') is not null
  and nullif(trim(org_hausnummer), '') is not null
  and trim(coalesce(org_ort, '')) = trim(org_hausnummer);
