/**
 * Handwerker-Dokumentation → Portal-Bautagebuch-Form (HV + Kunde Updates-Tab).
 */

import { resolvePartnerFileUrl } from "@/lib/partner/partner-storage";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type PortalPartnerDokuEntry = {
  id: string;
  datum?: string;
  created_at?: string;
  titel: string;
  notiz?: string;
  fotos_urls: string[];
};

/**
 * Lädt Partner-Leistungs-Updates je Auftrag für HV-/Kunden-Portal.
 * Quelle: position_eintraege (+ Fotos), Partner-App / Eigenbetrieb.
 */
export async function loadPartnerDokumentationByAuftragIds(
  auftragIds: string[]
): Promise<Map<string, PortalPartnerDokuEntry[]>> {
  const out = new Map<string, PortalPartnerDokuEntry[]>();
  const ids = Array.from(
    new Set(auftragIds.map((id) => String(id).trim()).filter(Boolean))
  );
  if (!ids.length || !isSupabaseConfigured()) return out;

  const { data: positionen, error: posErr } = await supabaseAdmin
    .from("auftrag_positionen")
    .select("id, auftrag_id, leistung_name")
    .in("auftrag_id", ids);

  if (posErr) {
    if (/does not exist|schema cache/i.test(posErr.message)) return out;
    console.warn("[portal] partner-doku positionen:", posErr.message);
    return out;
  }

  const posMeta = new Map<
    string,
    { auftragId: string; leistungName: string | null }
  >();
  for (const p of positionen ?? []) {
    posMeta.set(String(p.id), {
      auftragId: String(p.auftrag_id),
      leistungName:
        typeof p.leistung_name === "string"
          ? p.leistung_name.trim() || null
          : null,
    });
  }
  const positionIds = Array.from(posMeta.keys());

  let query = supabaseAdmin
    .from("position_eintraege")
    .select(
      "id, position_id, auftrag_id, typ, beschreibung, erfasst_von, ereignis_zeit, created_at"
    )
    .in("erfasst_von", ["partner_app", "eigenbetrieb_app"])
    .neq("typ", "weitere_arbeit")
    .order("ereignis_zeit", { ascending: false })
    .limit(200);

  if (positionIds.length > 0) {
    query = query.or(
      `auftrag_id.in.(${ids.join(",")}),position_id.in.(${positionIds.join(",")})`
    );
  } else {
    query = query.in("auftrag_id", ids);
  }

  const { data: rows, error } = await query;
  if (error) {
    if (/position_eintraege|does not exist/i.test(error.message)) return out;
    console.warn("[portal] partner-doku eintraege:", error.message);
    return out;
  }

  const eintragIds = (rows ?? []).map((r) => String(r.id));
  const fotosByEintrag = new Map<string, string[]>();
  if (eintragIds.length > 0) {
    const { data: fotos } = await supabaseAdmin
      .from("eintrag_fotos")
      .select("eintrag_id, storage_path")
      .in("eintrag_id", eintragIds);
    for (const f of fotos ?? []) {
      const eid = String(f.eintrag_id);
      const path = String(f.storage_path ?? "").trim();
      if (!path) continue;
      const list = fotosByEintrag.get(eid) ?? [];
      list.push(path);
      fotosByEintrag.set(eid, list);
    }
  }

  const allPaths = Array.from(
    new Set(Array.from(fotosByEintrag.values()).flat())
  );
  const urlByPath = new Map<string, string>();
  await Promise.all(
    allPaths.map(async (p) => {
      const url = await resolvePartnerFileUrl(p);
      if (url) urlByPath.set(p, url);
      else if (/^https?:\/\//i.test(p)) urlByPath.set(p, p);
    })
  );

  for (const row of rows ?? []) {
    const eid = String(row.id);
    const primaryPos =
      row.position_id != null ? String(row.position_id) : null;
    const meta = primaryPos ? posMeta.get(primaryPos) : null;
    const auftragId =
      (row.auftrag_id != null ? String(row.auftrag_id) : null) ||
      meta?.auftragId ||
      null;
    if (!auftragId || !ids.includes(auftragId)) continue;

    const body = String(row.beschreibung ?? "").trim();
    const leistung = meta?.leistungName?.trim() || null;
    const titel = leistung ? `Update — ${leistung}` : "Update";
    const when =
      (row.ereignis_zeit as string | null) ||
      (row.created_at as string | null) ||
      "";

    const entry: PortalPartnerDokuEntry = {
      id: eid,
      datum: when.slice(0, 10) || undefined,
      created_at: when || undefined,
      titel,
      notiz: body || undefined,
      fotos_urls: (fotosByEintrag.get(eid) ?? [])
        .map((p) => urlByPath.get(p))
        .filter((u): u is string => Boolean(u)),
    };

    const list = out.get(auftragId) ?? [];
    list.push(entry);
    out.set(auftragId, list);
  }

  for (const [aid, list] of out) {
    list.sort((a, b) => {
      const da = a.created_at || a.datum || "";
      const db = b.created_at || b.datum || "";
      return db.localeCompare(da);
    });
    out.set(aid, list);
  }

  return out;
}

/** Legacy + Partner-Doku mergen (Partner zuerst / neuer), IDs deduplizieren. */
export function mergePortalBautagebuchEntries(
  legacy: PortalPartnerDokuEntry[],
  partner: PortalPartnerDokuEntry[]
): PortalPartnerDokuEntry[] {
  const byId = new Map<string, PortalPartnerDokuEntry>();
  for (const e of legacy) byId.set(e.id, e);
  for (const e of partner) byId.set(e.id, e);
  return Array.from(byId.values()).sort((a, b) => {
    const da = a.created_at || a.datum || "";
    const db = b.created_at || b.datum || "";
    return db.localeCompare(da);
  });
}
