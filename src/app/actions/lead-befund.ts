"use server";

import { revalidatePath } from "next/cache";

import { assertOrgLead } from "@/lib/org/assert-org-objekt";
import { insertLeadBefundIfMissing } from "@/lib/org/lead-befund-create";
import type { BefundVorlageKey } from "@/lib/org/lead-befund-vorlagen";
import {
  assertBefundForActor,
  assertLeadForBefundActor,
  requireBefundActor,
  requireBefundWrite,
} from "@/lib/org/require-befund-actor";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

export type LeadBefundErgebnis =
  | "selbst_erledigt"
  | "fachfirma_angebot"
  | "fachfirma_akut";

export type LeadBefundPunktStatus =
  | "unauffaellig"
  | "auffaellig"
  | "nicht_pruefbar";

export type LeadBefundPunktRow = {
  id: string;
  befund_id: string;
  sort_order: number;
  titel: string;
  quelle: "system" | "frei";
  vorlage_key: string | null;
  status: LeadBefundPunktStatus | null;
  notiz: string;
  foto_refs: string[];
};

export type LeadBefundRow = {
  id: string;
  lead_id: string;
  durchgefuehrt_von: string;
  durchgefuehrt_am: string;
  ergebnis: LeadBefundErgebnis | null;
  melde_kategorie: string | null;
  vorlage_key: string | null;
  objekt_kontakt_id: string | null;
  abgeschlossen_at: string | null;
  created_at: string;
  updated_at: string;
  punkte: LeadBefundPunktRow[];
};

type ActionOk<T> = { ok: true } & T;
type ActionErr = { ok: false; error: string };
type ActionResult<T> = ActionOk<T> | ActionErr;

function parseFotoRefs(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
    .map((u) => u.trim());
}

function mapPunkt(row: Record<string, unknown>): LeadBefundPunktRow {
  return {
    id: String(row.id),
    befund_id: String(row.befund_id),
    sort_order: Number(row.sort_order ?? 0),
    titel: String(row.titel ?? ""),
    quelle: row.quelle === "frei" ? "frei" : "system",
    vorlage_key:
      row.vorlage_key != null && String(row.vorlage_key).trim()
        ? String(row.vorlage_key)
        : null,
    status: (row.status as LeadBefundPunktStatus | null) ?? null,
    notiz: String(row.notiz ?? ""),
    foto_refs: parseFotoRefs(row.foto_refs),
  };
}

async function loadBefundWithPunkte(
  befundId: string
): Promise<LeadBefundRow | null> {
  const { data: befund } = await supabaseAdmin
    .from("lead_befunde")
    .select(
      "id, lead_id, durchgefuehrt_von, durchgefuehrt_am, ergebnis, melde_kategorie, vorlage_key, objekt_kontakt_id, abgeschlossen_at, created_at, updated_at"
    )
    .eq("id", befundId)
    .maybeSingle();

  if (!befund) return null;

  const { data: punkte } = await supabaseAdmin
    .from("lead_befund_punkte")
    .select(
      "id, befund_id, sort_order, titel, quelle, vorlage_key, status, notiz, foto_refs"
    )
    .eq("befund_id", befundId)
    .order("sort_order", { ascending: true });

  return {
    id: String(befund.id),
    lead_id: String(befund.lead_id),
    durchgefuehrt_von: String(befund.durchgefuehrt_von ?? ""),
    durchgefuehrt_am: String(befund.durchgefuehrt_am ?? ""),
    ergebnis: (befund.ergebnis as LeadBefundErgebnis | null) ?? null,
    melde_kategorie:
      befund.melde_kategorie != null
        ? String(befund.melde_kategorie)
        : null,
    vorlage_key:
      befund.vorlage_key != null ? String(befund.vorlage_key) : null,
    objekt_kontakt_id:
      befund.objekt_kontakt_id != null
        ? String(befund.objekt_kontakt_id)
        : null,
    abgeschlossen_at:
      befund.abgeschlossen_at != null
        ? String(befund.abgeschlossen_at)
        : null,
    created_at: String(befund.created_at),
    updated_at: String(befund.updated_at),
    punkte: (punkte ?? []).map((p) => mapPunkt(p as Record<string, unknown>)),
  };
}

