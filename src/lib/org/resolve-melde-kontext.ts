import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { ensureMeldeSlugsForKunde } from "@/lib/org/ensure-melde-slug";
import { MELDE_ALLGEMEIN_SLUG } from "@/lib/org/melde-url";

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

type OrgRow = {
  id: string;
  name: string | null;
  org_kennung: string;
  org_anzeigename: string | null;
  org_logo_url: string | null;
};

type ObjektRow = {
  id: string;
  titel: string;
  strasse: string | null;
  hausnummer: string | null;
  plz: string | null;
  ort: string | null;
  melde_slug: string | null;
  melde_aktiv: boolean | null;
  einheiten_hinweis: string | null;
};

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

function normalizeSlug(raw?: string | null): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase();
}

function effectiveMeldeSlug(row: ObjektRow): string {
  const slug = normalizeSlug(row.melde_slug);
  if (slug) return slug;
  return `obj-${row.id.replace(/-/g, "").slice(0, 8)}`;
}

function mapObjekt(row: ObjektRow): MeldeKontext["objekt"] {
  return {
    id: row.id,
    titel: row.titel,
    strasse: row.strasse,
    hausnummer: row.hausnummer,
    plz: row.plz,
    ort: row.ort,
    melde_slug: effectiveMeldeSlug(row),
    einheiten_hinweis: row.einheiten_hinweis,
  };
}

function findObjektRow(rows: ObjektRow[], objSlug: string): ObjektRow | undefined {
  return rows.find((row) => {
    const slug = effectiveMeldeSlug(row);
    return slug === objSlug || row.id.toLowerCase() === objSlug;
  });
}

async function loadOrganisation(orgSlug: string): Promise<OrgRow | null> {
  const select =
    "id, name, org_kennung, org_anzeigename, org_logo_url, portal_modus";

  const { data: orgRows, error: orgErr } = await supabaseAdmin
    .from("kunden")
    .select(select)
    .ilike("org_kennung", orgSlug)
    .eq("portal_modus", "organisation")
    .limit(1);

  if (orgErr) {
    console.error("[resolveMeldeKontext] org:", orgErr.message);
    throw orgErr;
  }

  if (orgRows?.[0]) return orgRows[0] as OrgRow;

  const { data: fallback, error: fbErr } = await supabaseAdmin
    .from("kunden")
    .select(select)
    .ilike("org_kennung", orgSlug)
    .limit(1);

  if (fbErr) {
    console.error("[resolveMeldeKontext] org fallback:", fbErr.message);
    throw fbErr;
  }

  return (fallback?.[0] as OrgRow | undefined) ?? null;
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

  let org: OrgRow | null;
  try {
    org = await loadOrganisation(orgSlug);
  } catch {
    return { ok: false, code: "config", message: "Fehler beim Laden." };
  }

  if (!org?.id) {
    return { ok: false, code: "not_found", message: "Organisation unbekannt." };
  }

  const { data: objekteRowsRaw } = await supabaseAdmin
    .from("kunden_objekte")
    .select(
      "id, titel, strasse, hausnummer, plz, ort, melde_slug, melde_aktiv, einheiten_hinweis"
    )
    .eq("kunde_id", org.id)
    .order("titel", { ascending: true });

  const objekteRowsAll = (objekteRowsRaw ?? []) as ObjektRow[];
  await ensureMeldeSlugsForKunde(org.id, objekteRowsAll);

  const { data: objekteRowsReloaded } = await supabaseAdmin
    .from("kunden_objekte")
    .select(
      "id, titel, strasse, hausnummer, plz, ort, melde_slug, melde_aktiv, einheiten_hinweis"
    )
    .eq("kunde_id", org.id)
    .order("titel", { ascending: true });

  const objekteRows = (objekteRowsReloaded ?? objekteRowsAll) as ObjektRow[];

  const objekte = objekteRows.map((row) => ({
    id: row.id,
    titel: row.titel,
    melde_slug: effectiveMeldeSlug(row),
    adresseZeile: formatAdresse(
      row.strasse,
      row.hausnummer,
      row.plz,
      row.ort
    ),
  }));

  const objSlug = normalizeSlug(objektSlug);
  let objekt: MeldeKontext["objekt"] = null;

  if (objSlug === MELDE_ALLGEMEIN_SLUG) {
    objekt = null;
  } else if (objSlug) {
    const hit = findObjektRow(objekteRows, objSlug);
    if (hit) {
      objekt = mapObjekt(hit);
    }
  } else if (objekteRows.length === 1) {
    objekt = mapObjekt(objekteRows[0]!);
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
