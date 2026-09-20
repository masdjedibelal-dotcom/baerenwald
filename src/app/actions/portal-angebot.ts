"use server";

import { logDbError } from '@/lib/errors/log-db-error'
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

import { linkPortalKundeToAuthUser } from "@/lib/portal/link-portal-kunde";
import { notifyCrmOrgPortal } from "@/lib/org/notify-crm-org";
import { funnelDirektauftragFromDaten } from "@/lib/org/freigabe-bypass";
import { orgFreigabeBlockiertPartner } from "@/lib/org/org-freigabe-status";
import { angebotPositionenJsonToAuftragRows } from "@/lib/portal/copy-angebot-positionen-to-auftrag";
import { isAngebotPortalAnnehmbar } from "@/lib/portal/portal-angebot-sichtbarkeit";
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
      "id, lead_id, kunde_id, status, status_einfach, angebotsnr, gesendet_am, gesendet_kunde_at, pdf_url, positionen"
    )
    .eq("id", id)
    .maybeSingle();
  if (loadErr) logDbError('app/actions/portal-angebot:angebote', loadErr)

  if (loadErr || !angebot) {
    return { ok: false, error: "Angebot wurde nicht gefunden." };
  }

  const kundeId = link.kundeId;
  const angebotKundeId =
    angebot.kunde_id != null ? String(angebot.kunde_id) : null;
  const leadId = angebot.lead_id != null ? String(angebot.lead_id) : null;

  let belongsToKunde = angebotKundeId === kundeId;
  let leadRow: {
    kunde_id?: string | null;
    auftraggeber_kunde_id?: string | null;
    org_freigabe_status?: string | null;
    hv_meldung_status?: string | null;
    freigabe_bypass_grund?: string | null;
    funnel_daten?: unknown;
  } | null = null;

  if (leadId) {
    const {data: lead, error: __dbErr107_1} = await supabaseAdmin
      .from("leads")
      .select(
        "kunde_id, auftraggeber_kunde_id, org_freigabe_status, hv_meldung_status, freigabe_bypass_grund, funnel_daten"
      )
      .eq("id", leadId)
      .maybeSingle();
    if (__dbErr107_1) logDbError('app/actions/portal-angebot:leads', __dbErr107_1)
    leadRow = lead;
    if (!belongsToKunde) {
      const leadKunde =
        lead?.auftraggeber_kunde_id != null
          ? String(lead.auftraggeber_kunde_id)
          : lead?.kunde_id != null
            ? String(lead.kunde_id)
            : null;
      belongsToKunde = leadKunde === kundeId;
    }
  }

  if (!belongsToKunde) {
    return { ok: false, error: "Sie haben keinen Zugriff auf dieses Angebot." };
  }

  if (leadRow?.auftraggeber_kunde_id) {
    const bypass = String(leadRow.freigabe_bypass_grund ?? "")
      .trim()
      .toLowerCase();
    const akut =
      bypass === "akut" || funnelDirektauftragFromDaten(leadRow.funnel_daten);
    if (
      !akut &&
      orgFreigabeBlockiertPartner(
        leadRow.org_freigabe_status,
        leadRow.hv_meldung_status
      )
    ) {
      return {
        ok: false,
        error:
          leadRow.org_freigabe_status === "abgelehnt"
            ? "Die Kostenfreigabe wurde abgelehnt."
            : "Erst Freigabe erteilen — die Hausverwaltung muss das Angebot freigeben.",
      };
    }
  }

  const statusEinfach = normalizeStatus(angebot.status_einfach);
  const statusFein = normalizeStatus(angebot.status);
  const alreadyAccepted =
    statusEinfach === "angenommen" ||
    statusEinfach === "kunde_akzeptiert" ||
    statusFein === "kunde_akzeptiert";
  // Erst nach CRM-Senden (nicht bloß Entwurf + PDF).
  const waitingForAccept = isAngebotPortalAnnehmbar({
    status: angebot.status,
    status_einfach: angebot.status_einfach,
    pdf_url: angebot.pdf_url,
    angebotsnr: angebot.angebotsnr,
    gesendet_am: angebot.gesendet_am,
    gesendet_kunde_at: angebot.gesendet_kunde_at,
  });
  if (!alreadyAccepted && !waitingForAccept) {
    return {
      ok: false,
      error: "Dieses Angebot ist noch nicht freigegeben bzw. nicht annehmbar.",
    };
  }

  const {data: existingAuftrag, error: __dbErr108_2} = await supabaseAdmin
    .from("auftraege")
    .select("id")
    .eq("angebot_id", id)
    .maybeSingle();
  if (__dbErr108_2) logDbError('app/actions/portal-angebot:auftraege', __dbErr108_2)
  if (existingAuftrag?.id) {
    const existingId = String(existingAuftrag.id);
    /* Nachziehen, falls Portal früher ohne Positionen angelegt hat. */
    const {count} = await supabaseAdmin
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
        if (posErr) logDbError('app/actions/portal-angebot:auftrag_positionen', posErr)
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
  if (upErr) logDbError('app/actions/portal-angebot:angebote', upErr)

  if (upErr) {
    console.error("[acceptKundeAngebot] angebot", upErr.message);
    return { ok: false, error: "Annahme konnte nicht gespeichert werden." };
  }

  // Andere Angebote am Lead entwerten (inkl. frühere Annahmen) — eine aktive Version.
  if (leadId) {
    const {data: siblings, error: __dbErr109_3} = await supabaseAdmin
      .from("angebote")
      .select("id, status, status_einfach")
      .eq("lead_id", leadId)
      .neq("id", id);
    if (__dbErr109_3) logDbError('app/actions/portal-angebot:angebote', __dbErr109_3)
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
      if (sibErr) logDbError('app/actions/portal-angebot:angebote', sibErr)
      if (sibErr && /ersetzt_durch|column|schema cache/i.test(sibErr.message)) {
        delete patch.ersetzt_durch;
        const { error: __dbErr116_10 } = await supabaseAdmin.from("angebote").update(patch).eq("id", row.id as string);
        if (__dbErr116_10) logDbError('app/actions/portal-angebot:angebote', __dbErr116_10)
      }
    }
  }

  // Bereits Auftrag zu anderem Angebot am Lead? → kein zweiter Auftrag.
  if (leadId) {
    const {data: leadAuftraege, error: __dbErr110_4} = await supabaseAdmin
      .from("auftraege")
      .select("id, angebot_id, status")
      .eq("lead_id", leadId)
      .neq("status", "storniert")
      .limit(10);
    if (__dbErr110_4) logDbError('app/actions/portal-angebot:auftraege', __dbErr110_4)
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
    const {data: leadRow, error: __dbErr111_5} = await supabaseAdmin
      .from("leads")
      .select("kunde_id, auftraggeber_kunde_id, ist_bauprojekt, titel, gewerk")
      .eq("id", leadId)
      .maybeSingle();
    if (__dbErr111_5) logDbError('app/actions/portal-angebot:leads', __dbErr111_5)
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

  const {data: kundeRow, error: __dbErr112_6} = await supabaseAdmin
    .from("kunden")
    .select("name")
    .eq("id", resolvedKundeId)
    .maybeSingle();
  if (__dbErr112_6) logDbError('app/actions/portal-angebot:kunden', __dbErr112_6)
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
  if (aErr) logDbError('app/actions/portal-angebot:auftraege', aErr)

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
    if (posErr) logDbError('app/actions/portal-angebot:auftrag_positionen', posErr)
    if (posErr) {
      console.error("[acceptKundeAngebot] auftrag_positionen", posErr.message);
    }
  }

  if (leadId) {
    const { error: __dbErr117_11 } = await supabaseAdmin
      .from("leads")
      .update({
        status: "auftrag",
        vorgang_phase: "beauftragt",
        /* Annahme im Portal = Freigabe erledigt — sonst bleibt CRM auf „wartet auf Freigabe“. */
        org_freigabe_status: "freigegeben",
        updated_at: now,
      })
      .eq("id", leadId);
    if (__dbErr117_11) logDbError('app/actions/portal-angebot:leads', __dbErr117_11)
    const { error: __dbErr118_12 } = await supabaseAdmin.from("lead_timeline").insert({
      lead_id: leadId,
      angebot_id: id,
      typ: "angebot",
      titel: "Angebot angenommen — Auftrag erstellt",
      beschreibung: "Über das Kunden-/HV-Portal angenommen.",
      erstellt_von: user.id,
    });
    if (__dbErr118_12) logDbError('app/actions/portal-angebot:lead_timeline', __dbErr118_12)
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

export type RejectKundeAngebotInput = {
  /** Pflicht — CRM `angebote.ablehnung_grund` */
  grund: string;
  /** Pflicht-Freitext — CRM `angebote.ablehnung_notiz` */
  notiz?: string;
};

/**
 * Kunde/HV lehnt gesendetes Angebot im Portal ab (Pflicht-Grund + Notiz → CRM).
 */
export async function rejectKundeAngebot(
  angebotId: string,
  input?: string | RejectKundeAngebotInput
): Promise<RejectKundeAngebotResult> {
  const id = angebotId.trim();
  if (!id) return { ok: false, error: "Ungültiges Angebot." };

  const grundRaw =
    typeof input === "string"
      ? input
      : input && typeof input === "object"
        ? String(input.grund ?? "")
        : "";
  const notizRaw =
    typeof input === "object" && input
      ? String(input.notiz ?? "")
      : "";
  const grundTrim = grundRaw.trim().slice(0, 80);
  const notizTrim = notizRaw.trim().slice(0, 500);
  if (!grundTrim) {
    return { ok: false, error: "Bitte einen Ablehnungsgrund angeben." };
  }
  if (!notizTrim || notizTrim.length < 3) {
    return {
      ok: false,
      error: "Bitte eine kurze Begründung eingeben.",
    };
  }

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
      "id, lead_id, kunde_id, status, status_einfach, angebotsnr, gesendet_am, gesendet_kunde_at, pdf_url"
    )
    .eq("id", id)
    .maybeSingle();
  if (loadErr) logDbError('app/actions/portal-angebot:angebote', loadErr)

  if (loadErr || !angebot) {
    return { ok: false, error: "Angebot wurde nicht gefunden." };
  }

  const kundeId = link.kundeId;
  const angebotKundeId =
    angebot.kunde_id != null ? String(angebot.kunde_id) : null;
  const leadId = angebot.lead_id != null ? String(angebot.lead_id) : null;

  let belongsToKunde = angebotKundeId === kundeId;
  if (!belongsToKunde && leadId) {
    const {data: lead, error: __dbErr113_7} = await supabaseAdmin
      .from("leads")
      .select("kunde_id, auftraggeber_kunde_id")
      .eq("id", leadId)
      .maybeSingle();
    if (__dbErr113_7) logDbError('app/actions/portal-angebot:leads', __dbErr113_7)
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

  if (
    !isAngebotPortalAnnehmbar({
      status: angebot.status,
      status_einfach: angebot.status_einfach,
      pdf_url: angebot.pdf_url,
      angebotsnr: angebot.angebotsnr,
      gesendet_am: angebot.gesendet_am,
      gesendet_kunde_at: angebot.gesendet_kunde_at,
    })
  ) {
    return {
      ok: false,
      error: "Dieses Angebot ist noch nicht freigegeben bzw. nicht ablehnbar.",
    };
  }

  const {data: existingAuftrag, error: __dbErr114_8} = await supabaseAdmin
    .from("auftraege")
    .select("id")
    .eq("angebot_id", id)
    .maybeSingle();
  if (__dbErr114_8) logDbError('app/actions/portal-angebot:auftraege', __dbErr114_8)
  if (existingAuftrag?.id) {
    return {
      ok: false,
      error: "Zum Angebot existiert bereits ein Auftrag.",
    };
  }

  const now = new Date().toISOString();
  const timelineGrund = `${grundTrim}${notizTrim ? `: ${notizTrim}` : ""}`.slice(
    0,
    500
  );

  const { error: upErr } = await supabaseAdmin
    .from("angebote")
    .update({
      status: "abgelehnt",
      status_einfach: "abgelehnt",
      ablehnung_grund: grundTrim,
      ablehnung_notiz: notizTrim,
      updated_at: now,
    })
    .eq("id", id);
  if (upErr) logDbError('app/actions/portal-angebot:angebote', upErr)

  if (upErr) {
    console.error("[rejectKundeAngebot] angebot", upErr.message);
    return { ok: false, error: "Ablehnung konnte nicht gespeichert werden." };
  }

  if (leadId) {
    const leadPatch: Record<string, unknown> = {
      vorgang_phase: "abgelehnt",
      updated_at: now,
    };
    /* Ablehnung = Freigabe beendet — sonst bleibt CRM-Card auf „ausstehend/wartend“. */
    const {data: leadRow, error: __dbErr115_9} = await supabaseAdmin
      .from("leads")
      .select("org_freigabe_status")
      .eq("id", leadId)
      .maybeSingle();
    if (__dbErr115_9) logDbError('app/actions/portal-angebot:leads', __dbErr115_9)
    const freigabe = String(leadRow?.org_freigabe_status ?? "")
      .trim()
      .toLowerCase();
    if (
      freigabe === "ausstehend" ||
      freigabe === "beschluss_ausstehend" ||
      freigabe === "freigegeben"
    ) {
      leadPatch.org_freigabe_status = "abgelehnt";
    }

    const { error: __dbErr119_13 } = await supabaseAdmin.from("leads").update(leadPatch).eq("id", leadId);
    if (__dbErr119_13) logDbError('app/actions/portal-angebot:leads', __dbErr119_13)
    const { error: __dbErr120_14 } = await supabaseAdmin.from("lead_timeline").insert({
      lead_id: leadId,
      angebot_id: id,
      typ: "angebot",
      titel: "Angebot abgelehnt",
      beschreibung: `Über das Portal abgelehnt. Grund: ${timelineGrund}`,
      erstellt_von: user.id,
    });
    if (__dbErr120_14) logDbError('app/actions/portal-angebot:lead_timeline', __dbErr120_14)
    const crmNotify = await notifyCrmOrgPortal({
      leadId,
      typ: "angebot_entscheidung",
      aktion: "abgelehnt",
      notiz: `Angebot im Portal abgelehnt. Grund: ${timelineGrund}`,
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
