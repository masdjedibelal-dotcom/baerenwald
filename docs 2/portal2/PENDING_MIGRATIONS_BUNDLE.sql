
/* ========== 20260815120000_org_whitelabel_stamm.sql ========== */
-- White-Label / Mieter-Kommunikation (Wave WL)

alter table public.kunden
  add column if not exists org_primary_color text,
  add column if not exists mieter_kontakt_telefon text,
  add column if not exists mieter_kontakt_email text,
  add column if not exists mieter_kontakt_hinweis text,
  add column if not exists av_akzeptiert_am timestamptz,
  add column if not exists av_version text,
  add column if not exists impressum_url text,
  add column if not exists datenschutz_url text;

comment on column public.kunden.mieter_kontakt_telefon is 'Mieter-Fußzeile / No-Reply-Hinweis (WL)';
comment on column public.kunden.mieter_kontakt_email is 'Mieter-Fußzeile E-Mail (WL)';
comment on column public.kunden.av_akzeptiert_am is 'AV-Vertrag akzeptiert (Organisation-Onboarding)';

/* ========== 20260816120000_hv_portal_abnahmen.sql ========== */
-- HV-Portal: digitale Abnahme & Signatur (Design Phase D)

create table if not exists public.hv_portal_abnahmen (
  id uuid primary key default gen_random_uuid(),
  auftrag_id uuid not null references public.auftraege(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  kunde_id uuid references public.kunden(id) on delete set null,
  art text not null check (art in ('ohne_vorbehalt', 'mit_anmerkung', 'zurueckgewiesen')),
  anmerkung text,
  signatur_png text,
  signiert_name text not null,
  signiert_am timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists hv_portal_abnahmen_auftrag_id_uidx
  on public.hv_portal_abnahmen (auftrag_id);

create index if not exists hv_portal_abnahmen_lead_id_idx
  on public.hv_portal_abnahmen (lead_id);

alter table public.hv_portal_abnahmen enable row level security;

/* ========== 20260817120000_org_av_archiv_gate.sql ========== */
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

/* ========== 20260818120000_org_branding_palette.sql ========== */
-- Portal 2.0 A2 — White-Label Branding-Palette an Organisation (kunden)
-- VOR APPLY: Belal prüft diese Migration (einziger Stopp laut Spec).

alter table public.kunden
  add column if not exists org_primary_color_dk text,
  add column if not exists org_primary_color_soft text,
  add column if not exists org_logo_kuerzel text,
  add column if not exists org_sub text,
  add column if not exists org_telefon text,
  add column if not exists org_strasse text,
  add column if not exists org_ort text;

comment on column public.kunden.org_primary_color is 'WL primary (HEX), z. B. #22508C';
comment on column public.kunden.org_primary_color_dk is 'WL primary dunkel (HEX)';
comment on column public.kunden.org_primary_color_soft is 'WL soft/background (HEX)';
comment on column public.kunden.org_logo_kuerzel is 'Logo-Kürzel für Marke ohne Bild (z. B. IS)';
comment on column public.kunden.org_sub is 'Untertitel Sidebar/Header, Default Hausverwaltung';
comment on column public.kunden.org_telefon is 'HV-Stammdaten Telefon (ORG.tel)';
comment on column public.kunden.org_strasse is 'HV-Stammdaten Straße (ORG.strasse)';
comment on column public.kunden.org_ort is 'HV-Stammdaten Ort inkl. PLZ (ORG.ort)';

-- Bestehende Orgs: Soft/Dk aus Preset ableiten, wenn nur primary gesetzt
update public.kunden
set
  org_primary_color_dk = coalesce(
    org_primary_color_dk,
    case lower(trim(org_primary_color))
      when '#22508c' then '#1b426f'
      when '#363b41' then '#24282d'
      when '#2e6b4f' then '#245740'
      when '#8c2f45' then '#6f2537'
      when '#1f6e78' then '#17555d'
      when '#2e7d52' then '#2a724b'
      else null
    end
  ),
  org_primary_color_soft = coalesce(
    org_primary_color_soft,
    case lower(trim(org_primary_color))
      when '#22508c' then '#E8EEF6'
      when '#363b41' then '#ECEEF0'
      when '#2e6b4f' then '#E7F0EB'
      when '#8c2f45' then '#F6E9EC'
      when '#1f6e78' then '#E6F0F1'
      when '#2e7d52' then '#E7F1E9'
      else null
    end
  ),
  org_sub = coalesce(nullif(trim(org_sub), ''), 'Hausverwaltung')
where portal_modus = 'organisation';

/* ========== 20260819120000_portal2_notifications.sql ========== */
-- Portal 2.0 B4 — einheitliche Portal-Benachrichtigungen
-- STOP: Migration anzeigen, NICHT applyen bis Belal freigibt.
--
-- Spec-Felder: empfänger_user, typ, titel, text, vorgang_ref, gelesen, created_at
-- Bestehende Partner-Tabelle `notifications` und `hv_notifications` bleiben;
-- neue Writes gehen hierher; Adapter lesen Alt-Tabellen bis Cutover.

create table if not exists public.portal_notifications (
  id uuid primary key default gen_random_uuid(),
  empfaenger_user_id uuid not null references auth.users (id) on delete cascade,
  typ text not null,
  titel text not null,
  -- Mock-Feld „text“
  body text not null default '',
  vorgang_ref text,
  link text,
  gelesen boolean not null default false,
  gelesen_am timestamptz,
  created_at timestamptz not null default now(),
  -- optionale Display-Overrides (sonst aus typ-Katalog)
  icon_bg text,
  icon_fg text,
  icon_glyph text
);

create index if not exists portal_notifications_user_unread_idx
  on public.portal_notifications (empfaenger_user_id, gelesen, created_at desc);

create index if not exists portal_notifications_vorgang_idx
  on public.portal_notifications (vorgang_ref)
  where vorgang_ref is not null;

comment on table public.portal_notifications is
  'Portal 2.0 B4: Glocke für Kunde/HV/Eigentümer/Mieter/Partner (empfaenger_user_id). Quellen: CRM-Status, Freigabe, Termin, Bautagebuch, HW-Angebot.';

comment on column public.portal_notifications.body is
  'Mock notifData Feld „text“ / Nachrichtenkörper.';

comment on column public.portal_notifications.vorgang_ref is
  'Lead-/Vorgangs-Referenz (z. B. lead_id oder V-Nummer).';

alter table public.portal_notifications enable row level security;

drop policy if exists portal_notifications_select_own on public.portal_notifications;
create policy portal_notifications_select_own
  on public.portal_notifications for select to authenticated
  using (empfaenger_user_id = auth.uid());

drop policy if exists portal_notifications_update_own on public.portal_notifications;
create policy portal_notifications_update_own
  on public.portal_notifications for update to authenticated
  using (empfaenger_user_id = auth.uid())
  with check (empfaenger_user_id = auth.uid());

drop policy if exists portal_notifications_service on public.portal_notifications;
create policy portal_notifications_service
  on public.portal_notifications for all to service_role
  using (true) with check (true);

-- CRM/Staff darf einfügen (Sync-Ereignisse)
drop policy if exists portal_notifications_crm_insert on public.portal_notifications;
create policy portal_notifications_crm_insert
  on public.portal_notifications for insert to authenticated
  with check (public.is_crm_staff());

/* ========== 20260820120000_portal2_einladungen.sql ========== */
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

/* ========== 20260821120000_lead_kanal_servicepaket.sql ========== */
-- D5 Spec-Vorschlag: leads.kanal Literal `servicepaket`
-- AKTUELL LIVE: kanal = `org_service` + anlass = `servicepaket` (ohne diese Migration).
-- NICHT anwenden, bis Belal freigibt. Danach Code in servicepakete.ts / Route umstellen.

do $$ begin
  alter type public.lead_kanal add value if not exists 'servicepaket';
exception
  when duplicate_object then null;
end $$;

comment on type public.lead_kanal is
  'Lead-Kanäle; servicepaket = HV Portal screenServicepakete (Portal 2.0 D5)';

/* ========== 20260822120000_portal_eigentuemer.sql ========== */
-- Portal 2.0 D8 — Eigentümer-Rolle
-- STOP: Migration anzeigen, NICHT applyen bis Belal freigibt.
--
-- Spec: Auth-Rolle (portal_modus), Zuordnung Eigentümer↔Objekte,
-- Schwellenwert am Eigentümer, Freigabe-Feld am Vorgang (Lead).

-- 1) portal_modus um 'eigentuemer' erweitern
alter table public.kunden
  drop constraint if exists kunden_portal_modus_check;

alter table public.kunden
  add constraint kunden_portal_modus_check
  check (portal_modus in ('privat', 'organisation', 'eigentuemer'));

comment on column public.kunden.portal_modus is
  'privat | organisation (HV) | eigentuemer — Portal 2.0 D7/D8';

-- 2) Schwellenwert am Eigentümer-Kundenstamm
alter table public.kunden
  add column if not exists eigentuemer_freigabe_schwelle_eur numeric(10,2);

