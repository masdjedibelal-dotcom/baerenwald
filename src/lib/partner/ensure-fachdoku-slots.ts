import { logDbError } from '@/lib/errors/log-db-error'
import {
  FACHDOKU_SLOT_DEFS,
  fachdokuCodesFromGewerke,
  type FachdokuSlotCode,
  type FachdokuSlotRow,
} from "@/lib/partner/fachdoku-slots";
import { resolvePartnerFileUrl } from "@/lib/partner/partner-storage";
import { supabaseAdmin } from "@/lib/supabase";

type AdminClient = typeof supabaseAdmin;

export async function ensureAuftragFachdokuSlots(
  admin: AdminClient,
  auftragId: string,
  gewerkNames: Array<string | null | undefined>
): Promise<FachdokuSlotRow[]> {
  const codes = fachdokuCodesFromGewerke(gewerkNames);
  if (!codes.length) {
    const {data, error: __dbErr374_1} = await admin
      .from("auftrag_fachdoku_slots")
      .select(
        "id, auftrag_id, slot_code, label, status, datei_url, datei_name, uploaded_by_role, uploaded_by_handwerker_id, erledigt_am"
      )
      .eq("auftrag_id", auftragId);
    if (__dbErr374_1) logDbError('lib/partner/ensure-fachdoku-slots:auftrag_fachdoku_slots', __dbErr374_1)
    return (data ?? []) as FachdokuSlotRow[];
  }

  const rows = codes.map((code: FachdokuSlotCode) => ({
    auftrag_id: auftragId,
    slot_code: code,
    label: FACHDOKU_SLOT_DEFS[code].label,
    status: "offen" as const,
  }));

  const { error: __dbErr376_3 } = await admin.from("auftrag_fachdoku_slots").upsert(rows, {
    onConflict: "auftrag_id,slot_code",
    ignoreDuplicates: true,
  });
  if (__dbErr376_3) logDbError('lib/partner/ensure-fachdoku-slots:auftrag_fachdoku_slots', __dbErr376_3)
  const {data, error: __dbErr375_2} = await admin
    .from("auftrag_fachdoku_slots")
    .select(
      "id, auftrag_id, slot_code, label, status, datei_url, datei_name, uploaded_by_role, uploaded_by_handwerker_id, erledigt_am"
    )
    .eq("auftrag_id", auftragId)
    .order("slot_code");
  if (__dbErr375_2) logDbError('lib/partner/ensure-fachdoku-slots:auftrag_fachdoku_slots', __dbErr375_2)
  return (data ?? []) as FachdokuSlotRow[];
}

export async function loadAuftragFachdokuSlotsWithUrls(
  admin: AdminClient,
  auftragId: string,
  gewerkNames: Array<string | null | undefined>
): Promise<Array<FachdokuSlotRow & { signed_url: string | null }>> {
  const slots = await ensureAuftragFachdokuSlots(admin, auftragId, gewerkNames);
  const out: Array<FachdokuSlotRow & { signed_url: string | null }> = [];
  for (const s of slots) {
    const signed = s.datei_url
      ? await resolvePartnerFileUrl(s.datei_url)
      : null;
    out.push({ ...s, signed_url: signed });
  }
  return out;
}
