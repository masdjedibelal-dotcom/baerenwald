-- Plattform Ausbau 3c/4: Termine, Chat, Feedback, Prüfpflichten, Storno, Objekt-Schwelle
-- Idempotent

-- Storno / Zurückziehen
alter table public.leads
  add column if not exists storniert_am timestamptz,
  add column if not exists storniert_grund text,
  add column if not exists storniert_von text;

-- Freigabeschwelle je Objekt (Override)
alter table public.kunden_objekte
  add column if not exists freigabe_schwelle_eur numeric(10,2);

-- Vorgangs-Kommentare HV ↔ Bärenwald
create table if not exists public.vorgang_kommentare (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  kunde_id uuid references public.kunden(id) on delete set null,
  actor_rolle text not null,
  actor_name text,
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists vorgang_kommentare_lead_idx
  on public.vorgang_kommentare (lead_id, created_at asc);

alter table public.vorgang_kommentare enable row level security;

drop policy if exists vorgang_kommentare_org_select on public.vorgang_kommentare;
create policy vorgang_kommentare_org_select on public.vorgang_kommentare
  for select to authenticated
  using (kunde_id = public.portal_kunde_id());

drop policy if exists vorgang_kommentare_service on public.vorgang_kommentare;
create policy vorgang_kommentare_service on public.vorgang_kommentare
  for all to service_role using (true) with check (true);

-- Partner-Rückfragen am Auftrag
create table if not exists public.auftrag_rueckfragen (
  id uuid primary key default gen_random_uuid(),
  auftrag_id uuid not null references public.auftraege(id) on delete cascade,
  handwerker_id uuid not null references public.handwerker(id) on delete cascade,
  text text not null,
  foto_urls jsonb not null default '[]'::jsonb,
  status text not null default 'offen',
  antwort_text text,
  antwort_am timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists auftrag_rueckfragen_auftrag_idx
  on public.auftrag_rueckfragen (auftrag_id, created_at desc);

alter table public.auftrag_rueckfragen enable row level security;
drop policy if exists auftrag_rueckfragen_service on public.auftrag_rueckfragen;
create policy auftrag_rueckfragen_service on public.auftrag_rueckfragen
  for all to service_role using (true) with check (true);

-- Terminvorschläge Mieter ↔ Handwerker
create table if not exists public.auftrag_terminslots (
  id uuid primary key default gen_random_uuid(),
  auftrag_id uuid not null references public.auftraege(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  slot_beginn timestamptz not null,
  slot_ende timestamptz,
  status text not null default 'vorgeschlagen',
  bestaetigt_am timestamptz,
  abgesagt_am timestamptz,
  absage_grund text,
  created_at timestamptz not null default now()
);

create index if not exists auftrag_terminslots_auftrag_idx
  on public.auftrag_terminslots (auftrag_id, slot_beginn);

alter table public.auftrag_terminslots drop constraint if exists auftrag_terminslots_status_check;
alter table public.auftrag_terminslots add constraint auftrag_terminslots_status_check check (
  status in ('vorgeschlagen', 'bestaetigt', 'abgesagt', 'abgelaufen')
);

alter table public.auftrag_terminslots enable row level security;
drop policy if exists auftrag_terminslots_service on public.auftrag_terminslots;
create policy auftrag_terminslots_service on public.auftrag_terminslots
  for all to service_role using (true) with check (true);

-- Mieter-Feedback
create table if not exists public.mieter_feedback (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  auftrag_id uuid references public.auftraege(id) on delete set null,
  sterne int not null,
  freitext text,
  created_at timestamptz not null default now(),
  constraint mieter_feedback_sterne_check check (sterne >= 1 and sterne <= 5)
);

create unique index if not exists mieter_feedback_lead_uidx
  on public.mieter_feedback (lead_id);

-- Prüfpflichten je Objekt
create table if not exists public.objekt_pruefpflichten (
  id uuid primary key default gen_random_uuid(),
  kunde_objekt_id uuid not null references public.kunden_objekte(id) on delete cascade,
  typ text not null,
  intervall_monate int,
  letzte_pruefung date,
  naechste_faellig date,
  nachweis_dokument_id uuid,
  quelle text not null default 'manuell',
  status text not null default 'aktiv',
  created_at timestamptz not null default now()
);

create index if not exists objekt_pruefpflichten_objekt_idx
  on public.objekt_pruefpflichten (kunde_objekt_id, naechste_faellig);

alter table public.objekt_pruefpflichten drop constraint if exists objekt_pruefpflichten_quelle_check;
alter table public.objekt_pruefpflichten add constraint objekt_pruefpflichten_quelle_check check (
  quelle in ('abo', 'manuell', 'crm')
);

-- HV-Benachrichtigungen
create table if not exists public.hv_notifications (
  id uuid primary key default gen_random_uuid(),
  kunde_id uuid not null references public.kunden(id) on delete cascade,
  auth_user_id uuid,
  typ text not null,
  titel text not null,
  body text,
  link text,
  gelesen_am timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists hv_notifications_kunde_idx
  on public.hv_notifications (kunde_id, created_at desc);

alter table public.hv_notifications enable row level security;
drop policy if exists hv_notifications_org_select on public.hv_notifications;
create policy hv_notifications_org_select on public.hv_notifications
  for select to authenticated
  using (kunde_id = public.portal_kunde_id());

drop policy if exists hv_notifications_service on public.hv_notifications;
create policy hv_notifications_service on public.hv_notifications
  for all to service_role using (true) with check (true);

-- Benachrichtigungs-Präferenzen je HV-User
create table if not exists public.hv_notification_prefs (
  id uuid primary key default gen_random_uuid(),
  kunde_id uuid not null references public.kunden(id) on delete cascade,
  auth_user_id uuid not null,
  kategorie text not null,
  modus text not null default 'sofort',
  created_at timestamptz not null default now(),
  unique (kunde_id, auth_user_id, kategorie)
);

alter table public.hv_notification_prefs drop constraint if exists hv_notification_prefs_modus_check;
alter table public.hv_notification_prefs add constraint hv_notification_prefs_modus_check check (
  modus in ('sofort', 'digest', 'nur_notfall')
);

-- Meldung: Video-Anhänge (URLs in funnel_daten.melde_fotos erweitert um typ)
-- Kein Schema-Change nötig — JSONB flexibel

-- View: Objekt-Kosten (Basis für Dashboard)
-- Objekt kommt über Lead oder Angebot — nicht direkt auf auftraege
create or replace view public.v_objekt_kosten as
select
  r.kunde_id,
  coalesce(l.kunde_objekt_id, ab.kunde_objekt_id) as kunde_objekt_id,
  date_trunc('year', coalesce(r.rechnungsdatum, r.created_at))::date as jahr,
  sum(r.brutto) as brutto_gesamt,
  sum(coalesce(r.lohnanteil_eur, 0)) as lohnanteil_gesamt,
  r.kostentraeger,
  count(*)::int as anzahl_rechnungen
from public.rechnungen r
left join public.auftraege a on a.id = r.auftrag_id
left join public.leads l on l.id = a.lead_id
left join public.angebote ab on ab.id = a.angebot_id
where r.status is distinct from 'storniert'
group by
  r.kunde_id,
  coalesce(l.kunde_objekt_id, ab.kunde_objekt_id),
  date_trunc('year', coalesce(r.rechnungsdatum, r.created_at)),
  r.kostentraeger;
