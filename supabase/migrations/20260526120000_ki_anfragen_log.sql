-- KI-Rechner: Chat-Anfragen und extrahierte Funnel-Daten
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS ki_anfragen_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id text,
  anfrage_text text NOT NULL,
  claude_antwort text,
  typ text DEFAULT 'unbekannt',
  extrahiertes_json jsonb,
  lead_erstellt boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ki_anfragen_log_session_id_idx
  ON ki_anfragen_log (session_id);

CREATE INDEX IF NOT EXISTS ki_anfragen_log_created_at_idx
  ON ki_anfragen_log (created_at DESC);
