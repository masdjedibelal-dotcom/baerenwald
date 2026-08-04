-- Partner-Portal: Projektvertrag + Compliance-Unterlagen
-- CRM erzeugt Verträge; Partner liest/hochlädt/bestätigt im Portal.

-- ---------------------------------------------------------------------------
-- 1) auftrag_handwerker — Vertragsbestätigung
-- ---------------------------------------------------------------------------
alter table public.auftrag_handwerker
  add column if not exists projektvertrag_bestaetigt_am timestamptz;

comment on column public.auftrag_handwerker.projektvertrag_bestaetigt_am is
  'Zeitpunkt verbindlicher Annahme des Projekt-Nachunternehmervertrags durch den Handwerker';

-- ---------------------------------------------------------------------------
-- 2) handwerker_vertraege (falls CRM noch nicht migriert hat)
-- ---------------------------------------------------------------------------
create table if not exists public.handwerker_vertraege (
  id uuid primary key default gen_random_uuid(),
  handwerker_id uuid not null references public.handwerker (id) on delete cascade,
  auftrag_id uuid references public.auftraege (id) on delete cascade,
  typ text not null default 'projekt',
  vertrags_nr text,
  status text not null default 'entwurf',
  pdf_url text,
  auftrag_titel text,
  gewerk_name text,
  bauvorhaben text,
  leistungsumfang text,
  verguetung_text text,
  signiert_am timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists handwerker_vertraege_hw_auftrag_idx
  on public.handwerker_vertraege (handwerker_id, auftrag_id)
  where typ = 'projekt';

-- ---------------------------------------------------------------------------
-- 3) compliance_dokument_typen
-- ---------------------------------------------------------------------------
create table if not exists public.compliance_dokument_typen (
  slug text primary key,
  bezeichnung text not null,
  beschreibung text,
  pflicht_bauprojekt boolean not null default false,
  mehrfach_erlaubt boolean not null default false,
  kategorie text,
  sort_order int not null default 0,
  scope text not null default 'bauprojekt',
  aktiv boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4) partner_dokumente
-- ---------------------------------------------------------------------------
create table if not exists public.partner_dokumente (
  id uuid primary key default gen_random_uuid(),
  handwerker_id uuid not null references public.handwerker (id) on delete cascade,
  auftrag_id uuid references public.auftraege (id) on delete cascade,
  typ text not null,
  bezeichnung text,
  gueltig_bis date,
  datei_url text not null,
  status text not null default 'hochgeladen',
  ablehnung_grund text,
  hochgeladen_am timestamptz not null default now(),
  freigegeben_am timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists partner_dokumente_hw_auftrag_idx
  on public.partner_dokumente (handwerker_id, auftrag_id);

create index if not exists partner_dokumente_hw_typ_idx
  on public.partner_dokumente (handwerker_id, typ);

-- ---------------------------------------------------------------------------
-- 5) RLS handwerker_vertraege
-- ---------------------------------------------------------------------------
alter table public.handwerker_vertraege enable row level security;

drop policy if exists "handwerker_vertraege_crm_staff_all" on public.handwerker_vertraege;
create policy "handwerker_vertraege_crm_staff_all"
  on public.handwerker_vertraege for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

drop policy if exists "handwerker_vertraege_portal_select" on public.handwerker_vertraege;
create policy "handwerker_vertraege_portal_select"
  on public.handwerker_vertraege for select to authenticated
  using (
    public.is_portal_handwerker()
    and handwerker_id = public.portal_handwerker_id()
  );

-- ---------------------------------------------------------------------------
-- 6) RLS compliance_dokument_typen (lesen)
-- ---------------------------------------------------------------------------
alter table public.compliance_dokument_typen enable row level security;

drop policy if exists "compliance_dokument_typen_crm_staff_all" on public.compliance_dokument_typen;
create policy "compliance_dokument_typen_crm_staff_all"
  on public.compliance_dokument_typen for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

drop policy if exists "compliance_dokument_typen_portal_select" on public.compliance_dokument_typen;
create policy "compliance_dokument_typen_portal_select"
  on public.compliance_dokument_typen for select to authenticated
  using (
    public.is_portal_handwerker()
    and aktiv = true
    and scope in ('bauprojekt', 'gewerk', 'stamm')
  );

-- ---------------------------------------------------------------------------
-- 7) RLS partner_dokumente
-- ---------------------------------------------------------------------------
alter table public.partner_dokumente enable row level security;

drop policy if exists "partner_dokumente_crm_staff_all" on public.partner_dokumente;
create policy "partner_dokumente_crm_staff_all"
  on public.partner_dokumente for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

drop policy if exists "partner_dokumente_portal_select" on public.partner_dokumente;
create policy "partner_dokumente_portal_select"
  on public.partner_dokumente for select to authenticated
  using (
    public.is_portal_handwerker()
    and handwerker_id = public.portal_handwerker_id()
  );

drop policy if exists "partner_dokumente_portal_insert" on public.partner_dokumente;
create policy "partner_dokumente_portal_insert"
  on public.partner_dokumente for insert to authenticated
  with check (
    public.is_portal_handwerker()
    and handwerker_id = public.portal_handwerker_id()
    and (
      auftrag_id is null
      or auftrag_id in (
        select ah.auftrag_id from public.auftrag_handwerker ah
        where ah.handwerker_id = public.portal_handwerker_id()
        union
        select ap.auftrag_id from public.auftrag_positionen ap
        where ap.handwerker_id = public.portal_handwerker_id()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 8) auftrag_handwerker — Partner darf Vertragsbestätigung setzen (nur dieses Feld)
-- ---------------------------------------------------------------------------
drop policy if exists "auftrag_handwerker_portal_update" on public.auftrag_handwerker;
create policy "auftrag_handwerker_portal_update"
  on public.auftrag_handwerker for update to authenticated
  using (
    public.is_portal_handwerker()
    and handwerker_id = public.portal_handwerker_id()
  )
  with check (
    public.is_portal_handwerker()
    and handwerker_id = public.portal_handwerker_id()
  );