comment on column public.kunden.eigentuemer_freigabe_schwelle_eur is
  'D8: Kostenfreigabe-Schwelle des Eigentümers (Mock-Beispiel 500 €)';

-- 3) Zuordnung Eigentümer ↔ Objekte
create table if not exists public.eigentuemer_objekte (
  id uuid primary key default gen_random_uuid(),
  kunde_id uuid not null references public.kunden (id) on delete cascade,
  kunde_objekt_id uuid not null references public.kunden_objekte (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (kunde_id, kunde_objekt_id)
);

create index if not exists eigentuemer_objekte_kunde_idx
  on public.eigentuemer_objekte (kunde_id);

create index if not exists eigentuemer_objekte_objekt_idx
  on public.eigentuemer_objekte (kunde_objekt_id);

comment on table public.eigentuemer_objekte is
  'D8: Welche Objekte ein Eigentümer-Portal-Nutzer sehen darf (Sichtbarkeit Vorgänge/Objekte).';

alter table public.eigentuemer_objekte enable row level security;

drop policy if exists eigentuemer_objekte_select_own on public.eigentuemer_objekte;
create policy eigentuemer_objekte_select_own
  on public.eigentuemer_objekte for select to authenticated
  using (
    kunde_id in (
      select id from public.kunden where auth_user_id = auth.uid()
    )
  );

drop policy if exists eigentuemer_objekte_service on public.eigentuemer_objekte;
create policy eigentuemer_objekte_service
  on public.eigentuemer_objekte for all to service_role
  using (true) with check (true);

-- 4) Freigabe-Feld am Vorgang (Lead)
alter table public.leads
  add column if not exists eigentuemer_freigabe_status text;

