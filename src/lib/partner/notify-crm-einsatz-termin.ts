/**
 * Portal → CRM: Handwerker hat den Ausführungstermin eingetragen.
 * Das CRM schickt die Bestätigung an den Kunden (gleiche Mail wie aus dem CRM) und vermerkt es im Verlauf.
 */
function crmBase(): string | null {
  const url = (
    process.env.NEXT_PUBLIC_DASHBOARD_URL?.trim() ||
    process.env.CRM_DASHBOARD_URL?.trim() ||
    process.env.NEXT_PUBLIC_CRM_URL?.trim() ||
    ""
  ).replace(/\/$/, "");
  return url || null;
}

export async function notifyCrmEinsatzTermin(input: { einsatzId: string; geaendert: boolean }): Promise<{ mailGesendet: boolean }> {
  const base = crmBase();
  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim();
  if (!base || !secret) {
    console.warn("[notifyCrmEinsatzTermin] übersprungen — CRM-URL oder Secret fehlt.", { einsatzId: input.einsatzId });
    return { mailGesendet: false };
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`${base}/api/internal/partner-einsatz-termin`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
      signal: ctrl.signal,
    });
    const j = (await res.json().catch(() => ({}))) as { mailGesendet?: boolean };
    return { mailGesendet: Boolean(res.ok && j.mailGesendet) };
  } catch (e) {
    console.error("[notifyCrmEinsatzTermin] Fehler:", e);
    return { mailGesendet: false };
  } finally {
    clearTimeout(t);
  }
}
