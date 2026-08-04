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
