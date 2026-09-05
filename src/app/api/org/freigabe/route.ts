import { NextResponse } from "next/server";

import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import { setLeadVorgangPhase } from "@/lib/melde/mieter-status-mail";
import { notifyCrmOrgPortal } from "@/lib/org/notify-crm-org";
import { requireOrgFreigabeSession } from "@/lib/org/require-org-session";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type FreigabeAktion = "freigegeben" | "abgelehnt" | "beschluss_ausstehend";

type PostBody = {
  leadId: string;
  aktion: FreigabeAktion;
  betrag_eur?: number | null;
  notiz?: string | null;
  beschluss_versammlung_am?: string | null;
  beschluss_protokoll_url?: string | null;
};

type PatchBody = {
  leadId: string;
  beschluss_versammlung_am?: string | null;
  beschluss_protokoll_url?: string | null;
};

const LEAD_SELECT =
  "id, auftraggeber_kunde_id, kunde_id, org_freigabe_status, freigabe_bypass_grund, hv_meldung_status, funnel_daten";

function parseIsoDate(raw: string | null | undefined): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

async function assertLeadAccess(leadId: string, orgId: string) {
  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select(LEAD_SELECT)
    .eq("id", leadId)
    .maybeSingle();

  if (
    !lead ||
    (lead.auftraggeber_kunde_id !== orgId && lead.kunde_id !== orgId)
  ) {
    return { ok: false as const, status: 404, error: "Lead nicht gefunden." };
  }
  return { ok: true as const, lead };
}

async function assertFreigabeAllowed(lead: {
  org_freigabe_status?: string | null;
  freigabe_bypass_grund?: string | null;
  hv_meldung_status?: string | null;
  funnel_daten?: unknown;
}) {
  const { hvFreigabeEntfaellt } = await import("@/lib/org/freigabe-bypass");
  const funnelDa =
    lead.funnel_daten &&
    typeof lead.funnel_daten === "object" &&
    !Array.isArray(lead.funnel_daten)
      ? (lead.funnel_daten as { direktauftrag?: unknown }).direktauftrag === true
      : false;
  if (
    hvFreigabeEntfaellt({
      orgFreigabeStatus: lead.org_freigabe_status,
      bypassGrund: lead.freigabe_bypass_grund,
      funnelDirektauftrag: funnelDa,
      hvMeldungStatus: lead.hv_meldung_status,
      angebotZugestellt: true,
    })
  ) {
    return {
      ok: false as const,
      status: 409,
      error: "Keine Freigabe notwendig (Akut oder unter Schwelle).",
    };
  }
  return { ok: true as const };
}

/**
 * HV-Angebots-Freigabe / Ablehnung / Beschluss-Parkzustand.
 */
