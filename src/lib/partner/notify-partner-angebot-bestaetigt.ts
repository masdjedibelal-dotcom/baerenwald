import { sendHandwerkerAngebotBestaetigtMail } from "@/lib/partner/partner-mail";
import { partnerLoginForAngebotUrl } from "@/lib/partner/partner-site-url";
import { resolveAngebotTitel } from "@/lib/portal/portal-display";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

function one<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? (x[0] as T) ?? null : x;
}

/** Nach CRM-Einigung: Mail an Handwerker (bitte bestätigen oder Angebote). */
export async function notifyHandwerkerAngebotBestaetigt(
  anfrageId: string,
  opts?: { bitteBestaetigen?: boolean }
): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
  }

  const id = anfrageId.trim();
  if (!id) return { ok: false, error: "anfrageId fehlt." };

  const { data: row, error } = await supabaseAdmin
    .from("angebot_handwerker")
    .select(
      `
      id,
      hw_preis_netto,
      hw_preis_brutto,
      handwerker(name, email, firma),
      gewerke(name),
      angebote(notizen, angebotsnr)
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, error: error?.message ?? "Anfrage nicht gefunden." };
  }

  const raw = row as Record<string, unknown>;
  const hw = one(raw.handwerker) as {
    name: string;
    email: string | null;
    firma: string | null;
  } | null;
  const to = hw?.email?.trim();
  if (!to) {
    return { ok: false, error: "Handwerker hat keine E-Mail." };
  }

  const gw = one(raw.gewerke) as { name: string } | null;
  const ang = one(raw.angebote) as {
    notizen?: string | null;
    angebotsnr?: string | null;
  } | null;
  const titel = resolveAngebotTitel({
    notizen: ang?.notizen,
    angebotsnr: ang?.angebotsnr,
  });

  return sendHandwerkerAngebotBestaetigtMail({
    to,
    handwerkerName: hw?.name?.trim() || "Partner",
    gewerkName: gw?.name?.trim() || "Gewerk",
    angebotTitel: titel,
    preisNetto: raw.hw_preis_netto as number | null,
    preisBrutto: raw.hw_preis_brutto as number | null,
    portalLink: partnerLoginForAngebotUrl(id),
    bitteBestaetigen: opts?.bitteBestaetigen,
  });
}
