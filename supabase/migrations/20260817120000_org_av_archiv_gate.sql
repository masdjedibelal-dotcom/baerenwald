-- AV-Archiv (Volltext + User) und WL-Ansprache für 30-Tage-Bestands-Gate

alter table public.kunden
  add column if not exists av_akzeptiert_von uuid,
  add column if not exists av_text_snapshot text,
  add column if not exists wl_ansprache_am timestamptz;

comment on column public.kunden.av_akzeptiert_von is 'Auth-User-ID bei AV-Akzeptanz (Org-Portal)';
comment on column public.kunden.av_text_snapshot is 'Archivierter AV-Volltext zum Zeitpunkt der Akzeptanz';
comment on column public.kunden.wl_ansprache_am is 'Start der 30-Tage-Übergangsfrist (Bestands-HVs)';

-- Bestands-Organisationen: Ansprache ab Go-Live WL-Wave (Übergangsfrist läuft ab diesem Datum)
update public.kunden
set wl_ansprache_am = timestamptz '2026-07-09 00:00:00+02'
where portal_modus = 'organisation'
  and wl_ansprache_am is null;
