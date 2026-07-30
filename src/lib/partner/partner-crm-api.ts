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
  meta?: Record<string, unknown> | null;
};

export async function submitCrmAbnahmeNachSignatur(
  auftragId: string,
  payload: CrmAbnahmeNachSignaturPayload
): Promise<
  | { ok: true; pdf_url?: string | null; protokoll_id?: string | null }
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
        body: JSON.stringify({ mode: "nach-signatur", ...payload }),
      }
    );
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      pdf_url?: string | null;
      protokoll_id?: string | null;
    };
    if (!res.ok) {
      return { ok: false, error: body.error || "CRM-Abnahme fehlgeschlagen." };
    }
    return {
      ok: true,
      pdf_url: body.pdf_url ?? null,
      protokoll_id: body.protokoll_id ?? null,
    };
  } catch {
    return { ok: false, error: "CRM nicht erreichbar." };
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
    }
  | { ok: false; error: string }
> {
  const base = dashboardBase();
  const headers = await partnerAuthHeaders();
  if (!base || !headers) {
    return { ok: false, error: "CRM nicht konfiguriert." };
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
      punkte_count: Number(body.punkte_count ?? 0),
      maengel_count: Number(body.maengel_count ?? 0),
      an_kunde_gesendet_at: (body.an_kunde_gesendet_at as string | null) ?? null,
      handwerker_bestaetigt_at:
        (body.handwerker_bestaetigt_at as string | null) ?? null,
      abnahme_ergebnis: (body.abnahme_ergebnis as string | null) ?? null,
    };
  } catch {
    return { ok: false, error: "CRM nicht erreichbar." };
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
    return { ok: false, error: "CRM nicht konfiguriert." };
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
    return { ok: false, error: "CRM nicht erreichbar." };
  }
}
