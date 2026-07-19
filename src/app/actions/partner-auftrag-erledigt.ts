"use server";

import { revalidatePath } from "next/cache";

import { notifyHvPartnerErledigt } from "@/lib/org/notify-hv-partner-erledigt";
import { allePositionenPortalErledigt } from "@/lib/portal/vorgang-erledigt";
import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import {
  positionHandwerkerAbgeschlossen,
  positionHandwerkerErledigt,
} from "@/lib/partner/partner-konditionen";
import { sendPartnerInternalErledigtMail } from "@/lib/partner/partner-mail";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type PartnerAuftragErledigtResult = { ok: true } | { ok: false; error: string };

async function assertPartnerAuftrag(handwerkerId: string, auftragId: string) {
  const { data: hw } = await supabaseAdmin
    .from("auftrag_handwerker")
    .select("auftrag_id")
    .eq("auftrag_id", auftragId)
    .eq("handwerker_id", handwerkerId)
    .limit(1);

  if (hw?.length) return true;

  const { data: pos } = await supabaseAdmin
    .from("auftrag_positionen")
    .select("auftrag_id")
    .eq("auftrag_id", auftragId)
    .eq("handwerker_id", handwerkerId)
    .limit(1);

  return Boolean(pos?.length);
}

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

  if (!link.ok) {
    return { ok: false as const, error: link.error };
  }

  return { ok: true as const, handwerkerId: link.handwerkerId };
}

/** Handwerker meldet eigene Leistungen am Auftrag als erledigt. */
export async function markPartnerAuftragErledigt(
  auftragId: string
): Promise<PartnerAuftragErledigtResult> {
  const id = auftragId.trim();
  if (!id) return { ok: false, error: "Auftrag fehlt." };

  const auth = await partnerAuth();
  if (!auth.ok) return auth;

  const allowed = await assertPartnerAuftrag(auth.handwerkerId, id);
  if (!allowed) {
    return { ok: false, error: "Kein Zugriff auf diesen Auftrag." };
  }

  const { data: auftrag } = await supabaseAdmin
    .from("auftraege")
    .select("id, titel, status, lead_id")
    .eq("id", id)
    .maybeSingle();

  if (!auftrag) return { ok: false, error: "Auftrag nicht gefunden." };

  const st = String(auftrag.status ?? "").toLowerCase();
  if (st === "abgeschlossen" || st === "storniert" || st === "abgelehnt") {
    return { ok: false, error: "Auftrag ist bereits abgeschlossen." };
  }

  const { data: positionen } = await supabaseAdmin
    .from("auftrag_positionen")
    .select("id, leistung_name, handwerker_status")
    .eq("auftrag_id", id)
    .eq("handwerker_id", auth.handwerkerId);

  const zuErledigen = (positionen ?? []).filter(
    (p) =>
      positionHandwerkerAbgeschlossen(p.handwerker_status) &&
      !positionHandwerkerErledigt(p.handwerker_status)
  );

  if (!zuErledigen.length) {
    return {
      ok: false,
      error: "Keine offenen Leistungen zum Abschließen vorhanden.",
    };
  }

  const now = new Date().toISOString();
  const ids = zuErledigen.map((p) => String(p.id));

  const { error: updateErr } = await supabaseAdmin
    .from("auftrag_positionen")
    .update({
      handwerker_status: "erledigt",
      leistung_status: "erledigt",
      updated_at: now,
    })
    .in("id", ids);

  if (updateErr) {
    console.error("[markPartnerAuftragErledigt]", updateErr.message);
    return { ok: false, error: "Leistungen konnten nicht aktualisiert werden." };
  }

  const { data: allePositionen } = await supabaseAdmin
    .from("auftrag_positionen")
    .select("handwerker_id, handwerker_status, leistung_status, aenderung_typ")
    .eq("auftrag_id", id);

  const auftragVollstaendigErledigt = allePositionenPortalErledigt(
    allePositionen ?? []
  );

  const { data: hw } = await supabaseAdmin
    .from("handwerker")
    .select("name, firma")
    .eq("id", auth.handwerkerId)
    .maybeSingle();

  const handwerkerName = hw?.firma?.trim() || hw?.name?.trim() || "Handwerker";
  const leistungen = zuErledigen
    .map((p) => String(p.leistung_name ?? "Leistung").trim())
    .filter(Boolean);

  await sendPartnerInternalErledigtMail({
    handwerkerName,
    firma: hw?.firma,
    auftragTitel: String(auftrag.titel ?? "Auftrag"),
    auftragId: id,
    leistungen,
  });

  if (auftrag.lead_id) {
    await notifyHvPartnerErledigt({
      auftragId: id,
      leadId: String(auftrag.lead_id),
      handwerkerName,
      leistungen,
      vollstaendig: auftragVollstaendigErledigt,
    });
  }

  revalidatePath("/partner");
  return { ok: true };
}
