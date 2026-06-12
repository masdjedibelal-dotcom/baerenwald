import { handleAuthCallbackRequest } from "@/lib/supabase/auth-callback-handler";

/** Zentraler Auth-Callback — v. a. Passwort-Reset (kürzere Redirect-URL für Supabase). */
export async function GET(request: Request) {
  return handleAuthCallbackRequest(request, "/portal/passwort-neu");
}
