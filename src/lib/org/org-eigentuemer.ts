/**
 * Org-Eigentümer: Personen über Einheiten hinweg wiederverwenden
 * und Portal-Objekt-Zuordnung (`eigentuemer_objekte`) synchron halten.
 */

import { supabaseAdmin } from "@/lib/supabase";

export type OrgEigentuemerPerson = {
  /** Stabiler Schlüssel für Select (portal | email | bewohner-id). */
  key: string;
  name: string;
  email: string | null;
  telefon: string | null;
  portal_kunde_id: string | null;
  sondereigentum_verwaltung: boolean;
  /** Repräsentative einheit_bewohner-ID zum Kopieren. */
  sourceBewohnerId: string;
  /** Kurzliste der Objekte, an denen die Person schon hängt. */
  objektLabels: string[];
};

type BewohnerRow = {
  id: string;
  name: string | null;
  email: string | null;
  telefon: string | null;
  portal_kunde_id: string | null;
  sondereigentum_verwaltung: boolean | null;
  objekt_einheit_id: string;
};

function personKey(row: BewohnerRow): string {
  const portal = row.portal_kunde_id?.trim();
  if (portal) return `portal:${portal}`;
  const email = row.email?.trim().toLowerCase();
  if (email) return `email:${email}`;
  return `bewohner:${row.id}`;
}

/** Deduplizierte Eigentümer der Org (über alle Objekte/Einheiten). */
export async function listOrgEigentuemer(
  orgKundeId: string
): Promise<OrgEigentuemerPerson[]> {
  const { data, error } = await supabaseAdmin
    .from("einheit_bewohner")
    .select(
      "id, name, email, telefon, portal_kunde_id, sondereigentum_verwaltung, objekt_einheit_id"
    )
    .eq("kunde_id", orgKundeId)
    .eq("rolle", "eigentuemer")
    .eq("aktiv", true)
    .is("anonymisiert_am", null)
    .order("name", { ascending: true });

  if (error) {
    console.warn("[org-eigentuemer] list:", error.message);
    return [];
  }

  const einheitIds = Array.from(
    new Set(
      (data ?? [])
        .map((r) => String((r as BewohnerRow).objekt_einheit_id ?? "").trim())
        .filter(Boolean)
    )
  );

  const objektLabelByEinheit = new Map<string, string>();
  if (einheitIds.length) {
    const { data: einheiten } = await supabaseAdmin
      .from("objekt_einheiten")
      .select("id, bezeichnung, kunde_objekt_id")
      .in("id", einheitIds);
    const objektIds = Array.from(
      new Set(
        (einheiten ?? [])
          .map((e) => String(e.kunde_objekt_id ?? "").trim())
          .filter(Boolean)
      )
    );
    const titelByObjekt = new Map<string, string>();
    if (objektIds.length) {
      const { data: objs } = await supabaseAdmin
        .from("kunden_objekte")
        .select("id, titel")
        .in("id", objektIds);
      for (const o of objs ?? []) {
        titelByObjekt.set(String(o.id), String(o.titel ?? "").trim() || "Objekt");
      }
    }
    for (const e of einheiten ?? []) {
      const oid = String(e.kunde_objekt_id ?? "");
      const titel = titelByObjekt.get(oid);
      const bez = String(e.bezeichnung ?? "").trim();
      objektLabelByEinheit.set(
        String(e.id),
        titel ? (bez ? `${titel} · ${bez}` : titel) : bez || "Objekt"
      );
    }
  }

  const byKey = new Map<string, OrgEigentuemerPerson>();
  for (const raw of data ?? []) {
    const row = raw as BewohnerRow;
    const key = personKey(row);
    const label =
      objektLabelByEinheit.get(String(row.objekt_einheit_id)) ?? "Objekt";

    const existing = byKey.get(key);
    if (existing) {
      if (!existing.objektLabels.includes(label)) {
        existing.objektLabels.push(label);
      }
      if (!existing.portal_kunde_id && row.portal_kunde_id) {
        existing.portal_kunde_id = String(row.portal_kunde_id);
      }
      continue;
    }
    byKey.set(key, {
      key,
      name: String(row.name ?? "").trim() || "Eigentümer",
      email: row.email != null ? String(row.email).trim() || null : null,
      telefon: row.telefon != null ? String(row.telefon).trim() || null : null,
      portal_kunde_id:
        row.portal_kunde_id != null ? String(row.portal_kunde_id) : null,
      sondereigentum_verwaltung: Boolean(row.sondereigentum_verwaltung),
      sourceBewohnerId: String(row.id),
      objektLabels: [label],
    });
  }

  return Array.from(byKey.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "de")
  );
}

/** Alle Objekte aus einheit_bewohner-Zeilen eines Portal-Eigentümers → eigentuemer_objekte. */
export async function syncEigentuemerObjekteForPortalKunde(
  portalKundeId: string
): Promise<void> {
  const pid = portalKundeId.trim();
  if (!pid) return;

  const { data: rows } = await supabaseAdmin
    .from("einheit_bewohner")
    .select("objekt_einheit_id, objekt_einheiten(kunde_objekt_id)")
    .eq("portal_kunde_id", pid)
    .eq("rolle", "eigentuemer")
    .eq("aktiv", true)
    .is("anonymisiert_am", null);

  const objektIds = new Set<string>();
  for (const r of rows ?? []) {
    const joined = (r as {
      objekt_einheiten?:
        | { kunde_objekt_id?: string }
        | { kunde_objekt_id?: string }[]
        | null;
    }).objekt_einheiten;
    const oid = Array.isArray(joined)
      ? joined[0]?.kunde_objekt_id
      : joined?.kunde_objekt_id;
    if (oid) objektIds.add(String(oid));
  }

  for (const objektId of Array.from(objektIds)) {
    const { data: existing } = await supabaseAdmin
      .from("eigentuemer_objekte")
      .select("id")
      .eq("kunde_id", pid)
      .eq("kunde_objekt_id", objektId)
      .maybeSingle();
    if (existing?.id) continue;
    await supabaseAdmin.from("eigentuemer_objekte").insert({
      kunde_id: pid,
      kunde_objekt_id: objektId,
    });
  }
}

