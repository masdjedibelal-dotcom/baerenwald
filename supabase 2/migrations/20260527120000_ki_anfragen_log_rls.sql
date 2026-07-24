-- KI-Chat-Logs: nur Server (service_role), kein öffentlicher Lesezugriff
ALTER TABLE ki_anfragen_log ENABLE ROW LEVEL SECURITY;
