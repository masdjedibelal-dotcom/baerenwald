"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

import { linkPortalKundeToAuthUser } from "@/lib/portal/link-portal-kunde";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type AcceptKundeAngebotResult =
  | { ok: true; auftragId?: string }
  | { ok: false; error: string };

function normalizeStatus(s?: string | null): string {
  return (s ?? "").toLowerCase().replace(/[\s-]+/g, "_");
}

function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function defaultStartDatum(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * HV/Kunde nimmt gesendetes Angebot im Portal an.
 * Setzt Angebot → angenommen / kunde_akzeptiert und legt den Auftrag an
 * (CRM springt damit auf Auftrag / Angebot angenommen).
 */
export async function acceptKundeAngebot(
  angebotId: string
): Promise<AcceptKundeAngebotResult> {
  const id = angebotId.trim();
  if (!id) return { ok: false, error: "Ungültiges Angebot." };

  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Portal ist nicht konfiguriert." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, error: "Bitte melde dich an." };
  }

  const link = await linkPortalKundeToAuthUser({
    userId: user.id,
    email: user.email,
  });
  if (!link.ok) return { ok: false, error: link.error };

  const { data: angebot, error: loadErr } = await supabaseAdmin
    .from("angebote")
    .select("id, lead_id, kunde_id, status, status_einfach")
    .eq("id", id)
    .maybeSingle();

  if (loadErr || !angebot) {
    return { ok: false, error: "Angebot wurde nicht gefunden." };
  }

  const kundeId = link.kundeId;
  const angebotKundeId =
    angebot.kunde_id != null ? String(angebot.kunde_id) : null;
  const leadId = angebot.lead_id != null ? String(angebot.lead_id) : null;

  let belongsToKunde = angebotKundeId === kundeId;
  if (!belongsToKunde && leadId) {
    const { data: lead } = await supabaseAdmin
      .from("leads")
      .select("kunde_id, auftraggeber_kunde_id")
      .eq("id", leadId)
      .maybeSingle();
    const leadKunde =
      lead?.auftraggeber_kunde_id != null
        ? String(lead.auftraggeber_kunde_id)
        : lead?.kunde_id != null
          ? String(lead.kunde_id)
          : null;
    belongsToKunde = leadKunde === kundeId;
  }

  if (!belongsToKunde) {
    return { ok: false, error: "Du hast keinen Zugriff auf dieses Angebot." };
  }

  const statusEinfach = normalizeStatus(angebot.status_einfach);
  const statusFein = normalizeStatus(angebot.status);
  const alreadyAccepted =
    statusEinfach === "angenommen" ||
    statusEinfach === "kunde_akzeptiert" ||
    statusFein === "kunde_akzeptiert";
  const waitingForAccept =
    statusEinfach === "gesendet" || statusFein === "gesendet_kunde";

  const { data: existingAuftrag } = await supabaseAdmin
    .from("auftraege")
    .select("id")
    .eq("angebot_id", id)
    .maybeSingle();

  if (existingAuftrag?.id) {
    return { ok: true, auftragId: String(existingAuftrag.id) };
  }

  if (alreadyAccepted) {
    // Status schon gesetzt, Auftrag fehlt noch → nachziehen
  } else if (!waitingForAccept) {
    return {
      ok: false,
      error: "Dieses Angebot kann derzeit nicht angenommen werden.",
    };
  }

  const now = new Date().toISOString();
  const { error: upErr } = await supabaseAdmin
    .from("angebote")
    .update({
      status: "kunde_akzeptiert",
      status_einfach: "angenommen",
      updated_at: now,
    })
    .eq("id", id);

  if (upErr) {
    console.error("[acceptKundeAngebot] angebot", upErr.message);
    return { ok: false, error: "Annahme konnte nicht gespeichert werden." };
  }

  // Andere Angebote am Lead als abgelehnt markieren (wie CRM)
  if (leadId) {
    await supabaseAdmin
      .from("angebote")
      .update({
        status_einfach: "abgelehnt",
        updated_at: now,
      })
      .eq("lead_id", leadId)
      .neq("id", id)
      .in("status_einfach", ["gesendet", "entwurf"]);
  }

  let resolvedKundeId = angebotKundeId ?? kundeId;
  let titel = "Auftrag";
  let istBauprojekt = false;

  if (leadId) {
    const { data: leadRow } = await supabaseAdmin
      .from("leads")
      .select("kunde_id, auftraggeber_kunde_id, ist_bauprojekt, titel, gewerk")
      .eq("id", leadId)
      .maybeSingle();
    if (leadRow) {
      istBauprojekt = leadRow.ist_bauprojekt === true;
      resolvedKundeId =
        (leadRow.auftraggeber_kunde_id != null
          ? String(leadRow.auftraggeber_kunde_id)
          : null) ||
        (leadRow.kunde_id != null ? String(leadRow.kunde_id) : null) ||
        resolvedKundeId;
      const leadTitel =
        typeof leadRow.titel === "string" ? leadRow.titel.trim() : "";
      const gewerk =
        typeof leadRow.gewerk === "string" ? leadRow.gewerk.trim() : "";
      titel = (leadTitel || gewerk || "Auftrag").slice(0, 240);
    }
  }

  const { data: kundeRow } = await supabaseAdmin
    .from("kunden")
    .select("name")
    .eq("id", resolvedKundeId)
    .maybeSingle();
  if (kundeRow?.name) {
    titel = `${titel} — ${kundeRow.name}`.slice(0, 240);
  }

  const start = defaultStartDatum();
  const end = addDaysIso(start, 14);
  const kundenToken = randomBytes(32).toString("hex");

  const { data: auftrag, error: aErr } = await supabaseAdmin
    .from("auftraege")
    .insert({
      angebot_id: id,
      lead_id: leadId,
      kunde_id: resolvedKundeId,
      status: "offen",
      titel,
      notizen: null,
      start_datum: start,
      end_datum: end,
      abnahme_datum: null,
      abnahme_protokoll_url: null,
      kunden_token: kundenToken,
      fortschritt: 0,
      betreuer_id: null,
      zahlungsplan: null,
      ist_bauprojekt: istBauprojekt,
    })
    .select("id")
    .single();

  if (aErr || !auftrag?.id) {
    console.error("[acceptKundeAngebot] auftrag", aErr?.message);
    return {
      ok: false,
      error: aErr?.message ?? "Auftrag konnte nicht angelegt werden.",
    };
  }

  if (leadId) {
    await supabaseAdmin
      .from("leads")
      .update({
        status: "auftrag",
        vorgang_phase: "beauftragt",
        updated_at: now,
      })
      .eq("id", leadId);

    await supabaseAdmin.from("lead_timeline").insert({
      lead_id: leadId,
      angebot_id: id,
      typ: "angebot",
      titel: "Angebot angenommen — Auftrag erstellt",
      beschreibung: "Über das Kunden-/HV-Portal angenommen.",
      erstellt_von: user.id,
    });
  }

  revalidatePath("/portal");
  return { ok: true, auftragId: String(auftrag.id) };
}
