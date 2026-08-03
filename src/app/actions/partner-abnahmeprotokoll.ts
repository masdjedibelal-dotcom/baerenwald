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
import { notifyHvPartnerErledigt } from "@/lib/org/notify-hv-partner-erledigt";
import { sendPartnerInternalErledigtMail } from "@/lib/partner/partner-mail";
import { allePositionenPortalErledigt } from "@/lib/portal/vorgang-erledigt";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

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
    }
  | { ok: false; error: string };

async function assertPartnerAuftrag(handwerkerId: string, auftragId: string) {
  const { data: hw } = await supabaseAdmin
    .from("auftrag_handwerker")
    .select("auftrag_id")
    .eq("auftrag_id", auftragId)
    .eq("handwerker_id", handwerkerId)
    .limit(1);

  if (hw?.length) return true;

  const { data: pos } = await supabaseAdmin
    .from("auftrag_positionen")
    .select("auftrag_id")
    .eq("auftrag_id", auftragId)
    .eq("handwerker_id", handwerkerId)
    .limit(1);

  return Boolean(pos?.length);
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
          ? "Ihre Teilabnahme wartet bereits auf CRM-Freigabe."
          : "Ihre Teilabnahme wurde bereits signiert.",
    };
  }

  const ortDatum = `${input.ort.trim()}, ${input.abnahmeDatum.slice(0, 10)}`;
  const abnahmeErgebnis = resolveAbnahmeErgebnis(input);
  const crm = await submitCrmAbnahmeNachSignatur(id, {
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
  });

  if (!crm.ok) return { ok: false, error: crm.error };

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

  void notifyHvPartnerErledigt({
    auftragId: id,
    leadId: String((auftrag as { lead_id?: string | null }).lead_id ?? ""),
    handwerkerName,
    leistungen: input.punkte.map((p) => p.leistung_name),
    vollstaendig,
  });

  revalidatePath("/partner");
  return {
    ok: true,
    vollstaendig,
    pdf_url: crm.pdf_url ?? null,
    protokoll_id: protokollId,
    freigabe_status: "zur_freigabe",
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
  return fetchCrmAbnahmeStatus(id, protokollId);
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
 * Kundenversand nur nach CRM-Freigabe (CRM lehnt sonst ab).
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
