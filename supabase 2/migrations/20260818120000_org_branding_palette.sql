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
