/**
 * Portal → CRM: Push + Audit für Leistungs-Update (nicht Angebot).
 */
export async function notifyCrmLeistungUpdate(input: {
  auftragId: string;
  positionId?: string | null;
  handwerkerId: string;
  leistungName?: string | null;
  beschreibung?: string | null;
}): Promise<void> {
  const base = (
    process.env.CRM_DASHBOARD_URL?.trim() ||
    process.env.NEXT_PUBLIC_CRM_URL?.trim() ||
    ""
  ).replace(/\/$/, "");
  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim();
  if (!base || !secret) return;

  const auftragId = input.auftragId.trim();
  if (!auftragId) return;

  try {
    await fetch(`${base}/api/internal/partner-positions-meldung`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        typ: "leistung_update",
        auftragId,
        positionId: input.positionId?.trim() || null,
        handwerkerId: input.handwerkerId,
        leistungName: input.leistungName?.trim() || null,
        beschreibung: input.beschreibung?.trim() || null,
      }),
      cache: "no-store",
    });
  } catch {
    /* non-blocking */
  }
}