/** Bestehenden Befund inkl. Punkte laden (oder null). */
export async function getLeadBefundAction(input: {
  leadId: string;
}): Promise<ActionResult<{ befund: LeadBefundRow | null }>> {
  const actorRes = await requireBefundActor();
  if (!actorRes.ok) return { ok: false, error: actorRes.error };

  const leadId = String(input.leadId ?? "").trim();
  if (!leadId) return { ok: false, error: "Lead fehlt." };

  const lead = await assertLeadForBefundActor(actorRes.actor, leadId);
  if (!lead) return { ok: false, error: "Vorgang nicht gefunden." };

  const { data: existing } = await supabaseAdmin
    .from("lead_befunde")
    .select("id")
    .eq("lead_id", leadId)
    .maybeSingle();

  if (!existing?.id) return { ok: true, befund: null };

  const befund = await loadBefundWithPunkte(String(existing.id));
  return { ok: true, befund };
}

/**
 * Befund anlegen und Systempunkte aus Vorlage materialisieren.
 * Idempotent: existiert bereits ein Befund für den Lead → diesen zurückgeben.
 */
export async function createLeadBefundAction(input: {
  leadId: string;
  durchgefuehrtVon?: string;
  durchgefuehrtAm?: string;
  objektKontaktId?: string | null;
  /** Optional Override; sonst aus funnel_daten. */
  vorlageKey?: BefundVorlageKey;
}): Promise<ActionResult<{ befund: LeadBefundRow }>> {
  const actorRes = await requireBefundActor();
  if (!actorRes.ok) return { ok: false, error: actorRes.error };
  const write = requireBefundWrite(actorRes.actor);
  if (!write.ok) return { ok: false, error: write.error };

  const leadId = String(input.leadId ?? "").trim();
  if (!leadId) return { ok: false, error: "Lead fehlt." };

  const lead = await assertLeadForBefundActor(actorRes.actor, leadId);
  if (!lead) return { ok: false, error: "Vorgang nicht gefunden." };

  const created = await insertLeadBefundIfMissing({
    leadId,
    durchgefuehrtVon: input.durchgefuehrtVon,
    durchgefuehrtAm: input.durchgefuehrtAm,
    objektKontaktId: input.objektKontaktId,
    vorlageKey: input.vorlageKey,
    createdByKundeId: actorRes.actor.orgKundeId,
  });
  if (!created.ok) return { ok: false, error: created.error };

  const befund = await loadBefundWithPunkte(created.befundId);
  if (!befund) return { ok: false, error: "Befund laden fehlgeschlagen." };

  revalidatePath("/portal");
  return { ok: true, befund };
}

/** Kopf-Felder patchen (Name, Datum) — kein Ergebnis-/Status-Workflow. */
export async function updateLeadBefundKopfAction(input: {
  befundId: string;
  durchgefuehrtVon?: string;
  durchgefuehrtAm?: string;
}): Promise<ActionResult<{ befund: LeadBefundRow }>> {
  const actorRes = await requireBefundActor();
  if (!actorRes.ok) return { ok: false, error: actorRes.error };
  const write = requireBefundWrite(actorRes.actor);
  if (!write.ok) return { ok: false, error: write.error };

  const befundId = String(input.befundId ?? "").trim();
  if (!befundId) return { ok: false, error: "Befund fehlt." };

  const owned = await assertBefundForActor(actorRes.actor, befundId);
  if (!owned) return { ok: false, error: "Befund nicht gefunden." };

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.durchgefuehrtVon !== undefined) {
    patch.durchgefuehrt_von = input.durchgefuehrtVon.trim();
  }
  if (input.durchgefuehrtAm !== undefined) {
    const d = input.durchgefuehrtAm.trim().slice(0, 10);
    if (d) patch.durchgefuehrt_am = d;
  }

  const { error } = await supabaseAdmin
    .from("lead_befunde")
    .update(patch)
    .eq("id", befundId);
  if (error) return { ok: false, error: error.message };

  const befund = await loadBefundWithPunkte(befundId);
  if (!befund) return { ok: false, error: "Befund laden fehlgeschlagen." };

  revalidatePath("/portal");
  return { ok: true, befund };
}

