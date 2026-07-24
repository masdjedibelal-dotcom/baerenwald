"use server";

import { revalidatePath } from "next/cache";

import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import {
  zeitMinutenFromStdMin,
  type EintragTyp,
} from "@/lib/partner/position-lebenszyklus";
import { uploadPartnerEintragFoto } from "@/lib/partner/partner-storage";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type PartnerPositionEintragResult =
  | { ok: true; eintragId: string; positionId: string }
  | { ok: false; error: string; status?: number };

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
  if (!link.ok) return { ok: false as const, error: link.error };
  return { ok: true as const, handwerkerId: link.handwerkerId };
}

async function loadOwnPosition(handwerkerId: string, positionId: string) {
  const { data, error } = await supabaseAdmin
    .from("auftrag_positionen")
    .select(
      "id, auftrag_id, handwerker_id, leistung_status, leistung_name, verguetung, typ, anerkennung_status, gestartet_am, erledigt_am"
    )
    .eq("id", positionId)
    .maybeSingle();

  if (error) {
    // Spalten ggf. noch nicht migriert
    if (/verguetung|typ|gestartet_am|anerkennung/i.test(error.message)) {
      const { data: fallback } = await supabaseAdmin
        .from("auftrag_positionen")
        .select("id, auftrag_id, handwerker_id, leistung_status, leistung_name")
        .eq("id", positionId)
        .maybeSingle();
      if (!fallback || String(fallback.handwerker_id) !== handwerkerId) {
        return null;
      }
      return {
        ...fallback,
        verguetung: "festpreis" as string | null,
        typ: "lv" as string | null,
        anerkennung_status: "nicht_noetig" as string | null,
        gestartet_am: null as string | null,
        erledigt_am: null as string | null,
      };
    }
    return null;
  }
  if (!data || String(data.handwerker_id) !== handwerkerId) return null;
  return data;
}

async function assertAuftragNochOffen(auftragId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("auftraege")
    .select("status")
    .eq("id", auftragId)
    .maybeSingle();
  const st = String(data?.status ?? "").toLowerCase();
  return !["abgeschlossen", "storniert", "abgebrochen"].includes(st);
}

