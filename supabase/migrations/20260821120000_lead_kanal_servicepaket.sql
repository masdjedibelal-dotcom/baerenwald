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