export async function POST(req: Request) {
  const session = await requireOrgFreigabeSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = (await req.json()) as PostBody;
  const leadId = String(body.leadId ?? "").trim();
  const aktion = body.aktion;
  if (
    !leadId ||
    (aktion !== "freigegeben" &&
      aktion !== "abgelehnt" &&
      aktion !== "beschluss_ausstehend")
  ) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const orgId = session.kunde.id;
  const access = await assertLeadAccess(leadId, orgId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const lead = access.lead;

  const allowed = await assertFreigabeAllowed(lead);
  if (!allowed.ok) {
    return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  }

  const current = (lead.org_freigabe_status ?? "").trim();
  if (aktion === "beschluss_ausstehend") {
    if (current !== "ausstehend") {
      return NextResponse.json(
        { error: "Beschluss kann nur aus dem Freigabe-Status gesetzt werden." },
        { status: 409 }
      );
    }
  } else if (current !== "ausstehend" && current !== "beschluss_ausstehend") {
    return NextResponse.json(
      { error: "Freigabe ist für diesen Vorgang nicht offen." },
      { status: 409 }
    );
  }

  const patch: Record<string, unknown> = {
    org_freigabe_status: aktion,
  };
  const versammlungAm = parseIsoDate(body.beschluss_versammlung_am);
  if (aktion === "beschluss_ausstehend" && versammlungAm) {
    patch.beschluss_versammlung_am = versammlungAm;
  }
  const protokollUrl = body.beschluss_protokoll_url?.trim();
  if (aktion === "beschluss_ausstehend" && protokollUrl) {
    patch.beschluss_protokoll_url = protokollUrl;
  }
  if (aktion === "freigegeben" || aktion === "abgelehnt") {
    patch.beschluss_versammlung_am = null;
    patch.beschluss_protokoll_url = null;
  }

  const { error: updErr } = await supabaseAdmin
    .from("leads")
    .update(patch)
    .eq("id", leadId);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  const logAktion =
    aktion === "freigegeben"
      ? "freigegeben"
      : aktion === "abgelehnt"
        ? "abgelehnt"
        : "beschluss_ausstehend";

  await supabaseAdmin.from("org_freigabe_log").insert({
    lead_id: leadId,
    auftraggeber_kunde_id: orgId,
    aktion: logAktion,
    betrag_eur: body.betrag_eur ?? null,
    notiz: body.notiz?.trim() || null,
    erstellt_von: "portal",
  });

  await writeAuditEvent({
    entityType: "lead",
    entityId: leadId,
    aktion:
      aktion === "freigegeben"
        ? "org_freigabe"
        : aktion === "abgelehnt"
          ? "org_freigabe_abgelehnt"
          : "org_freigabe_beschluss",
    actorId: session.userId,
    actorRolle: session.rolle,
    kundeId: orgId,
    payload: {
      betrag_eur: body.betrag_eur ?? null,
      notiz: body.notiz ?? null,
      beschluss_versammlung_am: versammlungAm,
    },
  });

  if (aktion === "freigegeben") {
    await setLeadVorgangPhase(leadId, "in_bearbeitung");
    await writeAuditEvent({
      entityType: "lead",
      entityId: leadId,
      aktion: "phase_in_bearbeitung",
      actorId: session.userId,
      actorRolle: session.rolle,
      kundeId: orgId,
      payload: { phase: "in_bearbeitung" },
    });
  }

  if (aktion === "freigegeben" || aktion === "abgelehnt") {
    const crmNotify = await notifyCrmOrgPortal({
      leadId,
      typ: "freigabe_ergebnis",
      aktion,
      notiz: body.notiz,
    });
    if (!crmNotify.ok) {
      console.warn("[org/freigabe] CRM-Notify fehlgeschlagen:", crmNotify.error, {
        leadId,
        aktion,
        skipped: crmNotify.skipped === true,
      });
    }
  }

  const timelineTitel =
    aktion === "freigegeben"
      ? "HV-Freigabe erteilt"
      : aktion === "abgelehnt"
        ? "HV-Freigabe abgelehnt"
        : "Wartet auf Eigentümerbeschluss";

  const timelineBeschreibung =
    body.notiz?.trim() ||
    (aktion === "freigegeben"
      ? "Hausverwaltung hat den Vorgang freigegeben."
      : aktion === "abgelehnt"
        ? "Hausverwaltung hat die Freigabe abgelehnt."
        : versammlungAm
          ? `Freigabe pausiert — Versammlung geplant am ${versammlungAm}.`
          : "Freigabe pausiert — Eigentümerbeschluss erforderlich.");

  await supabaseAdmin.from("lead_timeline").insert({
    lead_id: leadId,
    typ: "org_freigabe",
    titel: timelineTitel,
    beschreibung: timelineBeschreibung,
    erstellt_von: session.userId,
  });

  return NextResponse.json({
    ok: true,
    status: aktion,
  });
}

/** Meta-Felder im Beschluss-Parkzustand aktualisieren. */
export async function PATCH(req: Request) {
  const session = await requireOrgFreigabeSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const body = (await req.json()) as PatchBody;
  const leadId = String(body.leadId ?? "").trim();
  if (!leadId) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const orgId = session.kunde.id;
  const access = await assertLeadAccess(leadId, orgId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  if ((access.lead.org_freigabe_status ?? "").trim() !== "beschluss_ausstehend") {
    return NextResponse.json(
      { error: "Meta-Felder nur im Beschluss-Parkzustand änderbar." },
      { status: 409 }
    );
  }

  const patch: Record<string, unknown> = {};
  if (body.beschluss_versammlung_am !== undefined) {
    patch.beschluss_versammlung_am = parseIsoDate(body.beschluss_versammlung_am);
  }
  if (body.beschluss_protokoll_url !== undefined) {
    const url = body.beschluss_protokoll_url?.trim();
    patch.beschluss_protokoll_url = url || null;
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Keine Felder zum Aktualisieren." }, { status: 400 });
  }

  const { error: updErr } = await supabaseAdmin
    .from("leads")
    .update(patch)
    .eq("id", leadId);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
