import { sendHandwerkerNewAnfrageMail } from "@/lib/partner/partner-mail";
import { partnerLoginForAnfrageUrl } from "@/lib/partner/partner-site-url";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

function one<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? (x[0] as T) ?? null : x;
}

/** Lädt Anfrage-Daten und sendet die „Neue Anfrage“-Mail an den Handwerker. */
export async function notifyHandwerkerNewAnfrage(anfrageId: string): Promise<{
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
      token,
      gewerk_id,
      handwerker(name, email, firma),
      gewerke(name),
      angebote(
        id,
        kunden(plz),
        leads(plz, zeitraum)
      )
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
  const angebote = one(raw.angebote) as {
    kunden: unknown;
    leads: unknown;
  } | null;
  const kunde = angebote
    ? (one(angebote.kunden) as { plz: string | null } | null)
    : null;
  const lead = angebote
    ? (one(angebote.leads) as { plz: string | null; zeitraum: string | null } | null)
    : null;
  const plz = kunde?.plz?.trim() || lead?.plz?.trim() || "—";
  const zeitraum = lead?.zeitraum?.trim() || undefined;
  const token = (raw.token as string | null)?.trim();
  const crmBase = process.env.NEXT_PUBLIC_DASHBOARD_URL?.replace(/\/$/, "");
  const tokenLink =
    token && crmBase
      ? `${crmBase}/handwerker/anfrage/${encodeURIComponent(token)}`
      : undefined;

  const portalLink = partnerLoginForAnfrageUrl(id);

  return sendHandwerkerNewAnfrageMail({
    to,
    handwerkerName: hw?.name?.trim() || "Partner",
    gewerkName: gw?.name?.trim() || "Gewerk",
    plz,
    zeitraum,
    tokenLink,
    portalLink,
  });
}
