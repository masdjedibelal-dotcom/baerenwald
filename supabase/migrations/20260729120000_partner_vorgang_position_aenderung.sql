-- Partner Vorgänge: Positionsänderungen + HW-Annahme auf Auftragsebene

ALTER TABLE auftrag_positionen
  ADD COLUMN IF NOT EXISTS aenderung_typ text
    CHECK (aenderung_typ IS NULL OR aenderung_typ IN ('neu', 'geaendert', 'entfernt'));

ALTER TABLE auftrag_positionen
  ADD COLUMN IF NOT EXISTS preis_alt numeric;

ALTER TABLE auftraege
  ADD COLUMN IF NOT EXISTS handwerker_bestaetigt_at timestamptz;

COMMENT ON COLUMN auftrag_positionen.aenderung_typ IS
  'CRM-Änderung: neu | geaendert | entfernt — null nach HW-Bestätigung';

COMMENT ON COLUMN auftrag_positionen.preis_alt IS
  'Vorheriger preis_partner bei aenderung_typ=geaendert';

COMMENT ON COLUMN auftraege.handwerker_bestaetigt_at IS
  'Zeitpunkt der verbindlichen HW-Annahme aller Leistungen am Auftrag';
