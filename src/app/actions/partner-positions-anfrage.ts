"use server";

import { revalidatePath } from "next/cache";

import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type PartnerPositionsAnfrageResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

async function partnerAuth() {
  if (!isSupabaseConfigured()) {
    return { ok: false as const, error: "Datenbank nicht konfiguriert." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { ok: false as const, error: "Nicht angemeldet." };
  }
  const link = await linkPortalHandwerkerToAuthUser({
    userId: user.id,
    email: user.email,
  });
  if (!link.ok) return { ok: false as const, error: link.error };
  return { ok: true as const, handwerkerId: link.handwerkerId };
}

function crmBaseUrl(): string | null {
  const url = (
    process.env.CRM_DASHBOARD_URL?.trim() ||
    process.env.NEXT_PUBLIC_CRM_URL?.trim() ||
    ""
  ).replace(/\/$/, "");
  return url || null;
}

async function pingCrmPartnerPositionsMeldung(input: {
  auftragId: string;
  anfrageId?: string;
  positionId?: string;
  typ: "positions_anfrage" | "weitere_arbeit";
  titel: string;
}): Promise<void> {
  const base = crmBaseUrl();
  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim();
  if (!base || !secret) return;
  try {
    await fetch(`${base}/api/internal/partner-positions-meldung`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      cache: "no-store",
    });
  } catch (e) {
    console.error("[pingCrmPartnerPositionsMeldung]", e);
  }
}

/**
 * Großer Mehrbedarf: Partner meldet neue Position / Nachtrag — noch nicht ausführbar.
 */
export async function createPartnerPositionsAnfrage(
  formData: FormData
): Promise<PartnerPositionsAnfrageResult> {
  const auth = await partnerAuth();
  if (!auth.ok) return { ok: false, error: auth.error };

  const auftragId = String(formData.get("auftragId") ?? "").trim();
  const titel = String(formData.get("titel") ?? "").trim();
  const begruendung = String(formData.get("begruendung") ?? "").trim();
  const schaetzungEurRaw = String(formData.get("schaetzungEur") ?? "").trim();
  const schaetzungMinRaw = String(formData.get("schaetzungMinuten") ?? "").trim();

  if (!auftragId) return { ok: false, error: "Auftrag fehlt." };
  if (titel.length < 4) {
    return { ok: false, error: "Titel fehlt (mind. 4 Zeichen)." };
  }
  if (begruendung.length < 8) {
    return { ok: false, error: "Bitte kurz begründen (mind. 8 Zeichen)." };
  }

  const { data: own } = await supabaseAdmin
    .from("auftrag_positionen")
    .select("id")
    .eq("auftrag_id", auftragId)
    .eq("handwerker_id", auth.handwerkerId)
    .limit(1);
  if (!own?.length) {
    return { ok: false, error: "Kein Zugriff auf diesen Auftrag." };
  }

  const { data: auftrag } = await supabaseAdmin
    .from("auftraege")
    .select("id, status")
    .eq("id", auftragId)
    .maybeSingle();
  if (!auftrag) return { ok: false, error: "Auftrag nicht gefunden." };
  const st = String(auftrag.status ?? "").toLowerCase();
  if (st === "abgeschlossen" || st === "storniert") {
    return { ok: false, error: "Auftrag ist abgeschlossen." };
  }

  const schaetzungEur = schaetzungEurRaw
    ? Number(schaetzungEurRaw.replace(",", "."))
    : null;
  const schaetzungMinuten = schaetzungMinRaw ? Number(schaetzungMinRaw) : null;

  const { data: inserted, error } = await supabaseAdmin
    .from("partner_positions_anfragen")
    .insert({
      auftrag_id: auftragId,
      handwerker_id: auth.handwerkerId,
      titel,
      begruendung,
      schaetzung_eur:
        schaetzungEur != null && Number.isFinite(schaetzungEur)
          ? schaetzungEur
          : null,
      schaetzung_minuten:
        schaetzungMinuten != null && Number.isFinite(schaetzungMinuten)
          ? Math.round(schaetzungMinuten)
          : null,
      status: "offen",
    })
    .select("id")
    .single();

  if (error) {
    return {
      ok: false,
      error: /partner_positions_anfragen|relation/i.test(error.message)
        ? "Migration partner_positions_anfragen fehlt — bitte SQL ausführen."
        : error.message,
    };
  }

  await writeAuditEvent({
    entityType: "auftrag",
    entityId: auftragId,
    aktion: "partner_positions_anfrage",
    actorRolle: "partner",
    payload: {
      anfrage_id: inserted.id,
      titel,
      schaetzung_eur: schaetzungEur,
    },
  });

  void pingCrmPartnerPositionsMeldung({
    auftragId,
    anfrageId: String(inserted.id),
    typ: "positions_anfrage",
    titel,
  });

  revalidatePath("/partner");
  return { ok: true, id: String(inserted.id) };
}
