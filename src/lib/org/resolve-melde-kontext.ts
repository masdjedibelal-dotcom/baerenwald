import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export type MeldeKontext = {
  org: {
    id: string;
    org_kennung: string;
    org_anzeigename: string | null;
    org_logo_url: string | null;
    name: string | null;
  };
  objekt: {
    id: string;
    titel: string;
    strasse: string | null;
    hausnummer: string | null;
    plz: string | null;
    ort: string | null;
    melde_slug: string;
    einheiten_hinweis: string | null;
  } | null;
  objekte: Array<{
    id: string;
    titel: string;
    melde_slug: string;
    adresseZeile: string;
  }>;
};

export type ResolveMeldeResult =
  | { ok: true; kontext: MeldeKontext }
  | { ok: false; code: "not_found" | "disabled" | "config"; message: string };

function formatAdresse(
  strasse?: string | null,
  hausnummer?: string | null,
  plz?: string | null,
  ort?: string | null
): string {
  const str = [strasse?.trim(), hausnummer?.trim()].filter(Boolean).join(" ");
  const ortLine = [plz?.trim(), ort?.trim()].filter(Boolean).join(" ");
  return [str, ortLine].filter(Boolean).join(", ");
}

export async function resolveMeldeKontext(
  orgKennung: string,
  objektSlug?: string | null
): Promise<ResolveMeldeResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, code: "config", message: "Service nicht verfügbar." };
  }

  const orgSlug = orgKennung.trim().toLowerCase();
  if (!orgSlug) {
    return { ok: false, code: "not_found", message: "Organisation unbekannt." };
  }

  const { data: orgRows, error: orgErr } = await supabaseAdmin
    .from("kunden")
    .select(
      "id, name, org_kennung, org_anzeigename, org_logo_url, portal_modus"
    )
    .ilike("org_kennung", orgSlug)
    .eq("portal_modus", "organisation")
    .limit(1);

  if (orgErr) {
    console.error("[resolveMeldeKontext] org:", orgErr.message);
    return { ok: false, code: "config", message: "Fehler beim Laden." };
  }

  const org = orgRows?.[0] as
    | {
        id: string;
        name: string | null;
        org_kennung: string;
        org_anzeigename: string | null;
        org_logo_url: string | null;
      }
    | undefined;

  if (!org?.id) {
    return { ok: false, code: "not_found", message: "Organisation unbekannt." };
  }

  const { data: objekteRows } = await supabaseAdmin
    .from("kunden_objekte")
    .select(
      "id, titel, strasse, hausnummer, plz, ort, melde_slug, melde_aktiv"
    )
    .eq("kunde_id", org.id)
    .eq("melde_aktiv", true)
    .not("melde_slug", "is", null)
    .order("titel", { ascending: true });

  const objekte = (objekteRows ?? [])
    .map((o) => {
      const row = o as {
        id: string;
        titel: string;
        strasse: string | null;
        hausnummer: string | null;
        plz: string | null;
        ort: string | null;
        melde_slug: string;
      };
      return {
        id: row.id,
        titel: row.titel,
        melde_slug: row.melde_slug.trim().toLowerCase(),
        adresseZeile: formatAdresse(
          row.strasse,
          row.hausnummer,
          row.plz,
          row.ort
        ),
      };
    })
    .filter((o) => o.melde_slug);

  const objSlug = objektSlug?.trim().toLowerCase();
  let objekt: MeldeKontext["objekt"] = null;

  if (objSlug) {
    const hit = (objekteRows ?? []).find((o) => {
      const row = o as { melde_slug?: string | null; melde_aktiv?: boolean };
      return (
        row.melde_aktiv !== false &&
        String(row.melde_slug ?? "")
          .trim()
          .toLowerCase() === objSlug
      );
    }) as
      | {
          id: string;
          titel: string;
          strasse: string | null;
          hausnummer: string | null;
          plz: string | null;
          ort: string | null;
          melde_slug: string;
          einheiten_hinweis: string | null;
          melde_aktiv: boolean;
        }
      | undefined;

    if (!hit) {
      return {
        ok: false,
        code: "not_found",
        message: "Objekt nicht gefunden oder Link deaktiviert.",
      };
    }
    if (!hit.melde_aktiv) {
      return {
        ok: false,
        code: "disabled",
        message: "Melde-Link für dieses Objekt ist deaktiviert.",
      };
    }

    objekt = {
      id: hit.id,
      titel: hit.titel,
      strasse: hit.strasse,
      hausnummer: hit.hausnummer,
      plz: hit.plz,
      ort: hit.ort,
      melde_slug: hit.melde_slug.trim().toLowerCase(),
      einheiten_hinweis: hit.einheiten_hinweis,
    };
  }

  return {
    ok: true,
    kontext: {
      org: {
        id: org.id,
        org_kennung: org.org_kennung,
        org_anzeigename: org.org_anzeigename,
        org_logo_url: org.org_logo_url,
        name: org.name,
      },
      objekt,
      objekte,
    },
  };
}

export async function resolveEinladungKontext(token: string) {
  if (!isSupabaseConfigured()) return null;

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select(
      "id, einladung_token, einladung_status, melder_name, melder_einheit, melder_telefon, melder_email, kunde_objekt_id, auftraggeber_kunde_id, kontakt_nachricht, funnel_daten, situation, bereiche, zeitraum"
    )
    .eq("einladung_token", token)
    .maybeSingle();

  if (!lead?.id || lead.einladung_status !== "offen") return null;

  const auftraggeberId = lead.auftraggeber_kunde_id as string | null;
  if (!auftraggeberId) return null;

  const { data: org } = await supabaseAdmin
    .from("kunden")
    .select("id, org_anzeigename, org_logo_url, name")
    .eq("id", auftraggeberId)
    .maybeSingle();

  let objekt: {
    titel: string;
    adresseZeile: string;
  } | null = null;

  if (lead.kunde_objekt_id) {
    const { data: obj } = await supabaseAdmin
      .from("kunden_objekte")
      .select("titel, strasse, hausnummer, plz, ort")
      .eq("id", lead.kunde_objekt_id)
      .maybeSingle();
    if (obj) {
      objekt = {
        titel: String(obj.titel),
        adresseZeile: formatAdresse(
          obj.strasse as string | null,
          obj.hausnummer as string | null,
          obj.plz as string | null,
          obj.ort as string | null
        ),
      };
    }
  }

  return { lead, org, objekt };
}
