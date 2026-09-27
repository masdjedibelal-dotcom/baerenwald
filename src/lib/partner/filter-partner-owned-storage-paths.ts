import { logDbError } from "@/lib/errors/log-db-error";
import { assertPartnerAktiveZuweisung } from "@/lib/partner/partner-zuweisung-access";
import {
  isStoragePath,
  PARTNER_UPLOAD_BUCKET,
} from "@/lib/partner/partner-storage";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

/** Storage-Pfad ohne Bucket-Präfix; HTTP-URLs → null (nicht signierbar über Ownership). */
export function normalizePartnerUploadPath(raw: string): string | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed || !isStoragePath(trimmed)) return null;
  const path = trimmed.startsWith(`${PARTNER_UPLOAD_BUCKET}/`)
    ? trimmed.slice(`${PARTNER_UPLOAD_BUCKET}/`.length)
    : trimmed;
  const cleaned = path.replace(/^\/+/, "");
  return cleaned || null;
}

function pathHasHandwerkerPrefix(handwerkerId: string, path: string): boolean {
  return path.startsWith(`${handwerkerId}/`);
}

/**
 * Nur Pfade, die dem Betrieb gehören: Präfix `handwerkerId/` **und**
 * Vorkommen in einem Datensatz dieses Betriebs (oder Auftrag mit aktiver Zuweisung).
 * Unbekannte / fremde Pfade werden stillschweigend weggelassen.
 */
export async function filterPartnerOwnedStoragePaths(
  handwerkerId: string,
  paths: string[]
): Promise<string[]> {
  if (!isSupabaseConfigured() || !handwerkerId.trim() || !paths?.length) {
    return [];
  }

  const hwId = handwerkerId.trim();
  const ordered: string[] = [];
  const candidates: string[] = [];
  const seen = new Set<string>();

  for (const raw of paths) {
    const path = normalizePartnerUploadPath(raw);
    if (!path || !pathHasHandwerkerPrefix(hwId, path)) continue;
    if (seen.has(path)) continue;
    seen.add(path);
    candidates.push(path);
    ordered.push(path);
  }

  if (!candidates.length) return [];

  const owned = await collectOwnedPaths(hwId, candidates);
  return ordered.filter((p) => owned.has(p));
}

async function collectOwnedPaths(
  handwerkerId: string,
  candidates: string[]
): Promise<Set<string>> {
  const owned = new Set<string>();

  await Promise.all([
    collectFromBautagebuch(handwerkerId, candidates, owned),
    collectFromEintragFotos(handwerkerId, candidates, owned),
    collectFromPartnerDokumente(handwerkerId, candidates, owned),
    collectFromAngebotHandwerker(handwerkerId, candidates, owned),
    collectFromFachdokuSlots(handwerkerId, candidates, owned),
  ]);

  return owned;
}

async function collectFromBautagebuch(
  handwerkerId: string,
  candidates: string[],
  owned: Set<string>
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("auftrag_bautagebuch_eintraege")
    .select("foto_urls")
    .eq("handwerker_id", handwerkerId)
    .overlaps("foto_urls", candidates);
  if (error) {
    logDbError(
      "lib/partner/filter-partner-owned-storage-paths:bautagebuch",
      error
    );
    // Fallback: contains je Pfad (overlaps nicht überall verfügbar)
    await Promise.all(
      candidates.map(async (path) => {
        const { count, error: cErr } = await supabaseAdmin
          .from("auftrag_bautagebuch_eintraege")
          .select("id", { count: "exact", head: true })
          .eq("handwerker_id", handwerkerId)
          .contains("foto_urls", [path]);
        if (cErr) {
          logDbError(
            "lib/partner/filter-partner-owned-storage-paths:bautagebuch-contains",
            cErr
          );
          return;
        }
        if ((count ?? 0) > 0) owned.add(path);
      })
    );
    return;
  }

  for (const row of data ?? []) {
    const urls = Array.isArray(row.foto_urls) ? row.foto_urls : [];
    for (const u of urls) {
      const p = normalizePartnerUploadPath(String(u ?? ""));
      if (p && candidates.includes(p)) owned.add(p);
    }
  }
}

