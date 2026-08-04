-- Portal 2.0 B9 / E4 — Einladungs-Token (Mieter/Einheit)
-- STOP: Migration anzeigen, NICHT applyen bis Belal freigibt.
--
-- Spec E4: token, einheit_ref, status, expires
-- Bestehende leads.einladung_token bleibt für Vorab-Erfassung (meldung-vorab);
-- diese Tabelle deckt teilbare Objekt-/Einheiten-Links + Ablauf + Registrierung ab.

create table if not exists public.portal_einladungen (
  id uuid primary key default gen_random_uuid(),
  token text not null,
  kunde_id uuid not null references public.kunden (id) on delete cascade,
  objekt_id uuid references public.kunden_objekte (id) on delete set null,
  -- Spec einheit_ref (WE / Wohnungstext)
  einheit_ref text,
  einheit_id uuid references public.objekt_einheiten (id) on delete set null,
  bewohner_id uuid references public.einheit_bewohner (id) on delete set null,
  -- Nach Einlösung: Mieter-Kundenstamm (portal_modus typ. privat/mieter)
  portal_kunde_id uuid references public.kunden (id) on delete set null,
  status text not null default 'offen'
    check (status in ('offen', 'eingeloest', 'abgelaufen', 'entfallen')),
  expires_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  created_at timestamptz not null default now(),
  eingeloest_am timestamptz
);

create unique index if not exists portal_einladungen_token_uidx
  on public.portal_einladungen (token);

create index if not exists portal_einladungen_kunde_status_idx
  on public.portal_einladungen (kunde_id, status, created_at desc);

create index if not exists portal_einladungen_objekt_idx
  on public.portal_einladungen (objekt_id)
  where objekt_id is not null;

create index if not exists portal_einladungen_einheit_idx
  on public.portal_einladungen (einheit_id)
  where einheit_id is not null;

comment on table public.portal_einladungen is
  'Portal 2.0 E4/B9: Einladungs-Token für Mieter (teilbarer Link + QR). Mail nur mailto/HV-Branding, nie Bärenwald-Absender (D10/G5).';

comment on column public.portal_einladungen.einheit_ref is
  'Optionale Wohnungs-/Einheiten-Referenz (Spec einheit_ref), z. B. WE-Bezeichnung.';

comment on column public.portal_einladungen.einheit_id is
  'FK objekt_einheiten — Zuordnung Mieter↔Einheit bei Registrierung.';

comment on column public.portal_einladungen.expires_at is
  'Ablauf; null = unbegrenzt bis manuell entfallen.';

comment on column public.portal_einladungen.portal_kunde_id is
  'Kundenstamm des eingelösten Mieters (nach Registrierung).';

alter table public.portal_einladungen enable row level security;

drop policy if exists portal_einladungen_org_select on public.portal_einladungen;
create policy portal_einladungen_org_select
  on public.portal_einladungen for select to authenticated
  using (
    exists (
      select 1 from public.kunden_mitglieder m
      where m.kunde_id = portal_einladungen.kunde_id
        and m.auth_user_id = auth.uid()
        and m.aktiv = true
    )
  );

drop policy if exists portal_einladungen_org_insert on public.portal_einladungen;
create policy portal_einladungen_org_insert
  on public.portal_einladungen for insert to authenticated
  with check (
    exists (
      select 1 from public.kunden_mitglieder m
      where m.kunde_id = portal_einladungen.kunde_id
        and m.auth_user_id = auth.uid()
        and m.aktiv = true
    )
  );

drop policy if exists portal_einladungen_org_update on public.portal_einladungen;
create policy portal_einladungen_org_update
  on public.portal_einladungen for update to authenticated
  using (
    exists (
      select 1 from public.kunden_mitglieder m
      where m.kunde_id = portal_einladungen.kunde_id
        and m.auth_user_id = auth.uid()
        and m.aktiv = true
    )
  )
  with check (
    exists (
      select 1 from public.kunden_mitglieder m
      where m.kunde_id = portal_einladungen.kunde_id
        and m.auth_user_id = auth.uid()
        and m.aktiv = true
    )
  );

drop policy if exists portal_einladungen_service on public.portal_einladungen;
create policy portal_einladungen_service
  on public.portal_einladungen for all to service_role
  using (true) with check (true);
