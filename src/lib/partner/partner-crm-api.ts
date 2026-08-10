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

export async function confirmCrmProjektvertrag(
  auftragId: string
): Promise<
  | { ok: true; vertrags_nr?: string; pdf_url?: string }
  | { ok: false; error: string }
> {
  const base = dashboardBase();
  const headers = await partnerAuthHeaders();
  if (!base || !headers) {
    return { ok: false, error: crmMissingConfigError(base, headers) };
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
    return { ok: false, error: "Bärenwald nicht erreichbar." };
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

/** Portal → CRM: kanonische HW-Annahme (Q2). */
export async function submitCrmPartnerAnnahme(input: {
  zuweisungId?: string;
  auftragId?: string;
  handwerkerId: string;
  antwort: "akzeptiert" | "abgelehnt";
  notiz?: string | null;
  grund?: string | null;
}): Promise<
  | { ok: true; already?: boolean; skipped?: boolean }
  | { ok: false; error: string }
> {
  const base = dashboardBase();
  const headers = internalSecretHeaders();
  if (!base || !headers) {
    // Shared-DB-Update läuft im Portal weiter — Partner nicht blockieren,
    // wenn CRM-URL / PARTNER_INTERNAL_API_SECRET in der Umgebung fehlt.
    console.warn(
      "[partner-crm] Annahme ohne CRM-Sync (NEXT_PUBLIC_DASHBOARD_URL/CRM_DASHBOARD_URL oder PARTNER_INTERNAL_API_SECRET fehlt)."
    );
    return { ok: true, skipped: true };
  }

  const zuweisungId = input.zuweisungId?.trim() || "";
  const auftragId = input.auftragId?.trim() || "";
  if (!zuweisungId && !auftragId) {
    return { ok: false, error: "zuweisungId oder auftragId fehlt." };
  }

  try {
    const res = await fetch(`${base}/api/internal/partner-annahme`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...(zuweisungId ? { zuweisungId } : {}),
        ...(auftragId ? { auftragId } : {}),
        handwerkerId: input.handwerkerId,
        antwort: input.antwort,
        notiz: input.notiz ?? undefined,
        grund: input.grund ?? undefined,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      already?: boolean;
    };
    if (!res.ok || body.ok === false) {
      const msg = body.error || `HTTP ${res.status}`;
      console.error("[partner-crm] partner-annahme fehlgeschlagen:", msg, {
        zuweisungId: zuweisungId || undefined,
        auftragId: auftragId || undefined,
        antwort: input.antwort,
        status: res.status,
      });
      return { ok: false, error: msg };
    }
    return { ok: true, already: body.already === true };
  } catch (e) {
    console.error("[partner-crm] partner-annahme unreachable:", e);
    return { ok: false, error: "Bärenwald nicht erreichbar." };
  }
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
  /** F2 — Timestamps + optionale Signatur-Data-URLs */
  hw_signiert_am?: string | null;
  kunde_signiert_am?: string | null;
  hw_signatur_png?: string | null;
  kunde_signatur_png?: string | null;
  abschluss_checks?: Record<string, unknown> | null;
};

/** @deprecated Legacy Freitext-Payload — nutze submitCrmAbnahmeNachSignatur. */
export async function submitCrmAbnahmeprotokoll(
  auftragId: string,
  payload: CrmAbnahmeprotokollPayload
): Promise<
  | { ok: true; pdf_url?: string | null; protokoll_id?: string | null }
  | { ok: false; error: string }
> {
  return submitCrmAbnahmeNachSignatur(auftragId, {
    mode: "nach-signatur",
    abnahme_datum: payload.abnahme_datum,
    punkte: (payload.leistungen ?? []).map((name, i) => ({
      id: `legacy_${i}`,
      leistung_name: name,
      beschreibung: payload.protokoll_text,
      status: "ok" as const,
      gewerk: "Ohne Gewerk",
    })),
    maengel: payload.maengel_text?.trim()
      ? [
          {
            punkt_id: "legacy_mangel",
            beschreibung: payload.maengel_text.trim(),
            status: "offen" as const,
            frist: null,
          },
        ]
      : [],
    notizen: null,
    meta: {
      unterschrift_ort_datum_an: `${payload.ort}, ${payload.abnahme_datum}`,
      unterschrift_ort_datum_ag: `${payload.ort}, ${payload.abnahme_datum}`,
      abnahme_ergebnis: payload.maengel_text?.trim()
        ? "mit_vorbehalt"
        : "abgenommen",
      hw_unterschrift_name: payload.hw_unterschrift_name,
      kunde_unterschrift_name: payload.kunde_unterschrift_name,
      signature_hw_url: payload.hw_signatur_png ?? null,
      signature_kunde_url: payload.kunde_signatur_png ?? null,
      uebergabe_ort: payload.ort,
    },
  });
}

export type CrmAbnahmeNachSignaturPayload = {
  mode?: "nach-signatur";
  abnahme_datum: string;
  punkte: Array<Record<string, unknown>>;
  maengel: Array<Record<string, unknown>>;
  notizen?: string | null;
  /** Partner-Teilabnahme — CRM speichert handwerker_id + ebene=handwerker */
  handwerker_id?: string;
  meta?: Record<string, unknown> | null;
};

export async function submitCrmAbnahmeNachSignatur(
  auftragId: string,
  payload: CrmAbnahmeNachSignaturPayload
): Promise<
  | {
      ok: true;
      pdf_url?: string | null;
      protokoll_id?: string | null;
      freigabe_status?: string | null;
    }
  | { ok: false; error: string }
> {
  const base = dashboardBase();
  const headers = await partnerAuthHeaders();
  if (!base || !headers) {
    return { ok: false, error: crmMissingConfigError(base, headers) };
  }

  try {
    const res = await fetch(
      `${base}/api/portal/auftraege/${auftragId}/abnahmeprotokoll`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ mode: "nach-signatur", ...payload }),
      }
    );
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      pdf_url?: string | null;
      protokoll_id?: string | null;
      freigabe_status?: string | null;
    };
    if (!res.ok) {
      return { ok: false, error: body.error || "Bärenwald-Abnahme fehlgeschlagen." };
    }
    return {
      ok: true,
      pdf_url: body.pdf_url ?? null,
      protokoll_id: body.protokoll_id ?? null,
      freigabe_status: body.freigabe_status ?? "zur_freigabe",
    };
  } catch {
    return { ok: false, error: "Bärenwald nicht erreichbar." };
  }
}