/** Punkt: Status / Notiz / Fotos patchen. */
export async function updateLeadBefundPunktAction(input: {
  punktId: string;
  status?: LeadBefundPunktStatus | null;
  notiz?: string;
  fotoRefs?: string[];
}): Promise<ActionResult<{ punkt: LeadBefundPunktRow }>> {
  const actorRes = await requireBefundActor();
  if (!actorRes.ok) return { ok: false, error: actorRes.error };
  const write = requireBefundWrite(actorRes.actor);
  if (!write.ok) return { ok: false, error: write.error };

  const punktId = String(input.punktId ?? "").trim();
  if (!punktId) return { ok: false, error: "Punkt fehlt." };

  const { data: punkt } = await supabaseAdmin
    .from("lead_befund_punkte")
    .select("id, befund_id")
    .eq("id", punktId)
    .maybeSingle();
  if (!punkt?.befund_id) return { ok: false, error: "Punkt nicht gefunden." };

  const owned = await assertBefundForActor(
    actorRes.actor,
    String(punkt.befund_id)
  );
  if (!owned) return { ok: false, error: "Punkt nicht gefunden." };

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.status !== undefined) {
    if (
      input.status !== null &&
      !["unauffaellig", "auffaellig", "nicht_pruefbar"].includes(input.status)
    ) {
      return { ok: false, error: "Status ungültig." };
    }
    patch.status = input.status;
  }
  if (input.notiz !== undefined) {
    patch.notiz = input.notiz.trim();
  }
  if (input.fotoRefs !== undefined) {
    patch.foto_refs = input.fotoRefs
      .filter((u) => typeof u === "string" && u.trim())
      .map((u) => u.trim());
  }

  const { data: updated, error } = await supabaseAdmin
    .from("lead_befund_punkte")
    .update(patch)
    .eq("id", punktId)
    .select(
      "id, befund_id, sort_order, titel, quelle, vorlage_key, status, notiz, foto_refs"
    )
    .single();

  if (error || !updated) {
    return { ok: false, error: error?.message ?? "Speichern fehlgeschlagen." };
  }

  await supabaseAdmin
    .from("lead_befunde")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", owned.befundId);

  revalidatePath("/portal");
  return { ok: true, punkt: mapPunkt(updated as Record<string, unknown>) };
}

/**
 * Abschluss aus dem HM-Sheet:
 * - selbst_erledigt → hm_erledigt (kein CRM)
 * - fachfirma_angebot → angebot_eingefordert + CRM
 * - fachfirma_akut → Akut-Bypass + CRM (HV-Klick = Freigabe)
 */