async function insertEintrag(opts: {
  positionId: string;
  typ: EintragTyp;
  beschreibung: string | null;
  zeitMinuten: number | null;
  handwerkerId: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data, error } = await supabaseAdmin
    .from("position_eintraege")
    .insert({
      position_id: opts.positionId,
      typ: opts.typ,
      beschreibung: opts.beschreibung,
      zeit_minuten: opts.zeitMinuten,
      erfasst_von: "partner_app",
      erfasser_akteur: opts.handwerkerId,
      ereignis_zeit: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    return {
      ok: false,
      error:
        /relation .* does not exist|position_eintraege/i.test(error.message)
          ? "Migration position_eintraege fehlt noch — bitte DB aktualisieren."
          : error.message,
    };
  }
  return { ok: true, id: String(data.id) };
}

async function attachFoto(opts: {
  eintragId: string;
  handwerkerId: string;
  auftragId: string;
  positionId: string;
  file: File;
  captureAt: string | null;
  nachgereicht: boolean;
  nachreichGrund: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const up = await uploadPartnerEintragFoto({
    handwerkerId: opts.handwerkerId,
    auftragId: opts.auftragId,
    positionId: opts.positionId,
    file: opts.file,
  });
  if (!up.ok) return up;

  const { error } = await supabaseAdmin.from("eintrag_fotos").insert({
    eintrag_id: opts.eintragId,
    storage_path: up.path,
    exif_aufnahme: opts.captureAt,
    server_eingang: new Date().toISOString(),
    aufnahmeart: opts.nachgereicht ? "nachgereicht" : "direkt",
    nachreich_grund: opts.nachgereicht ? opts.nachreichGrund : null,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

function parseFotoFromForm(formData: FormData): {
  file: File | null;
  captureAt: string | null;
  nachgereicht: boolean;
  nachreichGrund: string | null;
} {
  const file = formData.get("foto");
  const photo =
    file instanceof File && file.size > 0 ? file : null;
  const captureAt = String(formData.get("captureAt") ?? "").trim() || null;
  const nachgereicht = String(formData.get("nachgereicht") ?? "") === "1";
  const nachreichGrund =
    String(formData.get("nachreichGrund") ?? "").trim() || null;
  return { file: photo, captureAt, nachgereicht, nachreichGrund };
}

/** OFFEN → Start mit Ankunftsfoto (Pflicht). */
export async function startPartnerPosition(
  formData: FormData
): Promise<PartnerPositionEintragResult> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;

  const positionId = String(formData.get("positionId") ?? "").trim();
  const beschreibung = String(formData.get("beschreibung") ?? "").trim() || null;
  if (!positionId) return { ok: false, error: "Position fehlt." };

  const pos = await loadOwnPosition(auth.handwerkerId, positionId);
  if (!pos) return { ok: false, error: "Position nicht gefunden.", status: 404 };

  if (!(await assertAuftragNochOffen(String(pos.auftrag_id)))) {
    return { ok: false, error: "Auftrag ist abgeschlossen (read-only)." };
  }

  const status = String(pos.leistung_status ?? "offen");
  if (status !== "offen" && status !== "in_arbeit") {
    return { ok: false, error: "Position ist bereits erledigt." };
  }
  if (status === "in_arbeit" || pos.gestartet_am) {
    return { ok: false, error: "Position wurde bereits gestartet." };
  }

  const foto = parseFotoFromForm(formData);
  if (!foto.file) {
    return { ok: false, error: "Ankunftsfoto ist Pflicht (Kamera)." };
  }
  if (foto.nachgereicht && !foto.nachreichGrund) {
    return { ok: false, error: "Bitte Grund für nachgereichtes Foto angeben." };
  }

  const eintrag = await insertEintrag({
    positionId,
    typ: "start",
    beschreibung,
    zeitMinuten: null,
    handwerkerId: auth.handwerkerId,
  });
  if (!eintrag.ok) return eintrag;

  const attached = await attachFoto({
    eintragId: eintrag.id,
    handwerkerId: auth.handwerkerId,
    auftragId: String(pos.auftrag_id),
    positionId,
    file: foto.file,
    captureAt: foto.captureAt,
    nachgereicht: foto.nachgereicht,
    nachreichGrund: foto.nachreichGrund,
  });
  if (!attached.ok) return attached;

  const now = new Date().toISOString();
  await supabaseAdmin
    .from("auftrag_positionen")
    .update({
      leistung_status: "in_arbeit",
      gestartet_am: now,
      handwerker_status: "bestaetigt",
    })
    .eq("id", positionId);

  await writeAuditEvent({
    entityType: "auftrag",
    entityId: String(pos.auftrag_id),
    aktion: "position_gestartet",
    actorRolle: "partner",
    payload: { position_id: positionId, eintrag_id: eintrag.id },
  });

  revalidatePath("/partner");
  return { ok: true, eintragId: eintrag.id, positionId };
}

/** IN_ARBEIT → Fortschritt (Foto Pflicht). */
export async function addPartnerPositionFortschritt(
  formData: FormData
): Promise<PartnerPositionEintragResult> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;

  const positionId = String(formData.get("positionId") ?? "").trim();
  const beschreibung = String(formData.get("beschreibung") ?? "").trim() || null;
  const std = Number(formData.get("zeitStd") ?? 0);
  const min = Number(formData.get("zeitMin") ?? 0);
  if (!positionId) return { ok: false, error: "Position fehlt." };

  const pos = await loadOwnPosition(auth.handwerkerId, positionId);
  if (!pos) return { ok: false, error: "Position nicht gefunden.", status: 404 };

  if (!(await assertAuftragNochOffen(String(pos.auftrag_id)))) {
    return { ok: false, error: "Auftrag ist abgeschlossen (read-only)." };
  }

  const status = String(pos.leistung_status ?? "offen");
  if (status !== "in_arbeit") {
    return {
      ok: false,
      error: "Fortschritt erst nach Start möglich.",
      status: 403,
    };
  }

  const foto = parseFotoFromForm(formData);
  if (!foto.file) {
    return { ok: false, error: "Fortschritts-Foto ist Pflicht." };
  }
  if (foto.nachgereicht && !foto.nachreichGrund) {
    return { ok: false, error: "Bitte Grund für nachgereichtes Foto angeben." };
  }

  const isAufwand = String(pos.verguetung ?? "") === "aufwand";
  const zeitMinuten = isAufwand ? zeitMinutenFromStdMin(std, min) : null;

  const eintrag = await insertEintrag({
    positionId,
    typ: "fortschritt",
    beschreibung,
    zeitMinuten,
    handwerkerId: auth.handwerkerId,
  });
  if (!eintrag.ok) return eintrag;

  const attached = await attachFoto({
    eintragId: eintrag.id,
    handwerkerId: auth.handwerkerId,
    auftragId: String(pos.auftrag_id),
    positionId,
    file: foto.file,
    captureAt: foto.captureAt,
    nachgereicht: foto.nachgereicht,
    nachreichGrund: foto.nachreichGrund,
  });
  if (!attached.ok) return attached;

  await writeAuditEvent({
    entityType: "auftrag",
    entityId: String(pos.auftrag_id),
    aktion: "position_fortschritt",
    actorRolle: "partner",
    payload: { position_id: positionId, eintrag_id: eintrag.id, zeit_minuten: zeitMinuten },
  });

  revalidatePath("/partner");
  return { ok: true, eintragId: eintrag.id, positionId };
}

/** IN_ARBEIT → Erledigt mit Ergebnis-Foto. */
export async function completePartnerPosition(
  formData: FormData
): Promise<PartnerPositionEintragResult> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;

  const positionId = String(formData.get("positionId") ?? "").trim();
  const beschreibung = String(formData.get("beschreibung") ?? "").trim() || null;
  const std = Number(formData.get("zeitStd") ?? 0);
  const min = Number(formData.get("zeitMin") ?? 0);
  if (!positionId) return { ok: false, error: "Position fehlt." };

  const pos = await loadOwnPosition(auth.handwerkerId, positionId);
  if (!pos) return { ok: false, error: "Position nicht gefunden.", status: 404 };

  if (!(await assertAuftragNochOffen(String(pos.auftrag_id)))) {
    return { ok: false, error: "Auftrag ist abgeschlossen (read-only)." };
  }

  const status = String(pos.leistung_status ?? "offen");
  if (status !== "in_arbeit") {
    return {
      ok: false,
      error: "Erledigt melden erst nach Start möglich.",
      status: 403,
    };
  }

  const foto = parseFotoFromForm(formData);
  if (!foto.file) {
    return { ok: false, error: "Ergebnis-Foto ist Pflicht." };
  }
  if (foto.nachgereicht && !foto.nachreichGrund) {
    return { ok: false, error: "Bitte Grund für nachgereichtes Foto angeben." };
  }

  const isAufwand = String(pos.verguetung ?? "") === "aufwand";
  let zeitMinuten: number | null = null;
  if (isAufwand) {
    const fromForm = zeitMinutenFromStdMin(std, min);
    if (fromForm != null) {
      zeitMinuten = fromForm;
    } else {
      const { data: rows } = await supabaseAdmin
        .from("position_eintraege")
        .select("zeit_minuten")
        .eq("position_id", positionId)
        .eq("typ", "fortschritt");
      zeitMinuten =
        (rows ?? []).reduce(
          (sum, r) => sum + (Number(r.zeit_minuten) || 0),
          0
        ) || null;
    }
  }

  const eintrag = await insertEintrag({
    positionId,
    typ: "ergebnis",
    beschreibung,
    zeitMinuten,
    handwerkerId: auth.handwerkerId,
  });
  if (!eintrag.ok) return eintrag;

  const attached = await attachFoto({
    eintragId: eintrag.id,
    handwerkerId: auth.handwerkerId,
    auftragId: String(pos.auftrag_id),
    positionId,
    file: foto.file,
    captureAt: foto.captureAt,
    nachgereicht: foto.nachgereicht,
    nachreichGrund: foto.nachreichGrund,
  });
  if (!attached.ok) return attached;

  const now = new Date().toISOString();
  // F1: Nur Dokumentation (leistung_status) — handwerker_status=erledigt erst nach Abnahme-Signatur
  await supabaseAdmin
    .from("auftrag_positionen")
    .update({
      leistung_status: "erledigt",
      erledigt_am: now,
    })
    .eq("id", positionId);

  await writeAuditEvent({
    entityType: "auftrag",
    entityId: String(pos.auftrag_id),
    aktion: "position_erledigt",
    actorRolle: "partner",
    payload: { position_id: positionId, eintrag_id: eintrag.id, zeit_minuten: zeitMinuten },
  });

  revalidatePath("/partner");
  return { ok: true, eintragId: eintrag.id, positionId };
}

/** Neue Regie-Position „Weitere Arbeit“ (in Prüfung). */
export async function createPartnerWeitereArbeit(
  formData: FormData
): Promise<PartnerPositionEintragResult> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;

  const auftragId = String(formData.get("auftragId") ?? "").trim();
  const titel = String(formData.get("titel") ?? "").trim();
  if (!auftragId) return { ok: false, error: "Auftrag fehlt." };
  if (titel.length < 4) {
    return { ok: false, error: "Titel fehlt (mind. 4 Zeichen)." };
  }

  const { data: own } = await supabaseAdmin
    .from("auftrag_positionen")
    .select("id")
    .eq("auftrag_id", auftragId)
    .eq("handwerker_id", auth.handwerkerId)
    .limit(1);
  if (!own?.length) {
    return { ok: false, error: "Kein Zugriff auf diesen Auftrag." };
  }

  if (!(await assertAuftragNochOffen(auftragId))) {
    return { ok: false, error: "Auftrag ist abgeschlossen (read-only)." };
  }

  const { data: maxSort } = await supabaseAdmin
    .from("auftrag_positionen")
    .select("sort_order")
    .eq("auftrag_id", auftragId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: inserted, error } = await supabaseAdmin
    .from("auftrag_positionen")
    .insert({
      auftrag_id: auftragId,
      handwerker_id: auth.handwerkerId,
      gewerk_name: "Regie",
      leistung_name: titel,
      beschreibung:
        "Weitere Arbeit durch Partner dokumentiert. Bis ca. 30 Min direkt, größere vorher als Nachtrag melden.",
      einheit: "Std",
      menge: 1,
      typ: "regie",
      verguetung: "aufwand",
      leistung_status: "offen",
      anerkennung_status: "in_pruefung",
      handwerker_status: "bestaetigt",
      sort_order: Number(maxSort?.sort_order ?? 0) + 1,
    })
    .select("id")
    .single();

  if (error) {
    return {
      ok: false,
      error:
        /typ|verguetung|anerkennung/i.test(error.message)
          ? "Migration Positions-Lebenszyklus fehlt noch — bitte DB aktualisieren."
          : error.message,
    };
  }

  await writeAuditEvent({
    entityType: "auftrag",
    entityId: auftragId,
    aktion: "weitere_arbeit_angelegt",
    actorRolle: "partner",
    payload: { position_id: inserted.id, titel },
  });

  revalidatePath("/partner");
  return { ok: true, eintragId: "", positionId: String(inserted.id) };
}
