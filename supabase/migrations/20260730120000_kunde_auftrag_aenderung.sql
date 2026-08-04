-- Kundenportal: Annahme von Auftragsänderungen (parallel zu HW-aenderung_typ)

ALTER TABLE auftrag_positionen
  ADD COLUMN IF NOT EXISTS kunde_akzeptiert_at timestamptz;

COMMENT ON COLUMN auftrag_positionen.kunde_akzeptiert_at IS
  'Zeitpunkt der Kundenannahme für diese Positionsänderung; aenderung_typ bleibt bis HW bestätigt';