export async function ensureEigentuemerObjektLink(input: {
  portalKundeId: string;
  objektId: string;
}): Promise<void> {
  const portalKundeId = input.portalKundeId.trim();
  const objektId = input.objektId.trim();
  if (!portalKundeId || !objektId) return;
  const { data: existing } = await supabaseAdmin
    .from("eigentuemer_objekte")
    .select("id")
    .eq("kunde_id", portalKundeId)
    .eq("kunde_objekt_id", objektId)
    .maybeSingle();
  if (existing?.id) return;
  await supabaseAdmin.from("eigentuemer_objekte").insert({
    kunde_id: portalKundeId,
    kunde_objekt_id: objektId,
  });
}

/**
 * Bestehenden Eigentümer an eine weitere Einheit hängen
 * (gleiche Person, neue einheit_bewohner-Zeile).
 */
export async function assignExistingEigentuemerToEinheit(input: {
  orgKundeId: string;
  einheitId: string;
  sourceBewohnerId: string;
  sondereigentumVerwaltung?: boolean;
  selbstbewohnt?: boolean;
}): Promise<
  | { ok: true; bewohnerId: string }
  | { ok: false; error: string }
> {
  const { data: source, error: srcErr } = await supabaseAdmin
    .from("einheit_bewohner")
    .select(
      "id, name, email, telefon, portal_kunde_id, sondereigentum_verwaltung, selbstbewohnt, rolle, objekt_einheit_id"
    )
    .eq("id", input.sourceBewohnerId)
    .eq("kunde_id", input.orgKundeId)
    .eq("aktiv", true)
    .maybeSingle();

  if (srcErr || !source?.id) {
    return { ok: false, error: "Eigentümer nicht gefunden." };
  }
  if (String(source.rolle) !== "eigentuemer") {
    return { ok: false, error: "Quelle ist kein Eigentümer." };
  }
  if (String(source.objekt_einheit_id) === input.einheitId) {
    return {
      ok: false,
      error: "Eigentümer ist dieser Einheit bereits zugeordnet.",
    };
  }

  const { data: einheit } = await supabaseAdmin
    .from("objekt_einheiten")
    .select("id, kunde_objekt_id")
    .eq("id", input.einheitId)
    .maybeSingle();
  if (!einheit?.id) {
    return { ok: false, error: "Einheit nicht gefunden." };
  }

  const { data: obj } = await supabaseAdmin
    .from("kunden_objekte")
    .select("id")
    .eq("id", einheit.kunde_objekt_id)
    .eq("kunde_id", input.orgKundeId)
    .maybeSingle();
  if (!obj?.id) {
    return { ok: false, error: "Objekt nicht gefunden." };
  }

  // Schon an dieser Einheit?
  const portalId =
    source.portal_kunde_id != null
      ? String(source.portal_kunde_id).trim()
      : "";
  const email = source.email != null ? String(source.email).trim() : "";

  let alreadyQ = supabaseAdmin
    .from("einheit_bewohner")
    .select("id")
    .eq("objekt_einheit_id", input.einheitId)
    .eq("kunde_id", input.orgKundeId)
    .eq("rolle", "eigentuemer")
    .eq("aktiv", true)
    .is("anonymisiert_am", null);

  if (portalId) {
    alreadyQ = alreadyQ.eq("portal_kunde_id", portalId);
  } else if (email) {
    alreadyQ = alreadyQ.ilike("email", email);
  } else {
    alreadyQ = alreadyQ.eq("id", source.id);
  }

  const { data: already } = await alreadyQ.maybeSingle();
  if (already?.id) {
    return { ok: false, error: "Eigentümer ist dieser Einheit bereits zugeordnet." };
  }

  const se =
    input.sondereigentumVerwaltung !== undefined
      ? Boolean(input.sondereigentumVerwaltung)
      : Boolean(source.sondereigentum_verwaltung);

  const selbst =
    input.selbstbewohnt !== undefined
      ? Boolean(input.selbstbewohnt)
      : Boolean(
          (source as { selbstbewohnt?: boolean | null }).selbstbewohnt
        );

  const { data: inserted, error: insErr } = await supabaseAdmin
    .from("einheit_bewohner")
    .insert({
      kunde_id: input.orgKundeId,
      objekt_einheit_id: input.einheitId,
      name: String(source.name ?? "").trim() || "Eigentümer",
      email: email || null,
      telefon:
        source.telefon != null ? String(source.telefon).trim() || null : null,
      rolle: "eigentuemer",
      sondereigentum_verwaltung: se,
      selbstbewohnt: selbst,
      portal_kunde_id: portalId || null,
      aktiv: true,
    })
    .select("id")
    .single();

  if (insErr || !inserted?.id) {
    return {
      ok: false,
      error: insErr?.message ?? "Zuordnung fehlgeschlagen.",
    };
  }

  if (portalId) {
    await ensureEigentuemerObjektLink({
      portalKundeId: portalId,
      objektId: String(einheit.kunde_objekt_id),
    });
    await syncEigentuemerObjekteForPortalKunde(portalId);
  }

  return { ok: true, bewohnerId: String(inserted.id) };
}