export async function completeLeadBefundAction(input: {
  befundId: string;
  ergebnis: LeadBefundErgebnis;
  durchgefuehrtVon?: string;
}): Promise<ActionResult<{ befund: LeadBefundRow; hvStatus: string }>> {
  const actorRes = await requireBefundActor();
  if (!actorRes.ok) return { ok: false, error: actorRes.error };
  const write = requireBefundWrite(actorRes.actor);
  if (!write.ok) return { ok: false, error: write.error };

  const befundId = String(input.befundId ?? "").trim();
  const ergebnis = input.ergebnis;
  if (!befundId) return { ok: false, error: "Befund fehlt." };
  if (
    !["selbst_erledigt", "fachfirma_angebot", "fachfirma_akut"].includes(
      ergebnis
    )
  ) {
    return { ok: false, error: "Ergebnis ungültig." };
  }

  const owned = await assertBefundForActor(actorRes.actor, befundId);
  if (!owned) return { ok: false, error: "Befund nicht gefunden." };

  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select(
      "id, hv_meldung_status, funnel_daten, org_freigabe_status, freigabe_bypass_grund"
    )
    .eq("id", owned.leadId)
    .maybeSingle();

  if (!lead) return { ok: false, error: "Vorgang nicht gefunden." };
  const hv = String(lead.hv_meldung_status ?? "").trim().toLowerCase();
  if (hv !== "hm_pruefung") {
    return {
      ok: false,
      error: "Abschluss nur während Hausmeister-Prüfung möglich.",
    };
  }

  const nowIso = new Date().toISOString();
  const befundPatch: Record<string, unknown> = {
    ergebnis,
    abgeschlossen_at: nowIso,
    updated_at: nowIso,
  };
  if (input.durchgefuehrtVon !== undefined) {
    befundPatch.durchgefuehrt_von = input.durchgefuehrtVon.trim();
  }

  const { error: bErr } = await supabaseAdmin
    .from("lead_befunde")
    .update(befundPatch)
    .eq("id", befundId);
  if (bErr) return { ok: false, error: bErr.message };

  let hvStatus = "hm_pruefung";

  if (ergebnis === "selbst_erledigt") {
    hvStatus = "hm_erledigt";
    const { error } = await supabaseAdmin
      .from("leads")
      .update({
        hv_meldung_status: "hm_erledigt",
        vorgang_phase: "abgeschlossen",
      })
      .eq("id", owned.leadId);
    if (error) return { ok: false, error: error.message };
  } else if (ergebnis === "fachfirma_angebot") {
    hvStatus = "angebot_eingefordert";
    const { error } = await supabaseAdmin
      .from("leads")
      .update({ hv_meldung_status: "angebot_eingefordert" })
      .eq("id", owned.leadId);
    if (error) return { ok: false, error: error.message };

    const { notifyCrmOrgPortal } = await import("@/lib/org/notify-crm-org");
    const crm = await notifyCrmOrgPortal({
      leadId: owned.leadId,
      typ: "meldung",
    });
    if (!crm.ok) {
      console.warn("[completeLeadBefund] CRM-Notify:", crm.error);
    }
  } else {
    // fachfirma_akut — HV-Klick = Freigabe, unabhängig von notfall_direkt
    hvStatus = "angebot_eingefordert";
    const fd =
      lead.funnel_daten &&
      typeof lead.funnel_daten === "object" &&
      !Array.isArray(lead.funnel_daten)
        ? { ...(lead.funnel_daten as Record<string, unknown>) }
        : {};
    fd.direktauftrag = true;
    fd.notfall = true;
    fd.hm_fachfirma_akut = true;

    const { error } = await supabaseAdmin
      .from("leads")
      .update({
        hv_meldung_status: "angebot_eingefordert",
        freigabe_bypass_grund: "akut",
        org_freigabe_status: "nicht_noetig",
        funnel_daten: fd,
        situation: "notfall",
      })
      .eq("id", owned.leadId);
    if (error) return { ok: false, error: error.message };

    const { notifyCrmOrgPortal } = await import("@/lib/org/notify-crm-org");
    const crm = await notifyCrmOrgPortal({
      leadId: owned.leadId,
      typ: "meldung",
    });
    if (!crm.ok) {
      console.warn("[completeLeadBefund] CRM-Notify Akut:", crm.error);
    }
  }

  const befund = await loadBefundWithPunkte(befundId);
  if (!befund) return { ok: false, error: "Befund laden fehlgeschlagen." };

  void import("@/lib/org/ensure-versicherungsakte").then(
    ({ ensureVersicherungsakteForLead }) =>
      ensureVersicherungsakteForLead(owned.leadId).catch((e) =>
        console.warn("[completeLeadBefund] schadenakte:", e)
      )
  );

  void import("@/lib/org/notify-hv-hm-befund").then(
    ({ notifyHvHausmeisterBefundFertig }) =>
      notifyHvHausmeisterBefundFertig({
        leadId: owned.leadId,
        ergebnis,
      }).catch((e) =>
        console.warn("[completeLeadBefund] HV-Notify:", e)
      )
  );

  revalidatePath("/portal");
  return { ok: true, befund, hvStatus };
}