export async function fetchCrmAbnahmeStatus(
  auftragId: string,
  protokollId?: string | null
): Promise<
  | {
      ok: true;
      protokoll_id: string | null;
      pdf_url: string | null;
      abnahme_datum: string | null;
      punkte_count: number;
      maengel_count: number;
      an_kunde_gesendet_at: string | null;
      handwerker_bestaetigt_at: string | null;
      abnahme_ergebnis: string | null;
      freigabe_status: string | null;
    }
  | { ok: false; error: string }
> {
  const base = dashboardBase();
  const headers = await partnerAuthHeaders();
  if (!base || !headers) {
    return { ok: false, error: crmMissingConfigError(base, headers) };
  }

  try {
    const q = protokollId?.trim()
      ? `?protokoll=${encodeURIComponent(protokollId.trim())}`
      : "";
    const res = await fetch(
      `${base}/api/portal/auftraege/${auftragId}/abnahmeprotokoll${q}`,
      { headers, cache: "no-store" }
    );
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return {
        ok: false,
        error: String(body.error ?? "Status konnte nicht geladen werden."),
      };
    }
    return {
      ok: true,
      protokoll_id: (body.protokoll_id as string | null) ?? null,
      pdf_url: (body.pdf_url as string | null) ?? null,
      abnahme_datum: (body.abnahme_datum as string | null) ?? null,
      punkte_count: Number(
        body.punkte_count ??
          (Array.isArray(body.punkte) ? body.punkte.length : 0)
      ),
      maengel_count: Number(
        body.maengel_count ??
          (Array.isArray(body.maengel) ? body.maengel.length : 0)
      ),
      an_kunde_gesendet_at: (body.an_kunde_gesendet_at as string | null) ?? null,
      handwerker_bestaetigt_at:
        (body.handwerker_bestaetigt_at as string | null) ?? null,
      abnahme_ergebnis: (body.abnahme_ergebnis as string | null) ?? null,
      freigabe_status: (body.freigabe_status as string | null) ?? null,
    };
  } catch {
    return { ok: false, error: "Bärenwald nicht erreichbar." };
  }
}

export async function postCrmAbnahmeAction(
  auftragId: string,
  mode: "bestaetigen" | "versenden",
  protokollId?: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const base = dashboardBase();
  const headers = await partnerAuthHeaders();
  if (!base || !headers) {
    return { ok: false, error: crmMissingConfigError(base, headers) };
  }

  try {
    const res = await fetch(
      `${base}/api/portal/auftraege/${auftragId}/abnahmeprotokoll`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          mode,
          protokoll_id: protokollId ?? undefined,
        }),
      }
    );
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      return { ok: false, error: body.error || "Aktion fehlgeschlagen." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Bärenwald nicht erreichbar." };
  }
}
