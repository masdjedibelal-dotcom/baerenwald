-- Partner-Portal: Annahme Rahmenvertrag inkl. Anlagen (Onboarding)

alter table public.handwerker_vertraege
  add column if not exists portal_akzeptiert_am timestamptz,
  add column if not exists portal_akzeptiert_auth_user_id uuid;

comment on column public.handwerker_vertraege.portal_akzeptiert_am is
  'Zeitpunkt der Portal-Annahme (RV inkl. Anlage 1 AVV + Anlage 2 Unterauftragsverarbeiter).';
comment on column public.handwerker_vertraege.portal_akzeptiert_auth_user_id is
  'Auth-User, der die Portal-Annahme bestätigt hat.';

do $migration$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'handwerker_vertraege_portal_akzeptiert_auth_user_id_fkey'
      and conrelid = 'public.handwerker_vertraege'::regclass
  ) then
    alter table public.handwerker_vertraege
      add constraint handwerker_vertraege_portal_akzeptiert_auth_user_id_fkey
      foreign key (portal_akzeptiert_auth_user_id) references auth.users (id) on delete set null;
  end if;
end $migration$;
