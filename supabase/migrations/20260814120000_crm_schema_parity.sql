-- CRM-Schema-Parität (gemeinsame Supabase-DB): Portal-Repo-Migrationen für lokale Entwicklung

-- Rechnungen: Fälligkeit + Zeitstempel für Resolver (überfällig)
alter table public.rechnungen
  add column if not exists faellig_am date,
  add column if not exists zahlungsziel_tage int,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

comment on column public.rechnungen.faellig_am is
  'Fälligkeitsdatum — wird im CRM-Resolver für Phase rechnung / überfällig genutzt.';

-- Aufträge: explizites Bauprojekt-Flag (Partner-Pflichten)
alter table public.auftraege
  add column if not exists ist_bauprojekt boolean;

comment on column public.auftraege.ist_bauprojekt is
  'CRM-Flag: Bauauftrag mit erweiterten Pflichten (Bautagebuch, Nachweise).';

-- Angebote: status_einfach „ersetzt“ (CRM-Resolver)
-- Kein neuer Enum-Constraint — Wert wird als Text in status_einfach gespeichert.

-- Zahlungsplan / Abschlagsrechnungen (CRM-Feature; Portal liest später)
create table if not exists public.auftrag_zahlungsplaene (
  id uuid primary key default gen_random_uuid(),
  auftrag_id uuid not null references public.auftraege(id) on delete cascade,
  titel text,
  gesamt_netto numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists auftrag_zahlungsplaene_auftrag_idx
  on public.auftrag_zahlungsplaene (auftrag_id);

create table if not exists public.auftrag_zahlungsplan_positionen (
  id uuid primary key default gen_random_uuid(),
  zahlungsplan_id uuid not null references public.auftrag_zahlungsplaene(id) on delete cascade,
  bezeichnung text not null,
  prozent numeric(5,2),
  betrag_netto numeric(12,2),
  faellig_am date,
  rechnung_id uuid references public.rechnungen(id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists auftrag_zahlungsplan_positionen_plan_idx
  on public.auftrag_zahlungsplan_positionen (zahlungsplan_id);

-- Bautagesberichte (CRM-intern; Portal nutzt auftrag_bautagebuch_eintraege)
create table if not exists public.auftrag_bautagesberichte (
  id uuid primary key default gen_random_uuid(),
  auftrag_id uuid not null references public.auftraege(id) on delete cascade,
  handwerker_id uuid references public.handwerker(id) on delete set null,
  bericht_datum date not null,
  inhalt text,
  pdf_path text,
  created_at timestamptz not null default now()
);

create index if not exists auftrag_bautagesberichte_auftrag_idx
  on public.auftrag_bautagesberichte (auftrag_id);