/** Freipunkt am Ende der Liste hinzufügen. */
export async function addLeadBefundFreipunktAction(input: {
  befundId: string;
  titel: string;
}): Promise<ActionResult<{ punkt: LeadBefundPunktRow }>> {
  const actorRes = await requireBefundActor();
  if (!actorRes.ok) return { ok: false, error: actorRes.error };
  const write = requireBefundWrite(actorRes.actor);
  if (!write.ok) return { ok: false, error: write.error };

  const befundId = String(input.befundId ?? "").trim();
  const titel = String(input.titel ?? "").trim();
  if (!befundId) return { ok: false, error: "Befund fehlt." };
  if (titel.length < 2) return { ok: false, error: "Titel zu kurz." };

  const owned = await assertBefundForActor(actorRes.actor, befundId);
  if (!owned) return { ok: false, error: "Befund nicht gefunden." };

  const { data: maxRow } = await supabaseAdmin
    .from("lead_befund_punkte")
    .select("sort_order")
    .eq("befund_id", befundId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder =
    maxRow?.sort_order != null && Number.isFinite(Number(maxRow.sort_order))
      ? Number(maxRow.sort_order) + 1
      : 0;

  const { data: inserted, error } = await supabaseAdmin
    .from("lead_befund_punkte")
    .insert({
      befund_id: befundId,
      sort_order: nextOrder,
      titel,
      quelle: "frei",
      vorlage_key: null,
      notiz: "",
      foto_refs: [],
    })
    .select(
      "id, befund_id, sort_order, titel, quelle, vorlage_key, status, notiz, foto_refs"
    )
    .single();

  if (error || !inserted) {
    return { ok: false, error: error?.message ?? "Punkt anlegen fehlgeschlagen." };
  }

  await supabaseAdmin
    .from("lead_befunde")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", befundId);

  revalidatePath("/portal");
  return { ok: true, punkt: mapPunkt(inserted as Record<string, unknown>) };
}

/** Ob am Lead-Objekt ein Hausmeister-Kontakt hinterlegt ist. */
export async function getLeadHausmeisterMetaAction(input: {
  leadId: string;
}): Promise<
  ActionResult<{ kundeObjektId: string | null; hasHausmeister: boolean }>
> {
  const session = await requireOrganisationSession();
  if (!session.ok) return { ok: false, error: session.error };

  const leadId = String(input.leadId ?? "").trim();
  if (!leadId) return { ok: false, error: "Lead fehlt." };

  const lead = await assertOrgLead(session.kunde.id, leadId);
  if (!lead) return { ok: false, error: "Vorgang nicht gefunden." };

  const oid =
    lead.kunde_objekt_id != null ? String(lead.kunde_objekt_id).trim() : null;
  if (!oid) {
    return { ok: true, kundeObjektId: null, hasHausmeister: false };
  }

  const { loadObjektHausmeisterKontakt } = await import(
    "@/lib/org/objekt-hausmeister"
  );
  const hm = await loadObjektHausmeisterKontakt(oid);
  return {
    ok: true,
    kundeObjektId: oid,
    hasHausmeister: hm != null,
  };
}

/** Foto an einen Befund-Punkt anhängen. */
export async function uploadLeadBefundFotoAction(input: {
  punktId: string;
  formData: FormData;
}): Promise<ActionResult<{ punkt: LeadBefundPunktRow }>> {
  const actorRes = await requireBefundActor();
  if (!actorRes.ok) return { ok: false, error: actorRes.error };
  const write = requireBefundWrite(actorRes.actor);
  if (!write.ok) return { ok: false, error: write.error };

  const punktId = String(input.punktId ?? "").trim();
  if (!punktId) return { ok: false, error: "Punkt fehlt." };

  const file = input.formData.get("foto");
  if (!(file instanceof File) || file.size <= 0) {
    return { ok: false, error: "Foto fehlt." };
  }

  const { data: punkt } = await supabaseAdmin
    .from("lead_befund_punkte")
    .select("id, befund_id, foto_refs")
    .eq("id", punktId)
    .maybeSingle();
  if (!punkt?.befund_id) return { ok: false, error: "Punkt nicht gefunden." };

  const owned = await assertBefundForActor(
    actorRes.actor,
    String(punkt.befund_id)
  );
  if (!owned) return { ok: false, error: "Punkt nicht gefunden." };

  const { uploadMeldungFoto } = await import("@/lib/org/meldung-storage");
  const up = await uploadMeldungFoto(owned.leadId, file);
  if (!up.ok) return { ok: false, error: up.error };

  const prev = parseFotoRefs(punkt.foto_refs);
  const next = [...prev, up.publicUrl];

  const { data: updated, error } = await supabaseAdmin
    .from("lead_befund_punkte")
    .update({
      foto_refs: next,
      updated_at: new Date().toISOString(),
    })
    .eq("id", punktId)
    .select(
      "id, befund_id, sort_order, titel, quelle, vorlage_key, status, notiz, foto_refs"
    )
    .single();

  if (error || !updated) {
    return { ok: false, error: error?.message ?? "Speichern fehlgeschlagen." };
  }

  revalidatePath("/portal");
  return { ok: true, punkt: mapPunkt(updated as Record<string, unknown>) };
}