async function collectFromEintragFotos(
  handwerkerId: string,
  candidates: string[],
  owned: Set<string>
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("eintrag_fotos")
    .select("storage_path, position_eintraege!inner(auftrag_id)")
    .in("storage_path", candidates);
  if (error) {
    logDbError(
      "lib/partner/filter-partner-owned-storage-paths:eintrag_fotos",
      error
    );
    return;
  }

  const byAuftrag = new Map<string, string[]>();
  for (const row of data ?? []) {
    const path = normalizePartnerUploadPath(String(row.storage_path ?? ""));
    const pe = row.position_eintraege as
      | { auftrag_id?: string | null }
      | { auftrag_id?: string | null }[]
      | null;
    const auftragId = Array.isArray(pe)
      ? String(pe[0]?.auftrag_id ?? "").trim()
      : String(pe?.auftrag_id ?? "").trim();
    if (!path || !auftragId) continue;
    const list = byAuftrag.get(auftragId) ?? [];
    list.push(path);
    byAuftrag.set(auftragId, list);
  }

  await Promise.all(
    [...byAuftrag.entries()].map(async ([auftragId, paths]) => {
      if (!(await assertPartnerAktiveZuweisung(handwerkerId, auftragId))) {
        return;
      }
      for (const p of paths) owned.add(p);
    })
  );
}

async function collectFromPartnerDokumente(
  handwerkerId: string,
  candidates: string[],
  owned: Set<string>
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("partner_dokumente")
    .select("datei_url")
    .eq("handwerker_id", handwerkerId)
    .in("datei_url", candidates);
  if (error) {
    logDbError(
      "lib/partner/filter-partner-owned-storage-paths:partner_dokumente",
      error
    );
    return;
  }
  for (const row of data ?? []) {
    const p = normalizePartnerUploadPath(String(row.datei_url ?? ""));
    if (p) owned.add(p);
  }
}

async function collectFromAngebotHandwerker(
  handwerkerId: string,
  candidates: string[],
  owned: Set<string>
): Promise<void> {
  const candidateSet = new Set(candidates);
  const { data, error } = await supabaseAdmin
    .from("angebot_handwerker")
    .select("hw_angebot_pdf_url, hw_rechnung_pdf_url, hw_angebot_anhang_urls")
    .eq("handwerker_id", handwerkerId);
  if (error) {
    logDbError(
      "lib/partner/filter-partner-owned-storage-paths:angebot_handwerker",
      error
    );
    return;
  }

  for (const row of data ?? []) {
    for (const key of ["hw_angebot_pdf_url", "hw_rechnung_pdf_url"] as const) {
      const p = normalizePartnerUploadPath(String(row[key] ?? ""));
      if (p && candidateSet.has(p)) owned.add(p);
    }
    const anhaenge = Array.isArray(row.hw_angebot_anhang_urls)
      ? row.hw_angebot_anhang_urls
      : [];
    for (const a of anhaenge) {
      const p = normalizePartnerUploadPath(String(a ?? ""));
      if (p && candidateSet.has(p)) owned.add(p);
    }
  }
}

async function collectFromFachdokuSlots(
  handwerkerId: string,
  candidates: string[],
  owned: Set<string>
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("auftrag_fachdoku_slots")
    .select("datei_url, auftrag_id")
    .in("datei_url", candidates);
  if (error) {
    logDbError(
      "lib/partner/filter-partner-owned-storage-paths:fachdoku",
      error
    );
    return;
  }

  const byAuftrag = new Map<string, string[]>();
  for (const row of data ?? []) {
    const path = normalizePartnerUploadPath(String(row.datei_url ?? ""));
    const auftragId = String(row.auftrag_id ?? "").trim();
    if (!path || !auftragId) continue;
    const list = byAuftrag.get(auftragId) ?? [];
    list.push(path);
    byAuftrag.set(auftragId, list);
  }

  await Promise.all(
    [...byAuftrag.entries()].map(async ([auftragId, paths]) => {
      if (!(await assertPartnerAktiveZuweisung(handwerkerId, auftragId))) {
        return;
      }
      for (const p of paths) owned.add(p);
    })
  );
}
