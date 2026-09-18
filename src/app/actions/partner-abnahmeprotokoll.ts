"use server";

import { revalidatePath } from "next/cache";

import {
  mapMangelToCrm,
  mapPunktToCrm,
  type PortalAbnahmeErgebnis,
  type PortalAbnahmeMangel,
  type PortalAbnahmePunkt,
} from "@/lib/partner/abnahme-types";
import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import { partnerAbnahmeZielPositionen } from "@/lib/partner/partner-position-erledigt";
import {
  fetchCrmAbnahmeStatus,
  postCrmAbnahmeAction,
  submitCrmAbnahmeNachSignatur,
} from "@/lib/partner/partner-crm-api";
import { sendPartnerInternalErledigtMail } from "@/lib/partner/partner-mail";
import { allePositionenPortalErledigt } from "@/lib/portal/vorgang-erledigt";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import { assertPartnerAktiveZuweisung } from "@/lib/partner/partner-zuweisung-access";

export type PartnerAbnahmeNachSignaturInput = {
  auftragId: string;
  abnahmeDatum: string;
  ort: string;
  /** CRM meta.projektbezeichnung — Pflicht */
  projektbezeichnung: string;
  /** CRM meta.vertreter_an — Pflicht (Vertreter Auftragnehmer) */
  vertreter: string;
  /** CRM meta.abnahme_ergebnis; verweigert erlaubt wenn gewählt */
  abnahmeErgebnis?: PortalAbnahmeErgebnis | null;
  notizen?: string | null;
  punkte: PortalAbnahmePunkt[];
  maengel: PortalAbnahmeMangel[];
  hwUnterschriftName: string;
  kundeUnterschriftName: string;
  hwSignaturPng?: string | null;
  kundeSignaturPng?: string | null;
};

export type PartnerAbnahmeNachSignaturResult =
  | {
      ok: true;
      vollstaendig: boolean;
      pdf_url: string | null;
      protokoll_id: string | null;
      freigabe_status: "zur_freigabe";
      punkte_count: number;
      maengel_count: number;
    }
  | { ok: false; error: string };

async function assertPartnerAuftrag(handwerkerId: string, auftragId: string) {
  return assertPartnerAktiveZuweisung(handwerkerId, auftragId);
}

async function partnerAuth() {
  if (!isSupabaseConfigured()) {
    return { ok: false as const, error: "Datenbank nicht konfiguriert." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false as const, error: "Nicht angemeldet." };
  }

  const link = await linkPortalHandwerkerToAuthUser({
    userId: user.id,
    email: user.email,
  });

  if (!link.ok) {
    return { ok: false as const, error: link.error };
  }

  return { ok: true as const, handwerkerId: link.handwerkerId };
}

function resolveAbnahmeErgebnis(
  input: PartnerAbnahmeNachSignaturInput
): PortalAbnahmeErgebnis {
  const raw = String(input.abnahmeErgebnis ?? "").trim();
  if (raw === "verweigert" || raw === "mit_vorbehalt" || raw === "abgenommen") {
    return raw;
  }
  return input.maengel.length > 0 ? "mit_vorbehalt" : "abgenommen";
}

function validateNachSignatur(
  input: PartnerAbnahmeNachSignaturInput
): string | null {
  if (!input.punkte.length) {
    return "Mindestens eine abgeschlossene Leistung erforderlich.";
  }
  if (input.punkte.some((p) => !p.leistung_name.trim())) {
    return "Jede Leistung braucht einen Titel.";
  }
  if (!input.projektbezeichnung?.trim()) {
    return "Projektbezeichnung fehlt.";
  }
  if (!input.abnahmeDatum.trim()) return "Abnahmedatum fehlt.";
  if (!input.ort.trim()) return "Ort fehlt.";
  if (!input.vertreter?.trim() || input.vertreter.trim().length < 2) {
    return "Vertreter (Auftragnehmer) fehlt.";
  }
  if (!input.kundeUnterschriftName.trim() || input.kundeUnterschriftName.trim().length < 3) {
    return "Bitte den vollen Namen des Kunden ausschreiben.";
  }
  if (!input.kundeSignaturPng?.trim()) {
    return "Bitte die Kunden-Signatur erfassen.";
  }
  if (!input.hwUnterschriftName.trim() || input.hwUnterschriftName.trim().length < 3) {
    return "Bitte den vollen Namen des Handwerkers ausschreiben.";
  }
  if (!input.hwSignaturPng?.trim()) {
    return "Bitte die Handwerker-Signatur zeichnen.";
  }
  for (const m of input.maengel) {
    if (!m.titel.trim()) return "Jeder Mangel braucht einen Titel.";
  }
  return null;
}

