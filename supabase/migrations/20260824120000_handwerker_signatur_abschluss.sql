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
