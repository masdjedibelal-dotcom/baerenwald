-- CRM hat Gegenangebot/Konditionen akzeptiert — HW muss im Portal noch bestätigen (Tab Anfragen).
-- Erst nach HW-Bestätigung: hw_status = uebernommen → Tab Angebote.

comment on column public.angebot_handwerker.hw_status is
  'offen | eingereicht | bestaetigt | uebernommen | abgelehnt | rueckfrage — bestaetigt = CRM-Einigung, HW-Bestätigung ausstehend';
