-- Produkt-Standardisierung: optionale Lead-Spalten für CRM-Filter
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS produkt_slug text,
  ADD COLUMN IF NOT EXISTS leistung_slug text;

CREATE INDEX IF NOT EXISTS leads_produkt_slug_idx ON leads (produkt_slug)
  WHERE produkt_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS leads_leistung_slug_idx ON leads (leistung_slug)
  WHERE leistung_slug IS NOT NULL;

COMMENT ON COLUMN leads.produkt_slug IS 'Katalog-Produkt-Slug (z. B. bad-m-komfort)';
COMMENT ON COLUMN leads.leistung_slug IS 'Leistungs-Basis-Slug (z. B. badezimmer-sanierung)';
