"use server";

import { revalidatePath } from "next/cache";

import {
  HANDWERKER_ABLEHNUNG_GRUND_LABELS,
  isHandwerkerAblehnungGrund,
} from "@/lib/partner/handwerker-ablehnung";
import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import { sendPartnerInternalAnfrageAntwortMail } from "@/lib/partner/partner-mail";
import { partnerAngebotPortalUrl } from "@/lib/partner/partner-site-url";
import { syncAngebotHandwerkerAfterAuftragAccept } from "@/lib/partner/sync-angebot-handwerker";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type PartnerAuftragAntwortResult =
  | { ok: true; angebotAnfrageId?: string | null }
  | { ok: false; error: string };

function one<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? (x[0] as T) ?? null : x;
}

const PENDING_HW = new Set(["angefragt", "ausstehend", "warten", "offen", "zugewiesen"]);

/** Annahme/Ablehnung einer Leistungs-Zuweisung am Auftrag (CRM-Flow, nicht angebot_handwerker). */
export async function respondPartnerAuftragZuweisung(opts: {
  auftragId: string;
  antwort: "akzeptiert" | "abgelehnt";
  grund?: string;
  notiz?: string;
}): Promise<PartnerAuftragAntwortResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Datenbank nicht konfiguriert." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, error: "Nicht angemeldet." };
  }

  const link = await linkPortalHandwerkerToAuthUser({
    userId: user.id,
    email: user.email,
  });

  if (!link.ok) {
    return { ok: false, error: link.error };
  }

  const auftragId = opts.auftragId.trim();
  if (!auftragId) return { ok: false, error: "Auftrag fehlt." };

  const grundRaw = opts.grund?.trim() ?? "";
  if (opts.antwort === "abgelehnt") {
    if (!grundRaw || !isHandwerkerAblehnungGrund(grundRaw)) {
      return { ok: false, error: "Bitte einen gültigen Ablehnungsgrund wählen." };
    }
  }

  const { data: auftrag, error: aErr } = await supabaseAdmin
    .from("auftraege")
    .select("id, titel, status, angebot_id")
    .eq("id", auftragId)
    .maybeSingle();

  if (aErr || !auftrag) {
    return { ok: false, error: "Auftrag nicht gefunden." };
  }

  const { data: zuweisungen } = await supabaseAdmin
    .from("auftrag_handwerker")
    .select("id, status, gewerk_id, gewerke(name)")
    .eq("auftrag_id", auftragId)
    .eq("handwerker_id", link.handwerkerId);

  const { data: positionen } = await supabaseAdmin
    .from("auftrag_positionen")
    .select("id, handwerker_status, gewerk_name")
    .eq("auftrag_id", auftragId)
    .eq("handwerker_id", link.handwerkerId);

  const rows = zuweisungen ?? [];
  const posRows = positionen ?? [];
  if (!rows.length && !posRows.length) {
    return { ok: false, error: "Keine Zuweisung für diesen Auftrag." };
  }

  const pendingZuweisung = rows.some((z) =>
    PENDING_HW.has(String(z.status ?? "").toLowerCase())
  );
  const pendingPos = posRows.some((p) =>
    PENDING_HW.has(String(p.handwerker_status ?? "").toLowerCase())
  );
  const auftragOffen = String(auftrag.status ?? "").toLowerCase() === "offen";

  if (!auftragOffen && !pendingZuweisung && !pendingPos) {
    return { ok: false, error: "Diese Zuweisung kann nicht mehr beantwortet werden." };
  }

  const newStatus = opts.antwort === "akzeptiert" ? "akzeptiert" : "abgelehnt";
  const now = new Date().toISOString();
  const notiz = opts.notiz?.trim() || null;

  for (const z of rows) {
    const st = String(z.status ?? "").toLowerCase();
    if (!PENDING_HW.has(st) && st !== "zugewiesen") continue;
    await supabaseAdmin
      .from("auftrag_handwerker")
      .update({ status: newStatus })
      .eq("id", z.id);
  }

  for (const p of posRows) {
    const st = String(p.handwerker_status ?? "").toLowerCase();
    if (!PENDING_HW.has(st) && st !== "zugewiesen") continue;
    await supabaseAdmin
      .from("auftrag_positionen")
      .update({
        handwerker_status: newStatus,
        ...(newStatus === "akzeptiert" ? { handwerker_angefragt_at: now } : {}),
      })
      .eq("id", p.id);
  }

  const { data: hw } = await supabaseAdmin
    .from("handwerker")
    .select("name")
    .eq("id", link.handwerkerId)
    .maybeSingle();

  const gewerkName =
    posRows[0]?.gewerk_name?.trim() ||
    (one(rows[0]?.gewerke as unknown) as { name?: string } | null)?.name?.trim() ||
    "Gewerk";

  const grundLabel =
    opts.antwort === "abgelehnt" && isHandwerkerAblehnungGrund(grundRaw)
      ? HANDWERKER_ABLEHNUNG_GRUND_LABELS[grundRaw]
      : null;

  const angebotId = auftrag.angebot_id != null ? String(auftrag.angebot_id) : "";
  let partnerAngebotUrl: string | null = null;
  let angebotAnfrageId: string | null = null;

  if (angebotId && opts.antwort === "akzeptiert") {
    const synced = await syncAngebotHandwerkerAfterAuftragAccept({
      handwerkerId: link.handwerkerId,
      angebotId,
    });
    angebotAnfrageId = synced.anfrageId;
    if (synced.anfrageId) {
      partnerAngebotUrl = partnerAngebotPortalUrl(synced.anfrageId);
    }
  }

  if (angebotId) {
    await sendPartnerInternalAnfrageAntwortMail({
      handwerkerName: (hw?.name as string)?.trim() || "Partner",
      gewerkName,
      angenommen: opts.antwort === "akzeptiert",
      ablehnungGrundLabel: grundLabel,
      notiz,
      angebotId,
      partnerAngebotPortalUrl: partnerAngebotUrl,
    });
  }

  revalidatePath("/partner");
  return {
    ok: true,
    angebotAnfrageId: opts.antwort === "akzeptiert" ? angebotAnfrageId : null,
  };
}
