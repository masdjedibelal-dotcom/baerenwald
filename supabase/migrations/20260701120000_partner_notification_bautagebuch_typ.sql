-- Partner-Benachrichtigung: Tagebuch-Anforderung aus dem CRM

alter table public.notifications drop constraint if exists notifications_typ_check;

alter table public.notifications
  add constraint notifications_typ_check
  check (typ in ('neu', 'geaendert', 'entfernt', 'erinnerung', 'bautagebuch'));
