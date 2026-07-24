-- Mehrere Angebots-PDFs (max. 3 im Portal); hw_angebot_pdf_url = erstes Dokument (CRM/Mail).

alter table public.angebot_handwerker
  add column if not exists hw_angebot_anhang_urls jsonb not null default '[]'::jsonb;

comment on column public.angebot_handwerker.hw_angebot_anhang_urls is
  'Storage-Pfade aller eingereichten Angebots-PDFs (max. 3). hw_angebot_pdf_url = erstes Element.';

update public.angebot_handwerker
set hw_angebot_anhang_urls = jsonb_build_array(hw_angebot_pdf_url)
where hw_angebot_pdf_url is not null
  and trim(hw_angebot_pdf_url) <> ''
  and (
    hw_angebot_anhang_urls is null
    or hw_angebot_anhang_urls = '[]'::jsonb
  );
