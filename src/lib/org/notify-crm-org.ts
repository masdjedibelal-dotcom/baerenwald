/**
 * Website → CRM: Org-Portal-Benachrichtigungen (interne Meldung, Freigabe-Ergebnis M4).
 */

export type NotifyCrmOrgResult =
  | { ok: true }
  | { ok: false; error: string; skipped?: boolean };

function crmNotifyBaseUrl(): string | null {
  const url = (
    process.env.NEXT_PUBLIC_DASHBOARD_URL?.trim() ||
    process.env.CRM_DASHBOARD_URL?.trim() ||
    process.env.NEXT_PUBLIC_CRM_URL?.trim() ||
    ""
  ).replace(/\/$/, "");
  return url || null;
}

export async function notifyCrmOrgPortal(input: {
  leadId: string;
  typ?: "meldung" | "freigabe_ergebnis" | "angebot_entscheidung";
  aktion?: "freigegeben" | "abgelehnt" | "angenommen";
  notiz?: string | null;
}): Promise<NotifyCrmOrgResult> {
  const leadId = input.leadId.trim();
  if (!leadId) {
    return { ok: false, error: "leadId fehlt", skipped: true };
  }

  const base = crmNotifyBaseUrl();
  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim();
  if (!base || !secret) {
    console.warn(
      "[notifyCrmOrgPortal] übersprungen — NEXT_PUBLIC_DASHBOARD_URL/CRM_DASHBOARD_URL oder PARTNER_INTERNAL_API_SECRET fehlt.",
      { leadId, typ: input.typ, aktion: input.aktion, hasBase: Boolean(base), hasSecret: Boolean(secret) }
    );
    return {
      ok: false,
      error: "CRM-Verbindung nicht konfiguriert",
      skipped: true,
    };
  }

  try {
    const res = await fetch(`${base}/api/internal/org-portal-notify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        leadId,
        typ:
          input.typ === "freigabe_ergebnis"
            ? "freigabe_ergebnis"
            : input.typ === "angebot_entscheidung"
              ? "angebot_entscheidung"
              : input.typ === "meldung"
                ? "meldung"
                : undefined,
        aktion: input.aktion,
        notiz: input.notiz,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      const msg = body.error || `HTTP ${res.status}`;
      console.error("[notifyCrmOrgPortal] CRM antwortete mit Fehler:", msg, {
        leadId,
        typ: input.typ,
        aktion: input.aktion,
        status: res.status,
      });
      return { ok: false, error: msg };
    }

    return { ok: true };
  } catch (e) {
    console.error("[notifyCrmOrgPortal]", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "CRM nicht erreichbar",
    };
  }
}
