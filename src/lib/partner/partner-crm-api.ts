import { createClient } from "@/lib/supabase/server";

function dashboardBase(): string | null {
  const base = process.env.NEXT_PUBLIC_DASHBOARD_URL?.replace(/\/$/, "");
  return base || null;
}

async function partnerAuthHeaders(): Promise<HeadersInit | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

export type CrmProjektvertragPreview = {
  auftrag_titel?: string | null;
  gewerk_name?: string | null;
  bauvorhaben?: string | null;
  leistungsumfang?: string | null;
  verguetung_text?: string | null;
  vertrags_nr?: string | null;
  pdf_url?: string | null;
  status?: string | null;
};

export async function fetchCrmProjektvertrag(
  auftragId: string
): Promise<CrmProjektvertragPreview | null> {
  const base = dashboardBase();
  const headers = await partnerAuthHeaders();
  if (!base || !headers) return null;

  try {
    const res = await fetch(`${base}/api/portal/auftraege/${auftragId}/projektvertrag`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as CrmProjektvertragPreview;
  } catch {
    return null;
  }
}

export async function confirmCrmProjektvertrag(
  auftragId: string
): Promise<
  | { ok: true; vertrags_nr?: string; pdf_url?: string }
  | { ok: false; error: string }
> {
  const base = dashboardBase();
  const headers = await partnerAuthHeaders();
  if (!base || !headers) {
    return { ok: false, error: "CRM-Verbindung nicht konfiguriert." };
  }

  try {
    const res = await fetch(`${base}/api/portal/auftraege/${auftragId}/projektvertrag`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      vertrags_nr?: string;
      pdf_url?: string;
    };
    if (!res.ok) {
      return { ok: false, error: body.error || "Vertrag konnte nicht bestätigt werden." };
    }
    return { ok: true, vertrags_nr: body.vertrags_nr, pdf_url: body.pdf_url };
  } catch {
    return { ok: false, error: "CRM nicht erreichbar." };
  }
}
