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

function internalSecretHeaders(): HeadersInit | null {
  const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim();
  if (!secret) return null;
  return {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
  };
}

/** Registrierung (ohne Login): RV-PDF erzeugen + Annahme speichern. */
export async function acceptCrmRahmenvertragForEmail(
  email: string
): Promise<
  | { ok: true; vertrags_nr?: string; pdf_url?: string | null }
  | { ok: false; error: string }
> {
  const base = dashboardBase();
  const headers = internalSecretHeaders();
  if (!base || !headers) {
    return { ok: false, error: "CRM-Verbindung nicht konfiguriert." };
  }

  try {
    const res = await fetch(`${base}/api/internal/partner-rahmenvertrag-accept`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      vertrags_nr?: string;
      pdf_url?: string | null;
      ok?: boolean;
    };
    if (!res.ok || body.ok === false) {
      return { ok: false, error: body.error || "Rahmenvertrag konnte nicht gespeichert werden." };
    }
    return { ok: true, vertrags_nr: body.vertrags_nr, pdf_url: body.pdf_url ?? null };
  } catch {
    return { ok: false, error: "CRM nicht erreichbar." };
  }
}

/** Eingeloggt: RV-PDF erzeugen + Annahme speichern. */
export async function acceptCrmRahmenvertragLoggedIn(): Promise<
  | { ok: true; vertrags_nr?: string; pdf_url?: string | null }
  | { ok: false; error: string }
> {
  const base = dashboardBase();
  const headers = await partnerAuthHeaders();
  if (!base || !headers) {
    return { ok: false, error: "CRM-Verbindung nicht konfiguriert." };
  }

  try {
    const res = await fetch(`${base}/api/portal/rahmenvertrag/accept`, {
      method: "POST",
      headers,
    });
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      vertrags_nr?: string;
      pdf_url?: string | null;
    };
    if (!res.ok) {
      return { ok: false, error: body.error || "Rahmenvertrag konnte nicht gespeichert werden." };
    }
    return { ok: true, vertrags_nr: body.vertrags_nr, pdf_url: body.pdf_url ?? null };
  } catch {
    return { ok: false, error: "CRM nicht erreichbar." };
  }
}

export type CrmAbnahmeprotokollPayload = {
  protokoll_text: string;
  maengel_text?: string | null;
  ort: string;
  abnahme_datum: string;
  hw_unterschrift_name: string;
  kunde_unterschrift_name: string;
  leistungen: string[];
  pdf_path: string;
  vollstaendig: boolean;
};

/** Abnahmeprotokoll ans CRM (PDF bereits in Storage). */
export async function submitCrmAbnahmeprotokoll(
  auftragId: string,
  payload: CrmAbnahmeprotokollPayload
): Promise<
  | { ok: true; pdf_url?: string | null }
  | { ok: false; error: string }
> {
  const base = dashboardBase();
  const headers = await partnerAuthHeaders();
  if (!base || !headers) {
    return { ok: false, error: "CRM nicht konfiguriert." };
  }

  try {
    const res = await fetch(
      `${base}/api/portal/auftraege/${auftragId}/abnahmeprotokoll`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      }
    );
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      pdf_url?: string | null;
    };
    if (!res.ok) {
      return { ok: false, error: body.error || "CRM-Abnahme fehlgeschlagen." };
    }
    return { ok: true, pdf_url: body.pdf_url ?? null };
  } catch {
    return { ok: false, error: "CRM nicht erreichbar." };
  }
}
