/**
 * Portal → CRM: Partner meldet Auftrag erledigt (ohne Abnahme).
 */

const CRM_TIMEOUT_MS = 7000;

function crmDashboardBase(): string | null {
  const raw = (
    process.env.NEXT_PUBLIC_DASHBOARD_URL?.trim() ||
    process.env.CRM_DASHBOARD_URL?.trim() ||
    process.env.NEXT_PUBLIC_CRM_URL?.trim() ||
    ""
  ).replace(/\/$/, "");
  return raw || null;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function notifyCrmPartnerAuftragErledigt(input: {
  auftragId: string;
  handwerkerId: string;
  erledigtAm?: string | null;
}): Promise<void> {
  const base = crmDashboardBase();
  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim();
  if (!base || !secret) {
    console.warn(
      "[notifyCrmPartnerAuftragErledigt] übersprungen — CRM-URL oder Secret fehlt."
    );
    return;
  }

  try {
    const res = await fetchWithTimeout(
      `${base}/api/internal/partner-auftrag-erledigt`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auftragId: input.auftragId,
          handwerkerId: input.handwerkerId,
          erledigtAm: input.erledigtAm ?? null,
        }),
        cache: "no-store",
      },
      CRM_TIMEOUT_MS
    );
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      console.warn(
        "[notifyCrmPartnerAuftragErledigt] CRM-Fehler:",
        body.error || `HTTP ${res.status}`
      );
    }
  } catch (e) {
    console.warn("[notifyCrmPartnerAuftragErledigt]", e);
  }
}
