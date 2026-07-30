-- CRM kann bei BT-Anforderung Leistungen Leistungenwählen (Portal: vorauswählen / Deep-Link)

alter table public.partner_bautagebuch_anfragen
  add column if not exists position_ids uuid[] default '{}';

comment on column public.partner_bautagebuch_anfragen.position_ids is
  'Optional: Auftrag-Positionen, zu denen der Partner ein Update geben soll.';
