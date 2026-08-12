/**
 * Handwerker-Dokumentation (Positions-Lebenszyklus) → Portal-Bautagebuch-Form.
 * Quelle: position_eintraege (+ eintrag_fotos), nicht die Legacy-BT-Tabelle.
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

function typLabel(typ: string): string {
  switch (typ) {
    case "start":
      return "Update";
    case "fortschritt":
      return "Update";
    case "ergebnis":
      return "Ergebnis";
    case "weitere_arbeit":
      return "Weitere Arbeit";
    default:
      return "Dokumentation";
  }
}

function dateKey(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  const s = String(iso).trim();
  if (!s) return undefined;
  return s.slice(0, 10);
}

/**
 * Lädt Partner-Dokumentation je Auftrag (für HV-/Kunden-Portal Detail).
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

  const posRows = positionen ?? [];
  if (!posRows.length) return out;

  const posMeta = new Map<
    string,
    { auftragId: string; leistungName: string | null }
  >();
  for (const p of posRows) {
    posMeta.set(String(p.id), {
      auftragId: String(p.auftrag_id),
      leistungName:
        typeof p.leistung_name === "string" ? p.leistung_name.trim() || null : null,
    });
  }

  const positionIds = Array.from(posMeta.keys());
  const { data: eintraege, error: eErr } = await supabaseAdmin
    .from("position_eintraege")
    .select(
      "id, position_id, typ, beschreibung, ereignis_zeit, created_at"
    )
    .in("position_id", positionIds)
    .order("ereignis_zeit", { ascending: false });

  if (eErr) {
    if (/does not exist|schema cache|position_eintraege/i.test(eErr.message)) {
      return out;
    }
    console.warn("[portal] partner-doku eintraege:", eErr.message);
    return out;
  }

  const rows = eintraege ?? [];
  if (!rows.length) return out;

  const eintragIds = rows.map((r) => String(r.id));
  const { data: fotos } = await supabaseAdmin
    .from("eintrag_fotos")
    .select("eintrag_id, storage_path")
    .in("eintrag_id", eintragIds);

  const pathsByEintrag = new Map<string, string[]>();
  for (const f of fotos ?? []) {
    const eid = String(f.eintrag_id ?? "").trim();
    const path = String(f.storage_path ?? "").trim();
    if (!eid || !path) continue;
    const list = pathsByEintrag.get(eid) ?? [];
    list.push(path);
    pathsByEintrag.set(eid, list);
  }

  const allPaths = Array.from(
    new Set(Array.from(pathsByEintrag.values()).flat())
  );
  const urlByPath = new Map<string, string>();
  await Promise.all(
    allPaths.map(async (p) => {
      const url = await resolvePartnerFileUrl(p);
      if (url) urlByPath.set(p, url);
    })
  );

  for (const row of rows) {
    const meta = posMeta.get(String(row.position_id));
    if (!meta) continue;
    const typ = String(row.typ ?? "").trim();
    const titelParts = [
      typLabel(typ),
      meta.leistungName,
    ].filter(Boolean);
    const when =
      (row.ereignis_zeit as string | null) ??
      (row.created_at as string | null) ??
      null;
    const paths = pathsByEintrag.get(String(row.id)) ?? [];
    const fotos_urls = paths
      .map((p) => urlByPath.get(p))
      .filter((u): u is string => Boolean(u));

    const entry: PortalPartnerDokuEntry = {
      id: `pos-${row.id}`,
      datum: dateKey(when),
      created_at: when ?? undefined,
      titel: titelParts.join(" · ") || "Dokumentation",
      notiz:
        typeof row.beschreibung === "string" && row.beschreibung.trim()
          ? row.beschreibung.trim()
          : undefined,
      fotos_urls,
    };

    const list = out.get(meta.auftragId) ?? [];
    list.push(entry);
    out.set(meta.auftragId, list);
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
