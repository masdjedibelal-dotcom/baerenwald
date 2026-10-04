import { createClient } from "@/lib/supabase/server";

function dashboardBase(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_DASHBOARD_URL?.trim() ||
    process.env.CRM_DASHBOARD_URL?.trim() ||
    "";
  const base = raw.replace(/\/$/, "");
  return base || null;
}

async function partnerAuthHeaders(): Promise<HeadersInit | null> {
  const supabase = await createClient();
  // getUser() lädt/validiert die Cookie-Session; getSession() allein kann in
  // Server Actions leer sein → fälschlich „Bärenwald nicht konfiguriert“.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token?.trim();
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function crmMissingConfigError(base: string | null, headers: HeadersInit | null): string {
  if (!base) {
    return "Bärenwald-Verbindung fehlt (NEXT_PUBLIC_DASHBOARD_URL).";
  }
  if (!headers) {
    return "Sitzung abgelaufen — bitte neu anmelden und erneut abschließen.";
  }
  return "Bärenwald nicht konfiguriert.";
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
    return { ok: false, error: "Bärenwald-Verbindung nicht konfiguriert." };
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
    return { ok: false, error: "Bärenwald nicht erreichbar." };
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
    return { ok: false, error: crmMissingConfigError(base, headers) };
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
    return { ok: false, error: "Bärenwald nicht erreichbar." };
  }
}
