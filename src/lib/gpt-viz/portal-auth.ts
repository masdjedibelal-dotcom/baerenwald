import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";

/** Portal-Kunde des eingeloggten Nutzers (Cookie-Session). */
export async function getGptVizPortalKundeId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return null;

    const { data, error } = await supabaseAdmin
      .from("kunden")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (error || !data?.id) return null;
    return String(data.id);
  } catch {
    return null;
  }
}