do $$ begin
  alter table public.leads
    drop constraint if exists leads_eigentuemer_freigabe_status_check;
  alter table public.leads
    add constraint leads_eigentuemer_freigabe_status_check
    check (
      eigentuemer_freigabe_status is null
      or eigentuemer_freigabe_status in (
        'ausstehend', 'freigegeben', 'abgelehnt', 'nicht_noetig'
      )
    );
exception when others then null;
end $$;

comment on column public.leads.eigentuemer_freigabe_status is
  'D8: Eigentümer-Kostenfreigabe — ausstehend | freigegeben | abgelehnt | nicht_noetig';

/* ========== 20260823120000_angebot_herkunft_handwerker.sql ========== */
-- Portal 2.0 D11 — Angebot-Herkunft (Handwerker-Kalkulation)
-- STOP: Migration anzeigen, NICHT applyen bis Belal freigibt.
--
-- Spec: Einreichen erzeugt Angebots-Datensatz mit Quelle „handwerker“,
-- sichtbar im CRM und in D3 als „Empfohlenes Angebot“.

alter table public.angebote
  add column if not exists herkunft text;

do $$ begin
  alter table public.angebote
    drop constraint if exists angebote_herkunft_check;
  alter table public.angebote
    add constraint angebote_herkunft_check
    check (
      herkunft is null
      or herkunft in ('crm', 'handwerker', 'kunde', 'system')
    );
