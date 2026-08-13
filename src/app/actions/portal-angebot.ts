"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

import { linkPortalKundeToAuthUser } from "@/lib/portal/link-portal-kunde";
import { notifyCrmOrgPortal } from "@/lib/org/notify-crm-org";
import { angebotPositionenJsonToAuftragRows } from "@/lib/portal/copy-angebot-positionen-to-auftrag";
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
    return { ok: false, error: "Bitte melden Sie sich an." };
  }

  const link = await linkPortalKundeToAuthUser({
    userId: user.id,
    email: user.email,
  });
  if (!link.ok) return { ok: false, error: link.error };

  const { data: angebot, error: loadErr } = await supabaseAdmin
    .from("angebote")
    .select(
      "id, lead_id, kunde_id, status, status_einfach, gesendet_am, gesendet_kunde_at, pdf_url, positionen"
    )
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
    return { ok: false, error: "Sie haben keinen Zugriff auf dieses Angebot." };
  }

  const statusEinfach = normalizeStatus(angebot.status_einfach);
  const statusFein = normalizeStatus(angebot.status);
  const alreadyAccepted =
    statusEinfach === "angenommen" ||
    statusEinfach === "kunde_akzeptiert" ||
    statusFein === "kunde_akzeptiert";
  const terminalBlocked =
    statusEinfach === "abgelehnt" ||
    statusEinfach === "ersetzt" ||
    statusEinfach === "abgelaufen" ||
    statusFein === "abgelehnt";
  const hasPdf = Boolean(String(angebot.pdf_url ?? "").trim());
  if (!hasPdf) {
    return {
      ok: false,
      error: "Zum Angebot liegt noch kein PDF vor.",
    };
  }
  // PDF im CRM gespeichert = vorgelegt; E-Mail-Versand ist optional.
  const waitingForAccept = !terminalBlocked;

  const { data: existingAuftrag } = await supabaseAdmin
    .from("auftraege")
    .select("id")
    .eq("angebot_id", id)
    .maybeSingle();

  if (existingAuftrag?.id) {
    const existingId = String(existingAuftrag.id);
    /* Nachziehen, falls Portal früher ohne Positionen angelegt hat. */
    const { count } = await supabaseAdmin
      .from("auftrag_positionen")
      .select("id", { count: "exact", head: true })
      .eq("auftrag_id", existingId);
    if (!count) {
      const posRows = angebotPositionenJsonToAuftragRows(
        existingId,
        angebot.positionen
      );
      if (posRows.length) {
        const { error: posErr } = await supabaseAdmin
          .from("auftrag_positionen")
          .insert(posRows);
        if (posErr) {
          console.error(
            "[acceptKundeAngebot] auftrag_positionen nachziehen",
            posErr.message
          );
        }
      }
    }
    return { ok: true, auftragId: existingId };
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

  // Andere Angebote am Lead entwerten (inkl. frühere Annahmen) — eine aktive Version.
  if (leadId) {
    const { data: siblings } = await supabaseAdmin
      .from("angebote")
      .select("id, status, status_einfach")
      .eq("lead_id", leadId)
      .neq("id", id);

    for (const row of siblings ?? []) {
      const st = String(row.status_einfach ?? "")
        .trim()
        .toLowerCase();
      const statusFein = String(row.status ?? "")
        .trim()
        .toLowerCase();
      // Mehrere Angebote ok — bei Annahme nur konkurrierende entwerten.
      // Bereits abgelehnt/ersetzt bleiben; angenommen/gesendet/entwurf → ersetzt.
      if (st === "ersetzt" || st === "abgelehnt") continue;
      if (statusFein === "abgelehnt" && !st) continue;

      const patch: Record<string, unknown> = {
        status_einfach: "ersetzt",
        status: "abgelehnt",
        ersetzt_durch: id,
        updated_at: now,
      };
      const { error: sibErr } = await supabaseAdmin
        .from("angebote")
        .update(patch)
        .eq("id", row.id as string);
      if (sibErr && /ersetzt_durch|column|schema cache/i.test(sibErr.message)) {
        delete patch.ersetzt_durch;
        await supabaseAdmin.from("angebote").update(patch).eq("id", row.id as string);
      }
    }
  }

  // Bereits Auftrag zu anderem Angebot am Lead? → kein zweiter Auftrag.
  if (leadId) {
    const { data: leadAuftraege } = await supabaseAdmin
      .from("auftraege")
      .select("id, angebot_id, status")
      .eq("lead_id", leadId)
      .neq("status", "storniert")
      .limit(10);
    const anderer = (leadAuftraege ?? []).find(
      (a) => String(a.angebot_id ?? "") !== id
    );
    if (anderer?.id) {
      return {
        ok: false,
        error:
          "Zu diesem Vorgang existiert bereits ein Auftrag. Bitte den bestehenden Auftrag nutzen.",
      };
    }
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

  const auftragId = String(auftrag.id);
  const posRows = angebotPositionenJsonToAuftragRows(auftragId, angebot.positionen);
  if (posRows.length) {
    const { error: posErr } = await supabaseAdmin
      .from("auftrag_positionen")
      .insert(posRows);
    if (posErr) {
      console.error("[acceptKundeAngebot] auftrag_positionen", posErr.message);
    }
  }

  if (leadId) {
    await supabaseAdmin
      .from("leads")
      .update({
        status: "auftrag",
        vorgang_phase: "beauftragt",
        /* Annahme im Portal = Freigabe erledigt — sonst bleibt CRM auf „wartet auf Freigabe“. */
        org_freigabe_status: "freigegeben",
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

    const crmNotify = await notifyCrmOrgPortal({
      leadId,
      typ: "angebot_entscheidung",
      aktion: "angenommen",
      notiz: "Angebot im Portal angenommen — Auftrag erstellt.",
    });
    if (!crmNotify.ok) {
      console.warn(
        "[acceptKundeAngebot] CRM-Notify fehlgeschlagen:",
        crmNotify.error,
        { leadId, skipped: crmNotify.skipped === true }
      );
    }
  }

  revalidatePath("/portal");
  return { ok: true, auftragId };
}

export type RejectKundeAngebotResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Kunde lehnt gesendetes Angebot im Portal ab (mit optionalem Grund).
 */
export async function rejectKundeAngebot(
  angebotId: string,
  grund?: string
): Promise<RejectKundeAngebotResult> {
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
    return { ok: false, error: "Bitte melden Sie sich an." };
  }

  const link = await linkPortalKundeToAuthUser({
    userId: user.id,
    email: user.email,
  });
  if (!link.ok) return { ok: false, error: link.error };

  const { data: angebot, error: loadErr } = await supabaseAdmin
    .from("angebote")
    .select(
      "id, lead_id, kunde_id, status, status_einfach, gesendet_am, gesendet_kunde_at, pdf_url"
    )
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
    return { ok: false, error: "Sie haben keinen Zugriff auf dieses Angebot." };
  }

  const statusEinfach = normalizeStatus(angebot.status_einfach);
  const statusFein = normalizeStatus(angebot.status);
  if (statusEinfach === "abgelehnt" || statusFein === "abgelehnt") {
    return { ok: true };
  }

  const terminalBlocked =
    statusEinfach === "ersetzt" ||
    statusEinfach === "abgelaufen" ||
    statusEinfach === "angenommen" ||
    statusEinfach === "kunde_akzeptiert" ||
    statusFein === "kunde_akzeptiert" ||
    statusEinfach === "beauftragt";
  const hasPdf = Boolean(String(angebot.pdf_url ?? "").trim());
  if (!hasPdf) {
    return {
      ok: false,
      error: "Zum Angebot liegt noch kein PDF vor.",
    };
  }
  // PDF im CRM gespeichert = vorgelegt; E-Mail-Versand ist optional.
  const waitingForAccept = !terminalBlocked;

  if (!waitingForAccept) {
    return {
      ok: false,
      error: "Dieses Angebot kann derzeit nicht abgelehnt werden.",
    };
  }

  const { data: existingAuftrag } = await supabaseAdmin
    .from("auftraege")
    .select("id")
    .eq("angebot_id", id)
    .maybeSingle();
  if (existingAuftrag?.id) {
    return {
      ok: false,
      error: "Zum Angebot existiert bereits ein Auftrag.",
    };
  }

  const now = new Date().toISOString();
  const grundTrim = (grund ?? "").trim().slice(0, 500);

  const { error: upErr } = await supabaseAdmin
    .from("angebote")
    .update({
      status: "abgelehnt",
      status_einfach: "abgelehnt",
      updated_at: now,
    })
    .eq("id", id);

  if (upErr) {
    console.error("[rejectKundeAngebot] angebot", upErr.message);
    return { ok: false, error: "Ablehnung konnte nicht gespeichert werden." };
  }

  if (leadId) {
    await supabaseAdmin
      .from("leads")
      .update({
        vorgang_phase: "abgelehnt",
        updated_at: now,
      })
      .eq("id", leadId);

    await supabaseAdmin.from("lead_timeline").insert({
      lead_id: leadId,
      angebot_id: id,
      typ: "angebot",
      titel: "Angebot abgelehnt",
      beschreibung: grundTrim
        ? `Über das Kundenportal abgelehnt. Grund: ${grundTrim}`
        : "Über das Kundenportal abgelehnt.",
      erstellt_von: user.id,
    });

    const crmNotify = await notifyCrmOrgPortal({
      leadId,
      typ: "angebot_entscheidung",
      aktion: "abgelehnt",
      notiz: grundTrim
        ? `Angebot im Portal abgelehnt. Grund: ${grundTrim}`
        : "Angebot im Portal abgelehnt.",
    });
    if (!crmNotify.ok) {
      console.warn(
        "[rejectKundeAngebot] CRM-Notify fehlgeschlagen:",
        crmNotify.error,
        { leadId, skipped: crmNotify.skipped === true }
      );
    }
  }

  revalidatePath("/portal");
  return { ok: true };
}
