import { logDbError } from "@/lib/errors/log-db-error";
import { supabaseAdmin } from "@/lib/supabase";
import { MARKE } from "@/lib/marke";

/**
 * Empfänger für Partner-Angebote & -Rechnungen (Plattform der Marke).
 * Quelle: CRM-Firmendaten (`einstellungen`); Env-Variablen überschreiben explizit.
 */

export type PartnerDocEmpfaenger = {
  firma: string;
  strasse: string;
  plzOrt: string;
  email?: string;
};

/** Entspricht CRM `defaultFirmenEinstellungen` — nur falls `einstellungen` nicht lesbar ist. */
const CRM_FIRMA_FALLBACK = {
  firmenname: MARKE.firma.firmenname,
  strasse: MARKE.firma.strasse,
  hausnummer: MARKE.firma.hausnummer,
  plz: MARKE.firma.plz,
  ort: MARKE.firma.ort,
  email: MARKE.firma.email,
};

async function loadFirmenEinstellungen(): Promise<typeof CRM_FIRMA_FALLBACK> {
  const merged = { ...CRM_FIRMA_FALLBACK };
  const { data, error } = await supabaseAdmin
    .from("einstellungen")
    .select("key, value")
    .in("key", Object.keys(CRM_FIRMA_FALLBACK));
  if (error) {
    logDbError("lib/partner/partner-doc-empfaenger:einstellungen", error);
    return merged;
  }
  const rows = data ?? [];
  // Gepflegte Straße ohne separate Hausnummer → Default-Hausnummer nicht anhängen.
  if (rows.some((r) => r.key === "strasse" && String(r.value ?? "").trim())) {
    merged.hausnummer = "";
  }
  for (const row of rows) {
    const key = row.key as keyof typeof CRM_FIRMA_FALLBACK;
    const value = String(row.value ?? "").trim();
    if (value && key in merged) merged[key] = value;
  }
  return merged;
}

export async function getPartnerDocEmpfaenger(): Promise<PartnerDocEmpfaenger> {
  const f = await loadFirmenEinstellungen();
  return {
    firma: process.env.PARTNER_DOC_EMPFAENGER_FIRMA?.trim() || f.firmenname,
    strasse:
      process.env.PARTNER_DOC_EMPFAENGER_STRASSE?.trim() ||
      [f.strasse, f.hausnummer].filter(Boolean).join(" "),
    plzOrt:
      process.env.PARTNER_DOC_EMPFAENGER_PLZ_ORT?.trim() ||
      [f.plz, f.ort].filter(Boolean).join(" "),
    email:
      process.env.PARTNER_DOC_EMPFAENGER_EMAIL?.trim() ||
      process.env.PARTNER_INTERNAL_MAIL_TO?.trim() ||
      f.email ||
      undefined,
  };
}
