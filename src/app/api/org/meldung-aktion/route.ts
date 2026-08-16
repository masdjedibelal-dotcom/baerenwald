import { NextResponse } from "next/server";

import { canOfferKleinreparatur } from "@/lib/org/hv-meldung-workflow";
import { notifyCrmOrgPortal } from "@/lib/org/notify-crm-org";
import { notifyHausmeisterPruefung } from "@/lib/org/notify-hausmeister-pruefung";
import { loadObjektHausmeisterKontakt } from "@/lib/org/objekt-hausmeister";
import { requireOrganisationSession } from "@/lib/org/require-org-session";
import { requireOrgWrite } from "@/lib/org/assert-org-objekt";
import { supabaseAdmin } from "@/lib/supabase";
import { isValidEmail } from "@/lib/validation";
import { Resend } from "resend";

export const runtime = "nodejs";

type Aktion =
  | "angebot_einfordern"
  | "direkt_baerenwald"
  | "hm_begutachten"
  | "ablehnen"
  | "kleinreparatur_freigeben";

type Body = {
  leadId: string;
  aktion: Aktion;
};

/**
 * HV-Aktion auf Meldung:
 * - hm_begutachten (neu → hm_pruefung, nur mit HM-Kontakt)
 * - direkt_baerenwald / angebot_einfordern (neu|hm_pruefung → angebot_eingefordert)
 * - ablehnen / kleinreparatur (Legacy)
 */