exception when others then null;
end $$;

comment on column public.angebote.herkunft is
  'D11: Quelle des Angebots — handwerker = HW-Kalkulation (Empfohlenes Angebot in D3)';

create index if not exists angebote_herkunft_idx
  on public.angebote (herkunft)
  where herkunft is not null;

/* ========== 20260824120000_handwerker_signatur_abschluss.sql ========== */
-- Portal 2.0 D11 — Handwerker-Signatur am Abnahmeprotokoll
-- STOP: Migration anzeigen, NICHT applyen bis Belal freigibt.
--
-- Spec actSignieren: Canvas-Bild + Zeitstempel + Signierender am Vorgang.
-- Gegenzeichnung Kunde/HV weiter in D3/D7 (hv_portal_abnahmen).

alter table public.abnahme_protokolle
  add column if not exists hw_signatur_png text,
  add column if not exists hw_signiert_am timestamptz,
  add column if not exists kunde_signatur_png text,
  add column if not exists kunde_signiert_am timestamptz;

comment on column public.abnahme_protokolle.hw_signatur_png is
  'D11: Data-URL oder Storage-Pfad der HW-Canvas-Signatur';
comment on column public.abnahme_protokolle.hw_signiert_am is
  'D11: Zeitstempel HW-Signatur';
comment on column public.abnahme_protokolle.kunde_signatur_png is
  'D11: optionale Kunden-Gegenzeichnung vor Ort (Canvas)';
comment on column public.abnahme_protokolle.kunde_signiert_am is
  'D11: Zeitstempel Kunden-Signatur vor Ort';

-- Optionaler FLOW-Hinweis am Auftrag (Abschluss / Signatur)
alter table public.auftraege
  add column if not exists hw_abschluss_signiert_am timestamptz;

comment on column public.auftraege.hw_abschluss_signiert_am is
  'D11: HW hat Abschlussdokumentation inkl. Signatur eingereicht';

/* ========== 20260825120000_handwerker_firmendaten_d12.sql ========== */
-- Portal 2.0 D12 — Handwerker Firmendaten (Mock HW_FIRMA)
-- STOP: Migration anzeigen, NICHT applyen bis Belal freigibt.
--
-- Ergänzt Felder für Mock-Screen „Firmendaten für Angebote & Rechnungen“:
-- Straße, PLZ/Ort, Handelsregister, BIC, Bank.
-- Bestehend: firma, name/vorname/nachname (Inhaber), telefon, email,
-- steuernummer, ustid, iban, adresse (Fallback).

alter table public.handwerker
  add column if not exists strasse text,
  add column if not exists ort text,
  add column if not exists handelsregister text,
  add column if not exists bic text,
  add column if not exists bank text;

comment on column public.handwerker.strasse is
  'D12: Straße für Angebote/Rechnungen (Mock HW_FIRMA.strasse)';
comment on column public.handwerker.ort is
  'D12: PLZ / Ort (Mock HW_FIRMA.ort)';
comment on column public.handwerker.handelsregister is
  'D12: Handelsregister (Mock HW_FIRMA.hrb)';
comment on column public.handwerker.bic is
  'D12: BIC (Mock HW_FIRMA.bic)';
comment on column public.handwerker.bank is
  'D12: Bankname (Mock HW_FIRMA.bank)';

/* ========== 20260826120000_portal2_objekte_e1.sql ========== */
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