async function loadOwnAbnahmeLink(auftragId: string, handwerkerId: string) {
  const { data } = await supabaseAdmin
    .from("auftrag_handwerker")
    .select("abnahme_signiert_am, abnahme_protokoll_id")
    .eq("auftrag_id", auftragId)
    .eq("handwerker_id", handwerkerId)
    .maybeSingle();

  const signiertAm =
    (data as { abnahme_signiert_am?: string | null } | null)?.abnahme_signiert_am ??
    null;
  const protokollId =
    (data as { abnahme_protokoll_id?: string | null } | null)?.abnahme_protokoll_id ??
    null;

  let freigabeStatus: string | null = null;
  if (protokollId) {
    const { data: proto } = await supabaseAdmin
      .from("auftrag_abnahmeprotokolle")
      .select("freigabe_status")
      .eq("id", protokollId)
      .maybeSingle();
    freigabeStatus =
      (proto as { freigabe_status?: string | null } | null)?.freigabe_status ?? null;
  }

  return { signiertAm, protokollId, freigabeStatus };
}

/** Lokale Teilabnahme in Shared-DB, wenn CRM-HTTP nicht greifbar ist. */
async function persistLocalTeilabnahme(opts: {
  auftragId: string;
  handwerkerId: string;
  abnahmeDatum: string;
  notizen: string | null;
  punkte: Array<Record<string, unknown>>;
  maengel: Array<Record<string, unknown>>;
  meta: Record<string, unknown>;
}): Promise<{ ok: true; protokollId: string } | { ok: false; error: string }> {
  const row = {
    auftrag_id: opts.auftragId,
    handwerker_id: opts.handwerkerId,
    ebene: "handwerker",
    freigabe_status: "zur_freigabe",
    abnahme_datum: opts.abnahmeDatum,
    notizen: opts.notizen,
    punkte: opts.punkte,
    maengel: opts.maengel,
    meta: opts.meta,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from("auftrag_abnahmeprotokolle")
    .insert(row)
    .select("id")
    .maybeSingle();

  if (!error && data?.id) {
    return { ok: true, protokollId: String(data.id) };
  }

  // meta-Spalte fehlt in älteren Schemas → ohne meta erneut versuchen
  if (error && /meta|column/i.test(error.message)) {
    const { meta: _meta, ...withoutMeta } = row;
    void _meta;
    const retry = await supabaseAdmin
      .from("auftrag_abnahmeprotokolle")
      .insert(withoutMeta)
      .select("id")
      .maybeSingle();
    if (!retry.error && retry.data?.id) {
      return { ok: true, protokollId: String(retry.data.id) };
    }
    console.error("[persistLocalTeilabnahme]", retry.error?.message ?? error.message);
    return {
      ok: false,
      error: retry.error?.message || "Abnahme konnte lokal nicht gespeichert werden.",
    };
  }

  console.error("[persistLocalTeilabnahme]", error?.message);
  return {
    ok: false,
    error: error?.message || "Abnahme konnte lokal nicht gespeichert werden.",
  };
}

/** Nach Kunden-Signatur: CRM erstellt Teilabnahme → zur_freigabe (kein Auto-Versand). */
export async function submitPartnerAbnahmeNachSignatur(
  input: PartnerAbnahmeNachSignaturInput
): Promise<PartnerAbnahmeNachSignaturResult> {
  const id = input.auftragId.trim();
  if (!id) return { ok: false, error: "Auftrag fehlt." };

  const validationErr = validateNachSignatur(input);
  if (validationErr) return { ok: false, error: validationErr };

  const auth = await partnerAuth();
  if (!auth.ok) return auth;

  const allowed = await assertPartnerAuftrag(auth.handwerkerId, id);
  if (!allowed) return { ok: false, error: "Kein Zugriff auf diesen Auftrag." };

  const { data: auftrag } = await supabaseAdmin
    .from("auftraege")
    .select("id, titel, status, lead_id")
    .eq("id", id)
    .maybeSingle();

  if (!auftrag) return { ok: false, error: "Auftrag nicht gefunden." };

  const own = await loadOwnAbnahmeLink(id, auth.handwerkerId);
  const freigabe = String(own.freigabeStatus ?? "").toLowerCase();
  if (own.signiertAm && freigabe !== "abgelehnt" && freigabe !== "entwurf") {
    return {
      ok: false,
      error:
        freigabe === "zur_freigabe"
          ? "Ihr Abschluss wartet bereits auf Freigabe durch Bärenwald."
          : "Ihr Abschluss wurde bereits signiert.",
    };
  }

  const ortDatum = `${input.ort.trim()}, ${input.abnahmeDatum.slice(0, 10)}`;
  const abnahmeErgebnis = resolveAbnahmeErgebnis(input);
  const crmPayload = {
    abnahme_datum: input.abnahmeDatum.slice(0, 10),
    punkte: input.punkte.map(mapPunktToCrm),
    maengel: input.maengel.map(mapMangelToCrm),
    notizen: input.notizen?.trim() || null,
    handwerker_id: auth.handwerkerId,
    meta: {
      uebergabe_ort: input.ort.trim(),
      unterschrift_ort_datum_an: ortDatum,
      unterschrift_ort_datum_ag: ortDatum,
      projektbezeichnung: input.projektbezeichnung.trim(),
      abnahme_ergebnis: abnahmeErgebnis,
      hw_unterschrift_name: input.hwUnterschriftName.trim(),
      kunde_unterschrift_name: input.kundeUnterschriftName.trim(),
      signature_hw_url: input.hwSignaturPng ?? null,
      signature_kunde_url: input.kundeSignaturPng ?? null,
      vertreter_an: input.vertreter.trim(),
      ansprechpartner_kunde: input.kundeUnterschriftName.trim(),
    },
  };
  let crm = await submitCrmAbnahmeNachSignatur(id, crmPayload);

  // Shared-DB-Fallback: Abschluss nicht blockieren, wenn CRM-URL/Session fehlt.
  if (!crm.ok && /nicht konfiguriert|Verbindung fehlt|Sitzung abgelaufen|nicht erreichbar/i.test(crm.error)) {
    console.warn(
      "[partner-abnahme] CRM-Sync übersprungen, lokale Teilabnahme:",
      crm.error
    );
    const local = await persistLocalTeilabnahme({
      auftragId: id,
      handwerkerId: auth.handwerkerId,
      abnahmeDatum: crmPayload.abnahme_datum,
      notizen: crmPayload.notizen,
      punkte: crmPayload.punkte,
      maengel: crmPayload.maengel,
      meta: crmPayload.meta,
    });
    if (!local.ok) return { ok: false, error: local.error };
    crm = {
      ok: true,
      pdf_url: null,
      protokoll_id: local.protokollId,
      freigabe_status: "zur_freigabe",
    };
  }

  if (!crm.ok) return { ok: false, error: crm.error };

  // Shared-DB Spiegel für Portal-Status (Leistungen-/Mängel-Anzahl), auch wenn CRM ok war.
  if (crm.protokoll_id) {
    const { data: existingProto } = await supabaseAdmin
      .from("auftrag_abnahmeprotokolle")
      .select("id")
      .eq("id", crm.protokoll_id)
      .maybeSingle();
    if (existingProto?.id) {
      await supabaseAdmin
        .from("auftrag_abnahmeprotokolle")
        .update({
          punkte: crmPayload.punkte,
          maengel: crmPayload.maengel,
          abnahme_datum: crmPayload.abnahme_datum,
          notizen: crmPayload.notizen,
          freigabe_status: "zur_freigabe",
          updated_at: new Date().toISOString(),
        })
        .eq("id", crm.protokoll_id);
    } else {
      await persistLocalTeilabnahme({
        auftragId: id,
        handwerkerId: auth.handwerkerId,
        abnahmeDatum: crmPayload.abnahme_datum,
        notizen: crmPayload.notizen,
        punkte: crmPayload.punkte,
        maengel: crmPayload.maengel,
        meta: crmPayload.meta,
      });
    }
  } else {
    const local = await persistLocalTeilabnahme({
      auftragId: id,
      handwerkerId: auth.handwerkerId,
      abnahmeDatum: crmPayload.abnahme_datum,
      notizen: crmPayload.notizen,
      punkte: crmPayload.punkte,
      maengel: crmPayload.maengel,
      meta: crmPayload.meta,
    });
    if (local.ok) {
      crm = { ...crm, protokoll_id: local.protokollId };
    }
  }

  const { data: ownPos } = await supabaseAdmin
    .from("auftrag_positionen")
    .select(
      "id, leistung_name, handwerker_status, leistung_status, aenderung_typ, handwerker_id"
    )
    .eq("auftrag_id", id)
    .eq("handwerker_id", auth.handwerkerId);

  const ziel = partnerAbnahmeZielPositionen(
    (ownPos ?? []).map((p) => ({
      id: String(p.id),
      leistung_name: String(p.leistung_name ?? "Leistung"),
      handwerker_status: (p.handwerker_status as string | null) ?? null,
      leistung_status: (p.leistung_status as string | null) ?? null,
      aenderung_typ: (["neu", "geaendert", "entfernt"].includes(
        String(p.aenderung_typ ?? "")
      )
        ? (p.aenderung_typ as "neu" | "geaendert" | "entfernt")
        : null),
      handwerker_id: (p.handwerker_id as string | null) ?? null,
    }))
  );
  if (ziel.length) {
    await supabaseAdmin
      .from("auftrag_positionen")
      .update({
        handwerker_status: "erledigt",
        leistung_status: "erledigt",
        updated_at: new Date().toISOString(),
      })
      .in(
        "id",
        ziel.map((p) => p.id)
      );
  }

  const now = new Date().toISOString();
  const protokollId = crm.protokoll_id ?? own.protokollId ?? null;

  // Signatur nur pro Handwerker — kein globales auftraege.hw_abschluss_signiert_am,
  // kein vorzeitiges status=abgeschlossen (CRM Freigabe-Kette).
  const { data: existingLink } = await supabaseAdmin
    .from("auftrag_handwerker")
    .select("auftrag_id")
    .eq("auftrag_id", id)
    .eq("handwerker_id", auth.handwerkerId)
    .maybeSingle();

  if (existingLink) {
    await supabaseAdmin
      .from("auftrag_handwerker")
      .update({
        abnahme_signiert_am: now,
        ...(protokollId ? { abnahme_protokoll_id: protokollId } : {}),
      })
      .eq("auftrag_id", id)
      .eq("handwerker_id", auth.handwerkerId);
  } else {
    await supabaseAdmin.from("auftrag_handwerker").insert({
      auftrag_id: id,
      handwerker_id: auth.handwerkerId,
      status: "uebernommen",
      abnahme_signiert_am: now,
      ...(protokollId ? { abnahme_protokoll_id: protokollId } : {}),
    });
  }

  const { data: allPos } = await supabaseAdmin
    .from("auftrag_positionen")
    .select("id, handwerker_status, leistung_status, handwerker_id")
    .eq("auftrag_id", id);

  const vollstaendig = allePositionenPortalErledigt(
    (allPos ?? []) as Array<{
      handwerker_status?: string | null;
      leistung_status?: string | null;
      handwerker_id?: string | null;
    }>
  );

  const [{ data: hw }, { data: auf }] = await Promise.all([
    supabaseAdmin
      .from("handwerker")
      .select("name, firma")
      .eq("id", auth.handwerkerId)
      .maybeSingle(),
    supabaseAdmin.from("auftraege").select("titel").eq("id", id).maybeSingle(),
  ]);

  const handwerkerName = String(hw?.name ?? "Partner");
  const auftragTitel = String(auf?.titel ?? "Auftrag").trim() || "Auftrag";

  void sendPartnerInternalErledigtMail({
    handwerkerName,
    firma: (hw?.firma as string | null) ?? null,
    auftragTitel,
    auftragId: id,
    leistungen: input.punkte.map((p) => p.leistung_name),
  });

  // HV-Notify erst nach CRM-Freigabe des Abnahmeprotokolls (Shared-DB).

  revalidatePath("/partner");
  return {
    ok: true,
    vollstaendig,
    pdf_url: crm.pdf_url ?? null,
    protokoll_id: protokollId,
    freigabe_status: "zur_freigabe",
    punkte_count: input.punkte.length,
    maengel_count: input.maengel.length,
  };
}

function countJsonArray(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

async function loadLocalAbnahmeStatus(
  auftragId: string,
  handwerkerId: string,
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
  async function fetchRow(byId: string | null) {
    if (byId) {
      return supabaseAdmin
        .from("auftrag_abnahmeprotokolle")
        .select(
          "id, pdf_url, abnahme_datum, punkte, maengel, an_kunde_gesendet_at, handwerker_bestaetigt_at, freigabe_status, meta"
        )
        .eq("id", byId)
        .maybeSingle();
    }
    return supabaseAdmin
      .from("auftrag_abnahmeprotokolle")
      .select(
        "id, pdf_url, abnahme_datum, punkte, maengel, an_kunde_gesendet_at, handwerker_bestaetigt_at, freigabe_status, meta"
      )
      .eq("auftrag_id", auftragId)
      .eq("handwerker_id", handwerkerId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
  }

  let { data, error } = await fetchRow(protokollId?.trim() || null);
  if ((!data || error) && protokollId?.trim()) {
    ({ data, error } = await fetchRow(null));
  }
  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data) {
    return { ok: false, error: "Kein Abschlussprotokoll gefunden." };
  }

  const row = data as {
    id: string;
    pdf_url?: string | null;
    abnahme_datum?: string | null;
    punkte?: unknown;
    maengel?: unknown;
    an_kunde_gesendet_at?: string | null;
    handwerker_bestaetigt_at?: string | null;
    freigabe_status?: string | null;
    meta?: Record<string, unknown> | null;
  };
  const meta = row.meta && typeof row.meta === "object" ? row.meta : {};

  return {
    ok: true,
    protokoll_id: String(row.id),
    pdf_url: row.pdf_url ?? null,
    abnahme_datum: row.abnahme_datum ?? null,
    punkte_count: countJsonArray(row.punkte),
    maengel_count: countJsonArray(row.maengel),
    an_kunde_gesendet_at: row.an_kunde_gesendet_at ?? null,
    handwerker_bestaetigt_at: row.handwerker_bestaetigt_at ?? null,
    abnahme_ergebnis:
      typeof meta.abnahme_ergebnis === "string" ? meta.abnahme_ergebnis : null,
    freigabe_status: row.freigabe_status ?? null,
  };
}

export async function getPartnerAbnahmeStatus(
  auftragId: string,
  protokollId?: string | null
) {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;
  const id = auftragId.trim();
  if (!id) return { ok: false as const, error: "Auftrag fehlt." };
  const allowed = await assertPartnerAuftrag(auth.handwerkerId, id);
  if (!allowed) return { ok: false as const, error: "Kein Zugriff." };

  const crm = await fetchCrmAbnahmeStatus(id, protokollId);
  if (crm.ok && (crm.punkte_count > 0 || crm.maengel_count > 0 || crm.protokoll_id)) {
    // CRM ohne Counts: lokal nachladen und mergen
    if (crm.punkte_count === 0 && crm.maengel_count === 0) {
      const local = await loadLocalAbnahmeStatus(id, auth.handwerkerId, crm.protokoll_id ?? protokollId);
      if (local.ok && (local.punkte_count > 0 || local.maengel_count > 0)) {
        return {
          ...crm,
          punkte_count: local.punkte_count,
          maengel_count: local.maengel_count,
          abnahme_datum: crm.abnahme_datum ?? local.abnahme_datum,
        };
      }
    }
    return crm;
  }

  return loadLocalAbnahmeStatus(id, auth.handwerkerId, protokollId);
}

export async function bestaetigePartnerAbnahme(
  auftragId: string,
  protokollId?: string | null
) {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;
  const id = auftragId.trim();
  if (!id) return { ok: false as const, error: "Auftrag fehlt." };
  const allowed = await assertPartnerAuftrag(auth.handwerkerId, id);
  if (!allowed) return { ok: false as const, error: "Kein Zugriff." };
  const r = await postCrmAbnahmeAction(id, "bestaetigen", protokollId);
  if (r.ok) revalidatePath("/partner");
  return r;
}

/**
 * Kundenversand nur nach Freigabe durch Bärenwald (CRM lehnt sonst ab).
 * Partner-UI zeigt keinen Versand-CTA vor Freigabe.
 */
export async function versendePartnerAbnahme(
  auftragId: string,
  protokollId?: string | null
) {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;
  const id = auftragId.trim();
  if (!id) return { ok: false as const, error: "Auftrag fehlt." };
  const allowed = await assertPartnerAuftrag(auth.handwerkerId, id);
  if (!allowed) return { ok: false as const, error: "Kein Zugriff." };
  const r = await postCrmAbnahmeAction(id, "versenden", protokollId);
  if (r.ok) revalidatePath("/partner");
  return r;
}

/** @deprecated — alte Checklisten-Action; nutze submitPartnerAbnahmeNachSignatur */
export async function submitPartnerAbnahmeprotokoll(
  _input?: unknown
): Promise<PartnerAbnahmeNachSignaturResult> {
  void _input;
  return {
    ok: false,
    error: "Veralteter Abschluss-Flow. Bitte Seite neu laden.",
  };
}
