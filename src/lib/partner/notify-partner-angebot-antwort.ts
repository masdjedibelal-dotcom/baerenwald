import { sendHandwerkerAngebotAntwortMail } from "@/lib/partner/partner-mail";
import { partnerLoginForAngebotUrl } from "@/lib/partner/partner-site-url";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

function one<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? (x[0] as T) ?? null : x;
}

export type PartnerAngebotAntwortTyp = "rueckfrage" | "abgelehnt";

/** Nach CRM-Rückfrage oder -Ablehnung: Mail an Handwerker. */
export async function notifyHandwerkerAngebotAntwort(input: {
  anfrageId: string;
  typ: PartnerAngebotAntwortTyp;
  crmNotiz: string;
  betreff?: string;
  cc?: string[];
}): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
  }

  const id = input.anfrageId.trim();
  const crmNotiz = input.crmNotiz.trim();
  if (!id) return { ok: false, error: "anfrageId fehlt." };
  if (!crmNotiz) return { ok: false, error: "Nachricht fehlt." };

  const { data: row, error } = await supabaseAdmin
    .from("angebot_handwerker")
    .select(
      `
      id,
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
  const titel =
    ang?.notizen?.trim()?.slice(0, 80) ||
    (ang?.angebotsnr ? `Angebot ${ang.angebotsnr}` : "Projekt");

  return sendHandwerkerAngebotAntwortMail({
    to,
    handwerkerName: hw?.name?.trim() || "Partner",
    gewerkName: gw?.name?.trim() || "Gewerk",
    angebotTitel: titel,
    crmNotiz,
    portalLink: partnerLoginForAngebotUrl(id),
    typ: input.typ,
    betreff: input.betreff,
    cc: input.cc,
  });
}
