-- Ein Supabase-Auth-User: CRM + Kundenportal + Partnerportal (wenn im Stamm verknüpft).
-- CRM-Mitarbeiter (user_profiles) werden nicht mehr von Portal-Policies ausgeschlossen.

-- ---------------------------------------------------------------------------
-- Partner: is_portal_handwerker = verknüpfter Handwerker (auch CRM-Mitarbeiter)
-- ---------------------------------------------------------------------------
create or replace function public.is_portal_handwerker()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select public.portal_handwerker_id() is not null;
$$;

drop policy if exists "handwerker_portal_select_own" on public.handwerker;
create policy "handwerker_portal_select_own"
  on public.handwerker for select to authenticated
  using (auth_user_id = auth.uid());

drop policy if exists "handwerker_portal_update_own" on public.handwerker;
create policy "handwerker_portal_update_own"
  on public.handwerker for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

drop policy if exists "angebot_handwerker_portal_select" on public.angebot_handwerker;
create policy "angebot_handwerker_portal_select"
  on public.angebot_handwerker for select to authenticated
  using (handwerker_id = public.portal_handwerker_id());

drop policy if exists "angebot_handwerker_portal_update" on public.angebot_handwerker;
create policy "angebot_handwerker_portal_update"
  on public.angebot_handwerker for update to authenticated
  using (handwerker_id = public.portal_handwerker_id())
  with check (handwerker_id = public.portal_handwerker_id());

-- ---------------------------------------------------------------------------
-- Kundenportal: Portal-Policies ohne is_crm_staff()-Ausschluss
-- (CRM behält weiterhin kunden_crm_staff_all / leads_crm_staff_all usw.)
-- ---------------------------------------------------------------------------
drop policy if exists "kunden_portal_select_own" on public.kunden;
create policy "kunden_portal_select_own"
  on public.kunden for select to authenticated
  using (auth_user_id = auth.uid());

drop policy if exists "kunden_portal_update_own" on public.kunden;
create policy "kunden_portal_update_own"
  on public.kunden for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

drop policy if exists "leads_portal_select" on public.leads;
create policy "leads_portal_select"
  on public.leads for select to authenticated
  using (kunde_id = public.portal_kunde_id());

drop policy if exists "auftraege_portal_select" on public.auftraege;
create policy "auftraege_portal_select"
  on public.auftraege for select to authenticated
  using (
    kunde_id = public.portal_kunde_id()
    or lead_id in (select public.portal_kunde_lead_ids())
  );

drop policy if exists "angebote_portal_select" on public.angebote;
create policy "angebote_portal_select"
  on public.angebote for select to authenticated
  using (lead_id in (select public.portal_kunde_lead_ids()));

drop policy if exists "auftrag_positionen_portal_select" on public.auftrag_positionen;
create policy "auftrag_positionen_portal_select"
  on public.auftrag_positionen for select to authenticated
  using (
    fuer_kunde_sichtbar = true
    and auftrag_id in (
      select a.id from public.auftraege a
      where a.kunde_id = public.portal_kunde_id()
         or a.lead_id in (select public.portal_kunde_lead_ids())
    )
  );

drop policy if exists "rechnungen_portal_select" on public.rechnungen;
create policy "rechnungen_portal_select"
  on public.rechnungen for select to authenticated
  using (
    status = 'gesendet'
    and auftrag_id in (
      select a.id from public.auftraege a
      where a.kunde_id = public.portal_kunde_id()
         or a.lead_id in (select public.portal_kunde_lead_ids())
    )
  );

drop policy if exists "auftrag_timeline_portal_select" on public.auftrag_timeline;
create policy "auftrag_timeline_portal_select"
  on public.auftrag_timeline for select to authenticated
  using (
    fuer_kunde_freigegeben = true
    and auftrag_id in (
      select a.id from public.auftraege a
      where a.kunde_id = public.portal_kunde_id()
         or a.lead_id in (select public.portal_kunde_lead_ids())
    )
  );

comment on column public.handwerker.auth_user_id is
  'Supabase Auth User — auch CRM-Mitarbeiter, wenn E-Mail im Handwerker-Stamm.';

comment on column public.kunden.auth_user_id is
  'Supabase Auth User — auch CRM-Mitarbeiter, wenn E-Mail im Kundenstamm.';
