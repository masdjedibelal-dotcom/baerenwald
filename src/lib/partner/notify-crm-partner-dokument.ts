/**
 * Portal → CRM: Partner hat Compliance / Unterlage / Fachnachweis hochgeladen.
 */

function crmDashboardBase(): string | null {
  const raw = (
    process.env.NEXT_PUBLIC_DASHBOARD_URL?.trim() ||
    process.env.CRM_DASHBOARD_URL?.trim() ||
    process.env.NEXT_PUBLIC_CRM_URL?.trim() ||
    ""
  ).replace(/\/$/, "");
  return raw || null;
}

export type PartnerDokumentUploadTyp =
  | "compliance"
  | "compliance_delete"
  | "unterlage"
  | "fachdoku"
  | "angebot"
  | "rechnung";

export async function notifyCrmPartnerDokumentUpload(input: {
  typ: PartnerDokumentUploadTyp;
  handwerkerId: string;
  titel?: string | null;
  auftragId?: string | null;
  dokumentId?: string | null;
  anfrageId?: string | null;
  slotId?: string | null;
}): Promise<{ rechnungId?: string | null }> {
  const base = crmDashboardBase();
  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim();
  if (!base || !secret) {
    console.warn(
      "[notifyCrmPartnerDokumentUpload] übersprungen — CRM-URL oder Secret fehlt.",
      { typ: input.typ, handwerkerId: input.handwerkerId }
    );
    return {};
  }

  try {
    const res = await fetch(`${base}/api/internal/partner-dokument-upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        typ: input.typ,
        handwerkerId: input.handwerkerId,
        titel: input.titel ?? null,
        auftragId: input.auftragId ?? null,
        dokumentId: input.dokumentId ?? null,
        anfrageId: input.anfrageId ?? null,
        slotId: input.slotId ?? null,
      }),
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      rechnungId?: string | null;
    };
    if (!res.ok) {
      console.warn(
        "[notifyCrmPartnerDokumentUpload] CRM-Fehler:",
        body.error || `HTTP ${res.status}`
      );
      return {};
    }
    return { rechnungId: body.rechnungId ?? null };
  } catch (e) {
    console.warn("[notifyCrmPartnerDokumentUpload]", e);
    return {};
  }
}
