-- Eine E-Mail = ein Kundenstamm (Login-E-Mail führend, Name pro Stamm unverändert).
-- Bestehende Duplikate zusammenführen, danach Unique-Index.

-- 1) E-Mails normalisieren
update public.kunden
set email = lower(trim(email))
where email is not null
  and email <> lower(trim(email));

-- 2) Duplikate mergen (Daten umhängen, leere Stämme löschen)
do $merge$
declare
  grp record;
  canonical_id uuid;
  loser_id uuid;
  loser_auth uuid;
  lc int;
  ac int;
  auc int;
begin
  for grp in
    select lower(trim(email)) as norm_email
    from public.kunden
    where email is not null
      and trim(email) <> ''
    group by lower(trim(email))
    having count(*) > 1
  loop
    select k.id into canonical_id
    from public.kunden k
    left join lateral (
      select count(*)::int as c from public.leads l where l.kunde_id = k.id
    ) lc on true
    left join lateral (
      select count(*)::int as c from public.angebote a where a.kunde_id = k.id
    ) ac on true
    left join lateral (
      select count(*)::int as c from public.auftraege au where au.kunde_id = k.id
    ) auc on true
    where lower(trim(k.email)) = grp.norm_email
    order by
      (coalesce(lc.c, 0) + coalesce(ac.c, 0) + coalesce(auc.c, 0)) desc,
      (k.auth_user_id is not null) desc,
      k.created_at asc
    limit 1;

    for loser_id in
      select k.id
      from public.kunden k
      where lower(trim(k.email)) = grp.norm_email
        and k.id <> canonical_id
    loop
      update public.leads set kunde_id = canonical_id where kunde_id = loser_id;
      update public.angebote set kunde_id = canonical_id where kunde_id = loser_id;
      update public.auftraege set kunde_id = canonical_id where kunde_id = loser_id;
      update public.kunden_objekte set kunde_id = canonical_id where kunde_id = loser_id;

      select auth_user_id into loser_auth
      from public.kunden
      where id = loser_id;

      if loser_auth is not null then
        update public.kunden
        set auth_user_id = loser_auth
        where id = canonical_id
          and auth_user_id is null;
      end if;

      delete from public.kunden where id = loser_id;
    end loop;

    update public.kunden
    set email = grp.norm_email
    where id = canonical_id;
  end loop;
end $merge$;

-- 3) Unique: eine E-Mail darf nur einmal vorkommen
create unique index if not exists kunden_email_unique_lower_idx
  on public.kunden (lower(trim(email)))
  where email is not null and trim(email) <> '';

comment on index public.kunden_email_unique_lower_idx is
  'Eine Login-/Kontakt-E-Mail = genau ein Kundenstamm. Name und Daten hängen darunter.';
