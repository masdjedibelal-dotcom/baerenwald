# Supabase SQL — Partner-Portal (Reihenfolge)

Im **SQL Editor** nacheinander ausführen (jede Datei komplett, bei Fehler stoppen und melden).

| Nr. | Datei | Inhalt |
|-----|--------|--------|
| 1 | `supabase/migrations/20260603120000_portal_auth_handwerker.sql` | `handwerker.auth_user_id`, Hilfsfunktionen, RLS Anfragen |
| 2 | `supabase/migrations/20260603120100_portal_handwerker_angebot_einreichung.sql` | Preis/PDF-Felder auf `angebot_handwerker` |
| 3 | `supabase/migrations/20260603120200_portal_handwerker_bautagebuch.sql` | `handwerker_id` + RLS Bautagebuch |
| 4 | `supabase/migrations/20260603120300_portal_handwerker_storage_notes.sql` | Hinweise Storage-Bucket (manuell im Dashboard) |
| 5 | `supabase/migrations/20260603120400_portal_handwerker_storage_policies.sql` | RLS auf `storage.objects` für Partner + CRM |

**Voraussetzung:** Kunden-Portal-Migration `20260602120000_portal_auth_kunden.sql` (Funktion `is_crm_staff()`).

**Nach dem SQL:**

1. Authentication → URL Configuration: Site URL + Redirects mit `/partner/**`
2. Storage → Bucket `handwerker-uploads` (privat)
3. Auth E-Mail bestätigen aktiv lassen (wie Kundenportal)
