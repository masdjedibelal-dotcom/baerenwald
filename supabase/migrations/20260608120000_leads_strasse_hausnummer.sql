-- Straße + Hausnummer aus Website-Funnel (CRM: leads.strasse / leads.hausnummer)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS strasse text,
  ADD COLUMN IF NOT EXISTS hausnummer text;

COMMENT ON COLUMN public.leads.strasse IS 'Straße laut Website-Anfrage (Funnel)';
COMMENT ON COLUMN public.leads.hausnummer IS 'Hausnummer laut Website-Anfrage (Funnel)';