export async function POST(req: Request) {
  const session = await requireOrganisationSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }
  const write = requireOrgWrite(session);
  if (!write.ok) {
    return NextResponse.json({ error: write.error }, { status: write.status });
  }

  const body = (await req.json()) as Body;
  const leadId = String(body.leadId ?? "").trim();
  const aktion = body.aktion;
  const allowed: Aktion[] = [
    "angebot_einfordern",
    "direkt_baerenwald",
    "hm_begutachten",
    "ablehnen",
    "kleinreparatur_freigeben",
  ];
  if (!leadId || !allowed.includes(aktion)) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const orgId = session.kunde.id;
  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select(
      "id, auftraggeber_kunde_id, kunde_objekt_id, hv_meldung_status, anlass, preis_max, preis_unsicher, melder_name, melder_email, funnel_daten, org_freigabe_status, freigabe_bypass_grund"
    )
    .eq("id", leadId)
    .maybeSingle();

  if (!lead || lead.auftraggeber_kunde_id !== orgId) {
    return NextResponse.json({ error: "Meldung nicht gefunden." }, { status: 404 });
  }
  if (lead.anlass !== "meldung") {
    return NextResponse.json({ error: "Kein Meldungs-Vorgang." }, { status: 400 });
  }

  const hvStatus = (lead.hv_meldung_status ?? "neu").trim().toLowerCase();

  // --- hm_begutachten -------------------------------------------------------
  if (aktion === "hm_begutachten") {
    if (hvStatus !== "neu") {
      return NextResponse.json(
        { error: "Hausmeister-Prüfung nur aus Status „Neu“ möglich." },
        { status: 409 }
      );
    }

    const { hvFreigabeEntfaellt } = await import("@/lib/org/freigabe-bypass");
    const funnelDa =
      lead.funnel_daten &&
      typeof lead.funnel_daten === "object" &&
      !Array.isArray(lead.funnel_daten)
        ? (lead.funnel_daten as { direktauftrag?: unknown }).direktauftrag ===
          true
        : false;
    if (
      hvFreigabeEntfaellt({
        orgFreigabeStatus: lead.org_freigabe_status,
        bypassGrund: lead.freigabe_bypass_grund,
        funnelDirektauftrag: funnelDa,
        hvMeldungStatus: lead.hv_meldung_status,
        angebotZugestellt: false,
      })
    ) {
      return NextResponse.json(
        { error: "Akut-Pfad — Hausmeister-Prüfung entfällt." },
        { status: 409 }
      );
    }

    const hm = await loadObjektHausmeisterKontakt(lead.kunde_objekt_id);
    // HM-Pfad immer möglich (Name am Befund optional aus Zuordnung)

    const { error: updErr } = await supabaseAdmin
      .from("leads")
      .update({ hv_meldung_status: "hm_pruefung" })
      .eq("id", leadId);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    const { insertLeadBefundIfMissing } = await import(
      "@/lib/org/lead-befund-create"
    );
    const befundRes = await insertLeadBefundIfMissing({
      leadId,
      durchgefuehrtVon: hm?.name ?? "Hausmeister",
      createdByKundeId: session.kunde.id,
    });
    if (!befundRes.ok) {
      console.warn("[meldung-aktion] befund:", befundRes.error);
    }

    // Mail an HM nur wenn E-Mail da und Portal vorgesehen oder schon aktiv
    if (
      hm?.email &&
      (hm.portalKundeId || hm.portalZugang)
    ) {
      void notifyHausmeisterPruefung({
        leadId,
        toEmail: hm.email,
        kontaktName: hm.name,
      }).then((r) => {
        if (!r.ok && !r.skipped) {
          console.warn("[meldung-aktion] HM-Mail:", r.error);
        }
      });
    }

    return NextResponse.json({
      ok: true,
      status: "hm_pruefung",
      befundId: befundRes.ok ? befundRes.befundId : null,
    });
  }

  // --- direkt_baerenwald / angebot_einfordern (Override aus hm_pruefung) ----
  if (aktion === "direkt_baerenwald" || aktion === "angebot_einfordern") {
    if (hvStatus !== "neu" && hvStatus !== "hm_pruefung") {
      return NextResponse.json(
        { error: "Für diese Meldung ist die Aktion nicht mehr möglich." },
        { status: 409 }
      );
    }

    if (hvStatus === "neu") {
      const { hvFreigabeEntfaellt } = await import("@/lib/org/freigabe-bypass");
      const funnelDa =
        lead.funnel_daten &&
        typeof lead.funnel_daten === "object" &&
        !Array.isArray(lead.funnel_daten)
          ? (lead.funnel_daten as { direktauftrag?: unknown }).direktauftrag ===
            true
          : false;
      if (
        hvFreigabeEntfaellt({
          orgFreigabeStatus: lead.org_freigabe_status,
          bypassGrund: lead.freigabe_bypass_grund,
          funnelDirektauftrag: funnelDa,
          hvMeldungStatus: lead.hv_meldung_status,
          angebotZugestellt: false,
        })
      ) {
        return NextResponse.json(
          { error: "Keine Freigabe notwendig (Akut oder unter Schwelle)." },
          { status: 409 }
        );
      }
    }

    const { error: updErr } = await supabaseAdmin
      .from("leads")
      .update({ hv_meldung_status: "angebot_eingefordert" })
      .eq("id", leadId);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    const crmNotify = await notifyCrmOrgPortal({ leadId, typ: "meldung" });
    if (!crmNotify.ok) {
      console.warn("[meldung-aktion] CRM-Notify:", crmNotify.error, {
        leadId,
        skipped: crmNotify.skipped === true,
      });
    }

    return NextResponse.json({ ok: true, status: "angebot_eingefordert" });
  }

  // --- ablehnen / kleinreparatur (nur aus neu) ------------------------------
  if (hvStatus !== "neu") {
    return NextResponse.json(
      { error: "Für diese Meldung ist die Aktion nicht mehr möglich." },
      { status: 409 }
    );
  }

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
      angebotZugestellt: false,
    })
  ) {
    return NextResponse.json(
      { error: "Keine Freigabe notwendig (Akut oder unter Schwelle)." },
      { status: 409 }
    );
  }

  if (
    aktion === "kleinreparatur_freigeben" &&
    !canOfferKleinreparatur(session.kunde, lead.preis_max)
  ) {
    return NextResponse.json(
      {
        error:
          "Kleinreparatur ist nicht verfügbar (Einstellung aus oder Betrag über Schwelle).",
      },
      { status: 400 }
    );
  }

  const status = aktion === "ablehnen" ? "abgelehnt" : "kleinreparatur";
  const patch: Record<string, string> = { hv_meldung_status: status };
  if (aktion === "ablehnen") {
    patch.org_freigabe_status = "abgelehnt";
  }

  const { error: updErr } = await supabaseAdmin
    .from("leads")
    .update(patch)
    .eq("id", leadId);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  let objektTitel = "Objekt";
  if (lead.kunde_objekt_id) {
    const { data: obj } = await supabaseAdmin
      .from("kunden_objekte")
      .select("titel")
      .eq("id", lead.kunde_objekt_id)
      .maybeSingle();
    objektTitel = String(obj?.titel ?? "Objekt");
  }

  if (aktion === "kleinreparatur_freigeben") {
    const crmNotify = await notifyCrmOrgPortal({ leadId, typ: "meldung" });
    if (!crmNotify.ok) {
      console.warn("[meldung-aktion] CRM-Notify:", crmNotify.error);
    }
  }

  const resendKey = process.env.RESEND_API_KEY;
  const orgEmail = session.kunde.email?.trim() ?? "";
  if (
    aktion === "kleinreparatur_freigeben" &&
    resendKey &&
    isValidEmail(orgEmail)
  ) {
    const portalPath = `/portal?section=vorgaenge&id=${encodeURIComponent(leadId)}`;
    try {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from:
          process.env.RESEND_FROM_SYSTEM ??
          "System <system@baerenwaldmuenchen.de>",
        to: orgEmail,
        subject: `Kleinreparatur — ${objektTitel}`,
        html: `<p>Kleinreparatur für <strong>${objektTitel}</strong>${
          lead.melder_name ? ` (${lead.melder_name})` : ""
        } freigegeben.</p><p><a href="${portalPath}">Zum Vorgang</a></p>`,
      });
    } catch (e) {
      console.error("[meldung-aktion] org mail:", e);
    }
  }

  return NextResponse.json({ ok: true, status });
}
