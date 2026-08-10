/**
 * Website → CRM: Org-Portal-Benachrichtigungen (interne Meldung, Freigabe-Ergebnis M4).
 */

function crmNotifyBaseUrl(): string | null {
  const url = (
    process.env.CRM_DASHBOARD_URL?.trim() ||
    process.env.NEXT_PUBLIC_CRM_URL?.trim() ||
    ''
  ).replace(/\/$/, '')
  return url || null
}

export async function notifyCrmOrgPortal(input: {
  leadId: string
  typ?: 'meldung' | 'freigabe_ergebnis'
  aktion?: 'freigegeben' | 'abgelehnt'
  notiz?: string | null
}): Promise<void> {
  const base = crmNotifyBaseUrl()
  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim()
  if (!base || !secret) return

  try {
    await fetch(`${base}/api/internal/org-portal-notify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        leadId: input.leadId,
        typ: input.typ === 'freigabe_ergebnis' ? 'freigabe_ergebnis' : undefined,
        aktion: input.aktion,
        notiz: input.notiz,
      }),
      cache: 'no-store',
    })
  } catch (e) {
    console.error('[notifyCrmOrgPortal]', e)
  }
}
