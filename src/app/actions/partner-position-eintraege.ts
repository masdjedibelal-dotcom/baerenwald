"use server";

import { revalidatePath } from "next/cache";

import { writeAuditEvent } from "@/lib/audit/write-audit-event";
import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import {
  zeitMinutenFromStdMin,
  type EintragTyp,
} from "@/lib/partner/position-lebenszyklus";
import { uploadPartnerEintragFoto } from "@/lib/partner/partner-storage";
import {
  markPartnerBautagebuchAnfrageErledigt,
  syncPartnerPositionEintragToKundeTimeline,
} from "@/lib/partner/sync-bautagebuch-kunde-timeline";
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
  beschreibungRoh?: string | null;
  zeitMinuten: number | null;
  handwerkerId: string;
  auftragId: string;
  leistungName?: string | null;
  anfrageId?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const roh = opts.beschreibungRoh?.trim() || null;
  const { data, error } = await supabaseAdmin
    .from("position_eintraege")
    .insert({
      position_id: opts.positionId,
      typ: opts.typ,
      beschreibung: opts.beschreibung,
      beschreibung_roh: roh && roh !== opts.beschreibung ? roh : roh,
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

  const eintragId = String(data.id);

  if (opts.typ === "fortschritt" || opts.typ === "ergebnis" || opts.typ === "start") {
    void markPartnerBautagebuchAnfrageErledigt({
      auftragId: opts.auftragId,
      handwerkerId: opts.handwerkerId,
      anfrageId: opts.anfrageId,
    });
  }

  return { ok: true, id: eintragId };
}

function readBeschreibungFromForm(formData: FormData): {
  beschreibung: string | null;
  beschreibungRoh: string | null;
  anfrageId: string | null;
} {
  const beschreibung = String(formData.get("beschreibung") ?? "").trim() || null;
  const roh = String(formData.get("beschreibung_roh") ?? "").trim() || null;
  const anfrageId = String(formData.get("anfrageId") ?? "").trim() || null;
  return { beschreibung, beschreibungRoh: roh, anfrageId };
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

/** Bis zu 5 Ergebnis-Fotos: `fotos` (mehrfach) + Legacy `foto`. */
function parseFotosFromForm(formData: FormData): File[] {
  const out: File[] = [];
  for (const entry of formData.getAll("fotos")) {
    if (entry instanceof File && entry.size > 0) out.push(entry);
  }
  const single = formData.get("foto");
  if (single instanceof File && single.size > 0) {
    const already = out.some(
      (f) => f.name === single.name && f.size === single.size
    );
    if (!already) out.unshift(single);
  }
  return out.slice(0, 5);
}

/** OFFEN → Start (bei Regie: Start-Foto + Beschreibung Pflicht). */
export async function startPartnerPosition(
  formData: FormData
): Promise<PartnerPositionEintragResult> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;

  const positionId = String(formData.get("positionId") ?? "").trim();
  const { beschreibung, beschreibungRoh, anfrageId } =
    readBeschreibungFromForm(formData);
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
  if (String(pos.anerkennung_status ?? "") === "in_pruefung") {
    return {
      ok: false,
      error: "Noch zur Prüfung — erst nach Freigabe starten.",
    };
  }
  if (String(pos.anerkennung_status ?? "") === "abgelehnt") {
    return { ok: false, error: "Diese Position wurde abgelehnt." };
  }

  const foto = parseFotoFromForm(formData);
  const isRegie =
    String(pos.typ ?? "").toLowerCase() === "regie" ||
    String(pos.verguetung ?? "").toLowerCase() === "aufwand";

  if (isRegie) {
    if (!foto.file) {
      return { ok: false, error: "Bei Regie ist das Start-Foto Pflicht." };
    }
    if (!beschreibung?.trim()) {
      return { ok: false, error: "Bitte eine kurze Beschreibung angeben." };
    }
  }
  if (foto.nachgereicht && !foto.nachreichGrund) {
    return { ok: false, error: "Bitte Grund für nachgereichtes Foto angeben." };
  }

  const eintrag = await insertEintrag({
    positionId,
    typ: "start",
    beschreibung,
    beschreibungRoh,
    zeitMinuten: null,
    handwerkerId: auth.handwerkerId,
    auftragId: String(pos.auftrag_id),
    leistungName: pos.leistung_name as string | null,
    anfrageId,
  });
  if (!eintrag.ok) return eintrag;

  if (foto.file) {
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
  }

  void syncPartnerPositionEintragToKundeTimeline({
    eintragId: eintrag.id,
    auftragId: String(pos.auftrag_id),
    typ: "start",
    beschreibung,
    leistungName: pos.leistung_name as string | null,
    handwerkerId: auth.handwerkerId,
  });

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

  void import("@/lib/partner/notify-vor-ort-start").then(({ notifyVorOrtStart }) =>
    notifyVorOrtStart({
      auftragId: String(pos.auftrag_id),
      handwerkerId: auth.handwerkerId,
      leistungName: pos.leistung_name as string | null,
    })
  );

  revalidatePath("/partner");
  return { ok: true, eintragId: eintrag.id, positionId };
}

/** IN_ARBEIT → Update/Fortschritt (Foto/Text optional). */
export async function addPartnerPositionFortschritt(
  formData: FormData
): Promise<PartnerPositionEintragResult> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;

  const positionId = String(formData.get("positionId") ?? "").trim();
  const { beschreibung, beschreibungRoh, anfrageId } =
    readBeschreibungFromForm(formData);
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
      error: "Fortschritt erst nach dem ersten Update möglich.",
      status: 403,
    };
  }

  const foto = parseFotoFromForm(formData);
  if (foto.nachgereicht && !foto.nachreichGrund) {
    return { ok: false, error: "Bitte Grund für nachgereichtes Foto angeben." };
  }
  if (!foto.file && !beschreibung?.trim()) {
    return {
      ok: false,
      error: "Bitte kurz beschreiben oder ein Foto anhängen.",
    };
  }

  /* Zeit speichern wenn Partner sie angibt — auch bei Festpreis (interne Info) */
  const zeitMinuten = zeitMinutenFromStdMin(std, min);

  const eintrag = await insertEintrag({
    positionId,
    typ: "fortschritt",
    beschreibung,
    beschreibungRoh,
    zeitMinuten,
    handwerkerId: auth.handwerkerId,
    auftragId: String(pos.auftrag_id),
    leistungName: pos.leistung_name as string | null,
    anfrageId,
  });
  if (!eintrag.ok) return eintrag;

  if (foto.file) {
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
  }

  void syncPartnerPositionEintragToKundeTimeline({
    eintragId: eintrag.id,
    auftragId: String(pos.auftrag_id),
    typ: "fortschritt",
    beschreibung,
    leistungName: pos.leistung_name as string | null,
    handwerkerId: auth.handwerkerId,
  });

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

