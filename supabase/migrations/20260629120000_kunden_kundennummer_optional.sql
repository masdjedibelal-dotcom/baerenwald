-- Portal/CRM: kundennummer wird in der App weder vergeben noch angezeigt.
-- Unique-Constraint auf leere Werte blockierte Kunden-Inserts beim Portal-Login.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'kunden'
      AND column_name = 'kundennummer'
  ) THEN
    UPDATE public.kunden
    SET kundennummer = NULL
    WHERE kundennummer IS NOT NULL AND btrim(kundennummer) = '';

    ALTER TABLE public.kunden
      ALTER COLUMN kundennummer DROP NOT NULL;

    ALTER TABLE public.kunden
      DROP CONSTRAINT IF EXISTS kunden_kundennummer_key;
  END IF;
END;
$$;
