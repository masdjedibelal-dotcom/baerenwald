-- Portal 2.0 TEIL E / E1 — Objekte-Liste (Andock an Bestand)
-- STOP: Migration anzeigen, NICHT applyen bis Belal freigibt.
--
-- Spec-Mapping (neue fachliche Namen → bestehende Tabellen):
--   organisation_ref  →  kunden_objekte.kunde_id
--   name              →  kunden_objekte.titel
--   adresse           →  strasse + hausnummer + plz + ort
--   typ               →  kunden_objekte.typ  (NEU; bisher Meta in notizen_intern)
--   Einheiten         →  public.objekt_einheiten (bestehend, Welle 0–3)
--
-- Melde-Links nutzen weiter melde_slug / melde_aktiv an kunden_objekte.

alter table public.kunden_objekte
  add column if not exists typ text;

comment on column public.kunden_objekte.typ is
  'E1: Objekttyp (Mehrfamilienhaus / Wohnanlage / Einfamilienhaus (B2C)); ersetzt schrittweise portal2-Meta in notizen_intern';

comment on table public.kunden_objekte is
  'HV-Objekte (Portal TEIL E). Spec organisation_ref=kunde_id, name=titel, adresse=strasse/hausnummer/plz/ort.';

-- Einheiten-Tabelle absichern (idempotent; erstellt in 20260801120000)
create table if not exists public.objekt_einheiten (
  id uuid primary key default gen_random_uuid(),
  kunde_objekt_id uuid not null references public.kunden_objekte (id) on delete cascade,
  bezeichnung text,
  wohnflaeche_m2 numeric,
  sort_order integer default 0,
  aktiv boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists objekt_einheiten_objekt_idx
  on public.objekt_einheiten (kunde_objekt_id);

comment on table public.objekt_einheiten is
  'E1/E2: Einheiten je Objekt — Count für Karten-Badge „n Wohneinheiten“ und Melde-Anzeige';
