import { resolveCrmBaseUrl } from "@/lib/pdf/render-via-crm";

/**
 * Portal → CRM: Auftrag aus angenommenem Angebot anlegen (Umbau P06).
 * Eine Funktion für beide Wege — das CRM legt Positionen, Partner-Zuweisung,
 * Zahlungsplan, Verträge, Mails und Meilensteine an, genau wie bei Annahme im CRM.
 */
export async function auftragAusAngebotViaCrm(
  angebotId: string
): Promise<{ ok: true; auftragId: string } | { ok: false; error: string }> {
  const base = resolveCrmBaseUrl();
  const secret = process.env.PDF_SERVICE_SECRET?.trim();
  if (!base || !secret) {
    console.error("[auftragAusAngebotViaCrm] CRM_URL oder PDF_SERVICE_SECRET fehlt");
    return { ok: false, error: "Auftrag konnte nicht angelegt werden. Bitte später erneut versuchen." };
  }
  try {
    const res = await fetch(`${base}/api/auftraege/aus-angebot`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ angebotId }),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as
      | { ok: true; auftragId: string }
      | { ok: false; message?: string }
      | null;
    if (json?.ok && json.auftragId) return { ok: true, auftragId: String(json.auftragId) };
    console.error("[auftragAusAngebotViaCrm]", res.status, json);
    return {
      ok: false,
      error:
        (json && !json.ok && json.message) ||
        "Auftrag konnte nicht angelegt werden. Bitte später erneut versuchen.",
    };
  } catch (e) {
    console.error("[auftragAusAngebotViaCrm]", e);
    return { ok: false, error: "Keine Verbindung zum Server. Bitte erneut versuchen." };
  }
}
