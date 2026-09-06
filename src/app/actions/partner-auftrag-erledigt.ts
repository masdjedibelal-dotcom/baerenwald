"use server";

import { revalidatePath } from "next/cache";

import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import { notifyCrmPartnerAuftragErledigt } from "@/lib/partner/notify-crm-partner-auftrag-erledigt";
import { partnerAbschlussRelevantePositionen } from "@/lib/partner/partner-position-erledigt";
import { sendPartnerInternalErledigtMail } from "@/lib/partner/partner-mail";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import { assertPartnerAktiveZuweisung } from "@/lib/partner/partner-zuweisung-access";

export type PartnerAuftragErledigtResult = { ok: true } | { ok: false; error: string };

async function assertPartnerAuftrag(handwerkerId: string, auftragId: string) {
  return assertPartnerAktiveZuweisung(handwerkerId, auftragId);
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

/**
 * Handwerker meldet Auftrag erledigt — ohne Abnahme.
 * Setzt handwerker_status=erledigt, erledigt_gemeldet_am, unlockt Rechnung.
 */
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

  const { data: ahRow } = await supabaseAdmin
    .from("auftrag_handwerker")
    .select("id, erledigt_gemeldet_am")
    .eq("auftrag_id", id)
    .eq("handwerker_id", auth.handwerkerId)
    .neq("status", "ersetzt")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (ahRow?.erledigt_gemeldet_am) {
    return { ok: true };
  }

  const { data: positionen } = await supabaseAdmin
    .from("auftrag_positionen")
    .select(
      "id, leistung_name, handwerker_status, leistung_status, aenderung_typ, anerkennung_status, handwerker_id"
    )
    .eq("auftrag_id", id)
    .eq("handwerker_id", auth.handwerkerId);

  const rows = positionen ?? [];
  const relevant = partnerAbschlussRelevantePositionen(rows);
  if (!relevant.length) {
    return {
      ok: false,
      error: "Keine Leistungen zum Abschließen vorhanden.",
    };
  }

  if (
    relevant.some(
      (p) => String(p.leistung_status ?? "").toLowerCase() !== "erledigt"
    )
  ) {
    return {
      ok: false,
      error: "Bitte zuerst alle Leistungen als erledigt markieren.",
    };
  }

  const ids = rows
    .filter((p) => {
      const a = String(p.anerkennung_status ?? "nicht_noetig").toLowerCase();
      if (a === "in_pruefung" || a === "abgelehnt") return false;
      if (!String(p.handwerker_status ?? "").trim()) return false;
      return String(p.leistung_status ?? "").toLowerCase() === "erledigt";
    })
    .map((p) => String(p.id));

  if (!ids.length) {
    return { ok: false, error: "Keine Leistungen zum Abschließen vorhanden." };
  }

  const now = new Date().toISOString();

  let { error: updateErr } = await supabaseAdmin
    .from("auftrag_positionen")
    .update({
      handwerker_status: "erledigt",
      leistung_status: "erledigt",
    })
    .in("id", ids);

  if (updateErr && /leistung_status/i.test(updateErr.message)) {
    ({ error: updateErr } = await supabaseAdmin
      .from("auftrag_positionen")
      .update({ handwerker_status: "erledigt" })
      .in("id", ids));
  }

  if (updateErr) {
    console.error("[markPartnerAuftragErledigt]", updateErr.message);
    return { ok: false, error: "Leistungen konnten nicht aktualisiert werden." };
  }

  if (ahRow?.id) {
    const { error: ahErr } = await supabaseAdmin
      .from("auftrag_handwerker")
      .update({ erledigt_gemeldet_am: now })
      .eq("id", ahRow.id);
    if (ahErr && !/erledigt_gemeldet_am|column/i.test(ahErr.message)) {
      console.error("[markPartnerAuftragErledigt] ah", ahErr.message);
      return {
        ok: false,
        error: "Erledigt-Meldung konnte nicht gespeichert werden.",
      };
    }
  }

  const { data: hw } = await supabaseAdmin
    .from("handwerker")
    .select("name, firma")
    .eq("id", auth.handwerkerId)
    .maybeSingle();

  const handwerkerName = hw?.firma?.trim() || hw?.name?.trim() || "Handwerker";
  const leistungen = rows
    .filter((p) => ids.includes(String(p.id)))
    .map((p) => String(p.leistung_name ?? "Leistung").trim())
    .filter(Boolean);

  await sendPartnerInternalErledigtMail({
    handwerkerName,
    firma: hw?.firma,
    auftragTitel: String(auftrag.titel ?? "Auftrag"),
    auftragId: id,
    leistungen,
  });

  void notifyCrmPartnerAuftragErledigt({
    auftragId: id,
    handwerkerId: auth.handwerkerId,
    erledigtAm: now,
  });

  revalidatePath("/partner");
  return { ok: true };
}