/** IN_ARBEIT oder OFFEN (LV) → Erledigt; bei Regie: Ergebnis-Foto Pflicht. */
export async function completePartnerPosition(
  formData: FormData
): Promise<PartnerPositionEintragResult> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;

  const positionId = String(formData.get("positionId") ?? "").trim();
  const { beschreibung, beschreibungRoh, anfrageId } =
    readBeschreibungFromForm(formData);
  const std = Number(formData.get("zeitStd") ?? 0);
  const min = Number(formData.get("zeitMin") ?? 0);
  if (!positionId) return { ok: false, error: "Position fehlt." };

  const pos = await loadOwnPosition(auth.handwerkerId, positionId);
  if (!pos) return { ok: false, error: "Position nicht gefunden.", status: 404 };

  if (!(await assertAuftragNochOffen(String(pos.auftrag_id)))) {
    return { ok: false, error: "Auftrag ist abgeschlossen (read-only)." };
  }
  if (String(pos.anerkennung_status ?? "") === "in_pruefung") {
    return {
      ok: false,
      error: "Noch zur Prüfung — erst nach Freigabe abschließen.",
    };
  }
  if (String(pos.anerkennung_status ?? "") === "abgelehnt") {
    return { ok: false, error: "Diese Position wurde abgelehnt." };
  }

  const status = String(pos.leistung_status ?? "offen");
  const isRegie =
    String(pos.typ ?? "").toLowerCase() === "regie" ||
    String(pos.verguetung ?? "").toLowerCase() === "aufwand";

  if (status === "erledigt") {
    return { ok: false, error: "Position ist bereits erledigt." };
  }
  // Regie: erst nach Start. LV/Festpreis: direkt aus offen möglich.
  if (isRegie && status !== "in_arbeit") {
    return {
      ok: false,
      error: "Bei Regie erst starten, dann Ende dokumentieren.",
      status: 403,
    };
  }
  if (!isRegie && status !== "in_arbeit" && status !== "offen") {
    return { ok: false, error: "Position kann nicht abgeschlossen werden." };
  }

  const fotos = parseFotosFromForm(formData);
  const fotoMeta = parseFotoFromForm(formData);
  if (isRegie) {
    if (fotos.length === 0) {
      return { ok: false, error: "Bei Regie ist das Ende-Foto Pflicht." };
    }
    if (!beschreibung?.trim()) {
      return {
        ok: false,
        error: "Bitte eine kurze Beschreibung angeben.",
      };
    }
  }
  if (fotoMeta.nachgereicht && !fotoMeta.nachreichGrund) {
    return { ok: false, error: "Bitte Grund für nachgereichtes Foto angeben." };
  }

  // LV aus offen: stillschweigend als gestartet markieren
  if (!isRegie && status === "offen") {
    const nowSoft = new Date().toISOString();
    await supabaseAdmin
      .from("auftrag_positionen")
      .update({
        leistung_status: "in_arbeit",
        gestartet_am: nowSoft,
        handwerker_status: "bestaetigt",
      })
      .eq("id", positionId);
  }

  const isAufwand = String(pos.verguetung ?? "").toLowerCase() === "aufwand";
  let zeitMinuten: number | null = zeitMinutenFromStdMin(std, min);
  if (isAufwand) {
    if (zeitMinuten == null) {
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
    if (zeitMinuten == null || zeitMinuten <= 0) {
      return {
        ok: false,
        error: "Zeitaufwand Pflicht bei Regie/Aufwand",
      };
    }
  }

  const eintrag = await insertEintrag({
    positionId,
    typ: "ergebnis",
    beschreibung,
    beschreibungRoh,
    zeitMinuten,
    handwerkerId: auth.handwerkerId,
    auftragId: String(pos.auftrag_id),
    leistungName: pos.leistung_name as string | null,
    anfrageId,
  });
  if (!eintrag.ok) return eintrag;

  for (const file of fotos) {
    const attached = await attachFoto({
      eintragId: eintrag.id,
      handwerkerId: auth.handwerkerId,
      auftragId: String(pos.auftrag_id),
      positionId,
      file,
      captureAt: fotoMeta.captureAt,
      nachgereicht: fotoMeta.nachgereicht,
      nachreichGrund: fotoMeta.nachreichGrund,
    });
    if (!attached.ok) return attached;
  }

  void syncPartnerPositionEintragToKundeTimeline({
    eintragId: eintrag.id,
    auftragId: String(pos.auftrag_id),
    typ: "ergebnis",
    beschreibung,
    leistungName: pos.leistung_name as string | null,
    handwerkerId: auth.handwerkerId,
  });

  const now = new Date().toISOString();
  // F1: Nur Dokumentation (leistung_status) — handwerker_status=erledigt erst nach Abnahme-Signatur
  const mengeUpdate =
    isRegie && zeitMinuten != null && zeitMinuten > 0
      ? { menge: Math.round((zeitMinuten / 60) * 100) / 100, einheit: "Std" }
      : {};
  await supabaseAdmin
    .from("auftrag_positionen")
    .update({
      leistung_status: "erledigt",
      erledigt_am: now,
      ...mengeUpdate,
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

/** Neue Regie-/Nachtrag-Position — sichtbar, aber erst nach Freigabe ausführbar. */
export async function createPartnerWeitereArbeit(
  formData: FormData
): Promise<PartnerPositionEintragResult> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;

  const auftragId = String(formData.get("auftragId") ?? "").trim();
  const titel = String(formData.get("titel") ?? "").trim();
  const begruendung = String(formData.get("begruendung") ?? "").trim();
  // Stundensatz (€/h) — Legacy-Feld schaetzungEur weiterhin akzeptieren
  const stundensatzRaw = String(
    formData.get("stundensatz") ?? formData.get("schaetzungEur") ?? ""
  ).trim();
  const schaetzungMinRaw = String(formData.get("schaetzungMinuten") ?? "").trim();
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

  const stundensatzParsed = stundensatzRaw
    ? Number(stundensatzRaw.replace(",", "."))
    : null;
  const schaetzungMinuten = schaetzungMinRaw ? Number(schaetzungMinRaw) : null;
  const stundensatz =
    stundensatzParsed != null &&
    Number.isFinite(stundensatzParsed) &&
    stundensatzParsed > 0
      ? Math.round(stundensatzParsed * 100) / 100
      : null;
  const mengeStd =
    schaetzungMinuten != null &&
    Number.isFinite(schaetzungMinuten) &&
    schaetzungMinuten > 0
      ? Math.round((schaetzungMinuten / 60) * 100) / 100
      : 1;
  const zeitMinuten =
    schaetzungMinuten != null &&
    Number.isFinite(schaetzungMinuten) &&
    schaetzungMinuten > 0
      ? Math.round(schaetzungMinuten)
      : null;

  const beschreibungParts = [
    begruendung || null,
    "Nachtrag / Regie — wartet auf Freigabe durch Bärenwald.",
  ].filter(Boolean);

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
      beschreibung: beschreibungParts.join("\n\n"),
      einheit: "Std",
      menge: mengeStd,
      typ: "regie",
      verguetung: "aufwand",
      leistung_status: "offen",
      anerkennung_status: "in_pruefung",
      handwerker_status: "bestaetigt",
      ...(stundensatz != null
        ? { stundensatz, preis_partner: stundensatz }
        : {}),
      sort_order: Number(maxSort?.sort_order ?? 0) + 1,
    })
    .select("id")
    .single();

  if (error) {
    return {
      ok: false,
      error:
        /typ|verguetung|anerkennung|stundensatz/i.test(error.message)
          ? "Migration Positions-Lebenszyklus fehlt noch — bitte DB aktualisieren."
          : error.message,
    };
  }

  const positionId = String(inserted.id);
  const fotos = parseFotosFromForm(formData);
  let eintragId = "";
  if (fotos.length > 0 || begruendung) {
    const eintrag = await insertEintrag({
      positionId,
      typ: "weitere_arbeit",
      beschreibung: begruendung || titel,
      zeitMinuten,
      handwerkerId: auth.handwerkerId,
      auftragId,
      leistungName: titel,
    });
    if (!eintrag.ok) return eintrag;
    eintragId = eintrag.id;
    for (const file of fotos) {
      const attached = await attachFoto({
        eintragId,
        handwerkerId: auth.handwerkerId,
        auftragId,
        positionId,
        file,
        captureAt: null,
        nachgereicht: false,
        nachreichGrund: null,
      });
      if (!attached.ok) return attached;
    }
  }

  await writeAuditEvent({
    entityType: "auftrag",
    entityId: auftragId,
    aktion: "weitere_arbeit_angelegt",
    actorRolle: "partner",
    payload: {
      position_id: positionId,
      titel,
      stundensatz,
      schaetzung_minuten: zeitMinuten,
      foto_count: fotos.length,
      eintrag_id: eintragId || null,
    },
  });

  // CRM-Glocke (Staff) — gleiche Pipeline wie Positions-Anfrage
  try {
    const base = (
      process.env.CRM_DASHBOARD_URL?.trim() ||
      process.env.NEXT_PUBLIC_CRM_URL?.trim() ||
      ""
    ).replace(/\/$/, "");
    const secret = process.env.PARTNER_INTERNAL_API_SECRET?.trim();
    if (base && secret) {
      void fetch(`${base}/api/internal/partner-positions-meldung`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auftragId,
          positionId,
          typ: "weitere_arbeit",
          titel,
        }),
        cache: "no-store",
      });
    }
  } catch {
    /* non-blocking */
  }

  revalidatePath("/partner");
  return { ok: true, eintragId, positionId };
}
