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
