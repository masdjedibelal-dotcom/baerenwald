"use server";

import { revalidatePath } from "next/cache";

import {
  formatPartnerAngebotsNr,
  formatPartnerRechnungsNr,
  generatePartnerDokumentPdf,
  type PartnerDocAbsender,
  type PartnerDocPosition,
} from "@/lib/partner/generate-partner-dokument-pdf";
import { linkPortalHandwerkerToAuthUser } from "@/lib/partner/link-portal-handwerker";
import {
  buildPartnerAutoDocPositionen,
  type AutoDocMissingField,
  type AutoDocRegieOverride,
} from "@/lib/partner/partner-auto-doc-positionen";
import { getPartnerDocEmpfaenger } from "@/lib/partner/partner-doc-empfaenger";
import { resolvePartnerDocBetreff } from "@/lib/partner/partner-doc-betreff";
import {
  formatPlzOrt,
  formatStrasseNr,
  resolveHandwerkerAnschrift,
} from "@/lib/partner/handwerker-anschrift";
import { checkPartnerFirmendatenGate } from "@/lib/partner/partner-firmendaten-gate";
import { PARTNER_KONDITION_MWST } from "@/lib/partner/partner-konditionen";
import {
  MAIL_PDF_LINK_TTL_SEC,
  sendPartnerInternalRechnungMail,
} from "@/lib/partner/partner-mail";
import {
  resolvePartnerFileUrl,
  uploadPartnerGeneratedPdf,
} from "@/lib/partner/partner-storage";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export type PartnerAutoDocPreview = {
  anfrageId: string;
  art: "angebot" | "rechnung";
  dokumentNr: string;
  betreff: string;
  objektOrt: string;
  positionen: Array<{
    titel: string;
    beschreibung?: string | null;
    netto: number;
    mwstSatz: number;
    menge?: number | null;
    einheit?: string | null;
  }>;
  nettoSumme: number;
  missingFirmendaten: string[];
  missingFields: AutoDocMissingField[];
  canSubmit: boolean;
  firmendaten: {
    firma: string;
    strasse: string;
    hausnummer: string;
    plz: string;
    ort: string;
    telefon: string;
    steuernummer: string;
    ustid: string;
    iban: string;
    kleinunternehmer: boolean;
  };
  empfaenger: {
    firma: string;
    strasse: string;
    plzOrt: string;
  };
};

export type PartnerAutoDocResult =
  | { ok: true; path: string; dokumentNr: string; already?: boolean }
  | { ok: false; error: string };

async function partnerAuth() {
  if (!isSupabaseConfigured()) {
    return { ok: false as const, error: "Datenbank nicht konfiguriert." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false as const, error: "Nicht angemeldet." };
  const link = await linkPortalHandwerkerToAuthUser({
    userId: user.id,
    email: user.email,
  });
  if (!link.ok) return { ok: false as const, error: link.error };
  return { ok: true as const, handwerkerId: link.handwerkerId };
}

function isAngenommenStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s === "akzeptiert" || s === "angenommen";
}

async function loadHandwerkerAbsender(handwerkerId: string): Promise<{
  absender: PartnerDocAbsender;
  logoPath: string | null;
  rechnungsnrSeq: number;
  gateMissingAngebot: string[];
  gateMissingRechnung: string[];
  firmendaten: PartnerAutoDocPreview["firmendaten"];
}> {
  let { data, error } = await supabaseAdmin
    .from("handwerker")
    .select(
      "firma, name, vorname, nachname, strasse, hausnummer, plz, ort, adresse, telefon, email, steuernummer, ustid, handelsregister, iban, bic, bank, logo_url, rechnungsnr_seq, kleinunternehmer"
    )
    .eq("id", handwerkerId)
    .maybeSingle();

  if (
    error &&
    /logo_url|rechnungsnr_seq|kleinunternehmer|strasse|hausnummer|plz|ort|bic|bank|handelsregister/i.test(
      error.message
    )
  ) {
    ({ data, error } = await supabaseAdmin
      .from("handwerker")
      .select(
        "firma, name, vorname, nachname, adresse, telefon, email, steuernummer, ustid, iban"
      )
      .eq("id", handwerkerId)
      .maybeSingle());
  }

  const row = (data ?? {}) as Record<string, unknown>;
  const inhaber =
    [row.vorname, row.nachname].filter(Boolean).join(" ").trim() ||
    String(row.name ?? "");
  const anschrift = resolveHandwerkerAnschrift({
    strasse: (row.strasse as string | null) ?? null,
    hausnummer: (row.hausnummer as string | null) ?? null,
    plz: (row.plz as string | null) ?? null,
    ort: (row.ort as string | null) ?? null,
    adresse: (row.adresse as string | null) ?? null,
  });
  const absender: PartnerDocAbsender = {
    firma: String(row.firma ?? row.name ?? "Handwerksbetrieb"),
    inhaber: inhaber || null,
    strasse: anschrift.strasse || null,
    hausnummer: anschrift.hausnummer || null,
    plz: anschrift.plz || null,
    ort: anschrift.ort || null,
    adresse:
      (row.adresse as string | null) ??
      ([formatStrasseNr(anschrift.strasse, anschrift.hausnummer), formatPlzOrt(anschrift.plz, anschrift.ort)]
        .filter(Boolean)
        .join(", ") || null),
    telefon: (row.telefon as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    steuernummer: (row.steuernummer as string | null) ?? null,
    ustid: (row.ustid as string | null) ?? null,
    handelsregister: (row.handelsregister as string | null) ?? null,
    iban: (row.iban as string | null) ?? null,
    bic: (row.bic as string | null) ?? null,
    bank: (row.bank as string | null) ?? null,
    kleinunternehmer: Boolean(row.kleinunternehmer),
  };

  const gate = checkPartnerFirmendatenGate({
    firma: absender.firma,
    name: inhaber,
    strasse: absender.strasse,
    hausnummer: absender.hausnummer,
    plz: absender.plz,
    ort: absender.ort,
    adresse: absender.adresse,
    telefon: absender.telefon,
    steuernummer: absender.steuernummer,
    ustid: absender.ustid,
    iban: absender.iban,
  });

  return {
    absender,
    logoPath: (row.logo_url as string | null) ?? null,
    rechnungsnrSeq: Number(row.rechnungsnr_seq ?? 0) || 0,
    gateMissingAngebot: gate.missingAngebot,
    gateMissingRechnung: gate.missingRechnung,
    firmendaten: {
      firma: absender.firma,
      strasse: anschrift.strasse,
      hausnummer: anschrift.hausnummer,
      plz: anschrift.plz,
      ort: anschrift.ort,
      telefon: String(absender.telefon ?? ""),
      steuernummer: String(absender.steuernummer ?? ""),
      ustid: String(absender.ustid ?? ""),
      iban: String(absender.iban ?? ""),
      kleinunternehmer: Boolean(absender.kleinunternehmer),
    },
  };
}

async function loadLogoBytes(path: string | null): Promise<Uint8Array | null> {
  if (!path?.trim()) return null;
  const raw = path.trim();
  if (/^https?:\/\//i.test(raw)) {
    try {
      const res = await fetch(raw);
      if (!res.ok) return null;
      return new Uint8Array(await res.arrayBuffer());
    } catch {
      return null;
    }
  }
  const storagePath = raw.includes("/")
    ? raw.replace(/^handwerker-uploads\//, "")
    : raw;
  const { data, error } = await supabaseAdmin.storage
    .from("handwerker-uploads")
    .download(storagePath);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

async function resolveDocPositionen(opts: {
  handwerkerId: string;
  row: Record<string, unknown>;
  art: "angebot" | "rechnung";
  auftragId?: string | null;
  overrides?: AutoDocRegieOverride[];
}) {
  const angebotId = opts.row.angebot_id
    ? String(opts.row.angebot_id)
    : null;
  const built = await buildPartnerAutoDocPositionen({
    handwerkerId: opts.handwerkerId,
    angebotId,
    auftragId: opts.auftragId ?? null,
    hwKonditionen: opts.row.hw_konditionen,
    art: opts.art,
    overrides: opts.overrides,
  });
  if (built.positionen.length) return built;

  // Fallback: reine Konditionen ohne Auftrag
  const { parsePartnerHwKonditionen } = await import(
    "@/lib/partner/partner-konditionen"
  );
  const hw = parsePartnerHwKonditionen(opts.row.hw_konditionen);
  const positionen: PartnerDocPosition[] = (hw?.positionen ?? []).map((p) => ({
    titel: p.leistung,
    beschreibung: p.beschreibung ?? null,
    netto: p.hw_netto,
    mwstSatz: p.mwst_satz || PARTNER_KONDITION_MWST,
  }));
  return { positionen, regieGaps: [], missingRegie: [] as AutoDocMissingField[] };
}

function firmendatenMissingFields(
  labels: string[]
): AutoDocMissingField[] {
  const map: Record<string, AutoDocMissingField> = {
    Firmenname: { key: "firma", label: "Firmenname", scope: "firmendaten", kind: "text" },
    "Anschrift (Straße + PLZ/Ort)": {
      key: "anschrift",
      label: "Anschrift (Straße + PLZ/Ort)",
      scope: "firmendaten",
      kind: "text",
    },
    Telefon: { key: "telefon", label: "Telefon", scope: "firmendaten", kind: "tel" },
    "Steuernummer oder USt-IdNr.": {
      key: "steuer",
      label: "Steuernummer oder USt-IdNr.",
      scope: "firmendaten",
      kind: "text",
    },
    IBAN: { key: "iban", label: "IBAN", scope: "firmendaten", kind: "iban" },
  };
  return labels.map((l) => map[l] ?? { key: l, label: l, scope: "firmendaten", kind: "text" });
}

type DocCtx = {
  anfrageId: string;
  auftragId: string | null;
  betreff: string;
  objektOrt: string;
  row: Record<string, unknown>;
};

/** Robuster AH-Load ohne fragile Nested-Selects (leads.ort existiert z. B. nicht). */
async function loadAnfrageCtx(
  anfrageId: string,
  handwerkerId: string
): Promise<{ ok: true; ctx: DocCtx } | { ok: false; error: string }> {
  const { data: row, error } = await supabaseAdmin
    .from("angebot_handwerker")
    .select(
      `
      id, handwerker_id, status, hw_status, hw_konditionen, hw_preis_netto,
      hw_angebot_pdf_url, hw_angebot_anhang_urls, hw_rechnung_eingereicht_at,
      hw_eingereicht_at, bestaetigt_at, angebot_id, gewerk_id
    `
    )
    .eq("id", anfrageId)
    .maybeSingle();

  if (error || !row) {
    console.warn("[partner] loadAnfrageCtx:", error?.message ?? "no row", anfrageId);
    return { ok: false, error: "Anfrage nicht gefunden." };
  }
  if (String(row.handwerker_id) !== handwerkerId) {
    return { ok: false, error: "Keine Berechtigung." };
  }

  const angebotId = row.angebot_id ? String(row.angebot_id) : null;
  let auftragTitel: string | null = null;
  let projektbeschreibung: string | null = null;
  let gewerkName: string | null = null;
  let bereiche: string[] | null = null;
  let situation: string | null = null;
  let objektOrt = "";
  let auftragId: string | null = null;

  if (angebotId) {
    const { data: ang } = await supabaseAdmin
      .from("angebote")
      .select("projektbeschreibung, kunde_id, lead_id")
      .eq("id", angebotId)
      .maybeSingle();
    projektbeschreibung = String(ang?.projektbeschreibung ?? "").trim() || null;

    const { data: auf } = await supabaseAdmin
      .from("auftraege")
      .select("id, titel, kunde_id, lead_id")
      .eq("angebot_id", angebotId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (auf?.id) {
      auftragId = String(auf.id);
      auftragTitel = String(auf.titel ?? "").trim() || null;
    }

    const leadId = (auf?.lead_id ?? ang?.lead_id)
      ? String(auf?.lead_id ?? ang?.lead_id)
      : "";
    if (leadId) {
      const { data: lead } = await supabaseAdmin
        .from("leads")
        .select("bereiche, situation, plz")
        .eq("id", leadId)
        .maybeSingle();
      if (Array.isArray(lead?.bereiche)) {
        bereiche = lead.bereiche.map((b) => String(b));
      }
      situation = String(lead?.situation ?? "").trim() || null;
      if (!objektOrt && lead?.plz) {
        objektOrt = String(lead.plz).trim();
      }
    }

    const kundeId = (auf?.kunde_id ?? ang?.kunde_id)
      ? String(auf?.kunde_id ?? ang?.kunde_id)
      : "";
    if (kundeId) {
      const { data: kunde } = await supabaseAdmin
        .from("kunden")
        .select("plz, ort")
        .eq("id", kundeId)
        .maybeSingle();
      const fromKunde = [kunde?.plz, kunde?.ort].filter(Boolean).join(" ").trim();
      if (fromKunde) objektOrt = fromKunde;
    }
  }

  if (row.gewerk_id) {
    const { data: gw } = await supabaseAdmin
      .from("gewerke")
      .select("name")
      .eq("id", row.gewerk_id)
      .maybeSingle();
    gewerkName = String(gw?.name ?? "").trim() || null;
  }

  const betreff = resolvePartnerDocBetreff({
    auftragTitel,
    projektbeschreibung,
    gewerkName,
    bereiche,
    situation,
  });

  return {
    ok: true,
    ctx: {
      anfrageId: String(row.id),
      auftragId,
      betreff,
      objektOrt,
      row: row as Record<string, unknown>,
    },
  };
}

/**
 * Rechnung aus Auftrag/Leistungen — unabhängig davon, ob der Vorgang
 * über Angebot oder Direktauftrag/Akut entstanden ist.
 * Speicherung läuft intern weiter über angebot_handwerker (CRM-Eingang).
 */
async function loadAuftragRechnungCtx(
  auftragId: string,
  handwerkerId: string
): Promise<{ ok: true; ctx: DocCtx } | { ok: false; error: string }> {
  const id = auftragId.trim();
  const { data: auftrag, error } = await supabaseAdmin
    .from("auftraege")
    .select("id, titel, angebot_id, kunde_id, lead_id, handwerker_bestaetigt_at, status")
    .eq("id", id)
    .maybeSingle();

  if (error || !auftrag) {
    return { ok: false, error: "Auftrag nicht gefunden." };
  }

  const { data: zuw } = await supabaseAdmin
    .from("auftrag_handwerker")
    .select("id")
    .eq("auftrag_id", id)
    .eq("handwerker_id", handwerkerId)
    .limit(1)
    .maybeSingle();
  const { data: pos } = await supabaseAdmin
    .from("auftrag_positionen")
    .select("id")
    .eq("auftrag_id", id)
    .eq("handwerker_id", handwerkerId)
    .limit(1)
    .maybeSingle();
  if (!zuw?.id && !pos?.id) {
    return { ok: false, error: "Keine Berechtigung für diesen Auftrag." };
  }

  const { ensurePartnerAngebotHandwerkerForAuftrag } = await import(
    "@/lib/partner/ensure-partner-angebot-handwerker-for-auftrag"
  );
  const ensured = await ensurePartnerAngebotHandwerkerForAuftrag({
    auftragId: id,
    handwerkerId,
    markAccepted: true,
  });
  if (!ensured.ok) return ensured;

  const ah = await loadAnfrageCtx(ensured.anfrageId, handwerkerId);
  if (!ah.ok) return ah;

  let objektOrt = ah.ctx.objektOrt;
  if (!objektOrt && auftrag.kunde_id) {
    const { data: kunde } = await supabaseAdmin
      .from("kunden")
      .select("plz, ort")
      .eq("id", String(auftrag.kunde_id))
      .maybeSingle();
    objektOrt = [kunde?.plz, kunde?.ort].filter(Boolean).join(" ").trim();
  }

  return {
    ok: true,
    ctx: {
      ...ah.ctx,
      auftragId: id,
      betreff: resolvePartnerDocBetreff({
        auftragTitel: String(auftrag.titel ?? "").trim() || null,
        fallback: ah.ctx.betreff,
      }),
      objektOrt,
    },
  };
}

async function resolveRechnungCtx(input: {
  anfrageId?: string | null;
  auftragId?: string | null;
  handwerkerId: string;
}): Promise<{ ok: true; ctx: DocCtx } | { ok: false; error: string }> {
  const auftragId = input.auftragId?.trim() || "";
  const anfrageId = input.anfrageId?.trim() || "";
  if (auftragId) {
    return loadAuftragRechnungCtx(auftragId, input.handwerkerId);
  }
  if (anfrageId) {
    return loadAnfrageCtx(anfrageId, input.handwerkerId);
  }
  return { ok: false, error: "Auftrag oder Anfrage fehlt." };
}

/** Preview-Daten für Auto-Angebot / Auto-Rechnung. */
export async function previewPartnerAutoDokument(input: {
  /** Klassischer Angebot-Pfad. */
  anfrageId?: string | null;
  /** Direktauftrag/Akut: Rechnung aus Auftrags-Leistungen. */
  auftragId?: string | null;
  art: "angebot" | "rechnung";
  overrides?: AutoDocRegieOverride[];
}): Promise<{ ok: true; preview: PartnerAutoDocPreview } | { ok: false; error: string }> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;

  const resolved =
    input.art === "rechnung"
      ? await resolveRechnungCtx({
          anfrageId: input.anfrageId,
          auftragId: input.auftragId,
          handwerkerId: auth.handwerkerId,
        })
      : input.anfrageId?.trim()
        ? await loadAnfrageCtx(input.anfrageId.trim(), auth.handwerkerId)
        : { ok: false as const, error: "Anfrage fehlt." };
  if (!resolved.ok) return resolved;
  const { ctx } = resolved;

  const hw = await loadHandwerkerAbsender(auth.handwerkerId);
  const built = await resolveDocPositionen({
    handwerkerId: auth.handwerkerId,
    row: ctx.row,
    art: input.art,
    auftragId: ctx.auftragId,
    overrides: input.overrides,
  });
  if (!built.positionen.length) {
    return {
      ok: false,
      error: "Keine Konditionen/Positionen für das Dokument vorhanden.",
    };
  }

  const year = new Date().getFullYear();
  const dokumentNr =
    input.art === "rechnung"
      ? formatPartnerRechnungsNr(year, hw.rechnungsnrSeq + 1)
      : formatPartnerAngebotsNr(hw.absender.firma, new Date().toISOString());

  const firmMissing =
    input.art === "rechnung" ? hw.gateMissingRechnung : hw.gateMissingAngebot;
  const missingFields = [
    ...firmendatenMissingFields(firmMissing),
    ...built.missingRegie,
  ];
  const nettoSumme = built.positionen.reduce((s, p) => s + p.netto, 0);
  const empfaenger = getPartnerDocEmpfaenger();

  return {
    ok: true,
    preview: {
      anfrageId: ctx.anfrageId,
      art: input.art,
      dokumentNr,
      betreff: ctx.betreff,
      objektOrt: ctx.objektOrt,
      positionen: built.positionen.map((p) => ({
        titel: p.titel,
        beschreibung: p.beschreibung,
        netto: p.netto,
        mwstSatz: p.mwstSatz,
        menge: p.menge,
        einheit: p.einheit,
      })),
      nettoSumme,
      missingFirmendaten: firmMissing,
      missingFields,
      canSubmit: missingFields.length === 0,
      firmendaten: hw.firmendaten,
      empfaenger: {
        firma: empfaenger.firma,
        strasse: empfaenger.strasse,
        plzOrt: empfaenger.plzOrt,
      },
    },
  };
}

/** Konzept B: Angebot erzeugen und speichern. */
export async function submitPartnerAutoAngebot(
  anfrageId: string,
  opts?: { dokumentNr?: string; overrides?: AutoDocRegieOverride[] }
): Promise<PartnerAutoDocResult> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;

  const id = anfrageId.trim();
  const resolved = await loadAnfrageCtx(id, auth.handwerkerId);
  if (!resolved.ok) return resolved;
  const { ctx } = resolved;

  if (!isAngenommenStatus(String(ctx.row.status ?? ""))) {
    return { ok: false, error: "Nur nach Annahme möglich." };
  }

  const existingPdf = String(ctx.row.hw_angebot_pdf_url ?? "").trim();
  if (existingPdf) {
    return {
      ok: true,
      path: existingPdf,
      dokumentNr: opts?.dokumentNr?.trim() || "bereits vorhanden",
      already: true,
    };
  }

  const hw = await loadHandwerkerAbsender(auth.handwerkerId);
  if (hw.gateMissingAngebot.length) {
    return {
      ok: false,
      error: `Firmendaten unvollständig: ${hw.gateMissingAngebot.join(", ")}. Bitte unter Firmendaten ergänzen.`,
    };
  }

  const built = await resolveDocPositionen({
    handwerkerId: auth.handwerkerId,
    row: ctx.row,
    art: "angebot",
    auftragId: ctx.auftragId,
    overrides: opts?.overrides,
  });
  if (!built.positionen.length) {
    return { ok: false, error: "Keine Positionen für das Angebot." };
  }
  if (built.missingRegie.length) {
    return {
      ok: false,
      error: `Regie-Daten fehlen: ${built.missingRegie.map((m) => m.label).join(", ")}.`,
    };
  }

  const customNr = opts?.dokumentNr?.trim() ?? "";
  if (customNr && customNr.length < 2) {
    return { ok: false, error: "Angebotsnummer ist zu kurz." };
  }
  const dokumentNr =
    customNr ||
    formatPartnerAngebotsNr(hw.absender.firma, new Date().toISOString());
  const logoBytes = await loadLogoBytes(hw.logoPath);
  const pdfBytes = await generatePartnerDokumentPdf({
    docArt: "angebot",
    absender: hw.absender,
    empfaenger: getPartnerDocEmpfaenger(),
    dokumentNr,
    datum: new Date().toISOString(),
    betreff: ctx.betreff,
    objektOrt: ctx.objektOrt,
    positionen: built.positionen,
    logoBytes,
    gueltigTage: 30,
  });

  const upload = await uploadPartnerGeneratedPdf({
    handwerkerId: auth.handwerkerId,
    anfrageId: id,
    pdfBytes,
    kind: "angebot",
  });
  if (!upload.ok) return upload;

  const existingAnhang = Array.isArray(ctx.row.hw_angebot_anhang_urls)
    ? (ctx.row.hw_angebot_anhang_urls as string[])
    : [];
  const merged = Array.from(new Set([upload.path, ...existingAnhang]));

  const { data: updatedRows, error: upErr } = await supabaseAdmin
    .from("angebot_handwerker")
    .update({
      hw_angebot_pdf_url: upload.path,
      hw_angebot_anhang_urls: merged,
    })
    .eq("id", id)
    .eq("handwerker_id", auth.handwerkerId)
    .select("id");

  if (upErr) return { ok: false, error: upErr.message };
  if (!updatedRows?.length) {
    return { ok: false, error: "Angebot konnte nicht gespeichert werden." };
  }

  void import("@/lib/partner/notify-crm-partner-dokument").then(
    ({ notifyCrmPartnerDokumentUpload }) =>
      notifyCrmPartnerDokumentUpload({
        typ: "angebot",
        handwerkerId: auth.handwerkerId,
        anfrageId: id,
        titel: `Angebot ${dokumentNr}`,
      })
  );

  revalidatePath("/partner");
  return { ok: true, path: upload.path, dokumentNr };
}

/** Konzept B: Rechnung erzeugen und einreichen. */
export async function submitPartnerAutoRechnung(input: {
  anfrageId?: string | null;
  auftragId?: string | null;
  leistungsZeitraum?: string;
  /** Eigene interne Rechnungsnummer; sonst Vorschlag aus Nummerkreis. */
  dokumentNr?: string;
  overrides?: AutoDocRegieOverride[];
}): Promise<PartnerAutoDocResult> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;

  const resolved = await resolveRechnungCtx({
    anfrageId: input.anfrageId,
    auftragId: input.auftragId,
    handwerkerId: auth.handwerkerId,
  });
  if (!resolved.ok) return resolved;
  const { ctx } = resolved;
  const id = ctx.anfrageId;

  if (!isAngenommenStatus(String(ctx.row.status ?? ""))) {
    return { ok: false, error: "Nur für angenommene Vorgänge möglich." };
  }
  if (ctx.row.hw_rechnung_eingereicht_at) {
    return { ok: false, error: "Rechnung wurde bereits eingereicht." };
  }
  if (String(ctx.row.hw_status ?? "").toLowerCase() !== "uebernommen") {
    const hwSt = String(ctx.row.hw_status ?? "").toLowerCase();
    const st = String(ctx.row.status ?? "").toLowerCase();
    const crmOk =
      hwSt === "bestaetigt" ||
      st === "akzeptiert" ||
      st === "angenommen" ||
      Boolean(ctx.row.bestaetigt_at) ||
      Boolean(ctx.row.hw_eingereicht_at);
    if (!crmOk) {
      return {
        ok: false,
        error: "Rechnung erst nach Freigabe/Annahme durch Bärenwald möglich.",
      };
    }
  }

  const hw = await loadHandwerkerAbsender(auth.handwerkerId);
  if (hw.gateMissingRechnung.length) {
    return {
      ok: false,
      error: `Firmendaten unvollständig: ${hw.gateMissingRechnung.join(", ")}. Bitte unter Firmendaten ergänzen.`,
    };
  }

  const built = await resolveDocPositionen({
    handwerkerId: auth.handwerkerId,
    row: ctx.row,
    art: "rechnung",
    auftragId: ctx.auftragId,
    overrides: input.overrides,
  });
  if (!built.positionen.length) {
    return { ok: false, error: "Keine Positionen für die Rechnung." };
  }
  if (built.missingRegie.length) {
    return {
      ok: false,
      error: `Regie-Daten fehlen: ${built.missingRegie.map((m) => m.label).join(", ")}.`,
    };
  }

  const year = new Date().getFullYear();
  const nextSeq = hw.rechnungsnrSeq + 1;
  const suggestedNr = formatPartnerRechnungsNr(year, nextSeq);
  const customNr = input.dokumentNr?.trim() ?? "";
  if (customNr && customNr.length < 2) {
    return { ok: false, error: "Rechnungsnummer ist zu kurz." };
  }
  const dokumentNr = customNr || suggestedNr;
  const logoBytes = await loadLogoBytes(hw.logoPath);

  const pdfBytes = await generatePartnerDokumentPdf({
    docArt: "rechnung",
    absender: hw.absender,
    empfaenger: getPartnerDocEmpfaenger(),
    dokumentNr,
    datum: new Date().toISOString(),
    betreff: ctx.betreff,
    objektOrt: ctx.objektOrt,
    leistungsZeitraum: input.leistungsZeitraum?.trim() || undefined,
    auftragsRef: undefined,
    positionen: built.positionen,
    logoBytes,
    abnahmeHinweis: "Leistungen laut Abschlussdokumentation erbracht.",
  });

  const upload = await uploadPartnerGeneratedPdf({
    handwerkerId: auth.handwerkerId,
    anfrageId: id,
    pdfBytes,
    kind: "rechnung",
  });
  if (!upload.ok) return upload;

  const now = new Date().toISOString();
  const nettoSum = built.positionen.reduce(
    (s, p) => s + (Number.isFinite(p.netto) ? p.netto : 0),
    0
  );
  const ku = Boolean(hw.absender.kleinunternehmer);
  const mwstSum = ku
    ? 0
    : built.positionen.reduce((s, p) => {
        const netto = Number.isFinite(p.netto) ? p.netto : 0;
        const satz = p.mwstSatz || 19;
        return s + (netto * satz) / 100;
      }, 0);
  const bruttoSum = Math.round((nettoSum + mwstSum) * 100) / 100;

  const { data: updatedRows, error: upErr } = await supabaseAdmin
    .from("angebot_handwerker")
    .update({
      hw_rechnung_pdf_url: upload.path,
      hw_rechnung_eingereicht_at: now,
      hw_rechnung_status: "eingereicht",
      hw_rechnung_betrag_brutto: bruttoSum,
    })
    .eq("id", id)
    .eq("handwerker_id", auth.handwerkerId)
    .is("hw_rechnung_eingereicht_at", null)
    .select("id");

  if (upErr) return { ok: false, error: upErr.message };
  if (!updatedRows?.length) {
    return { ok: false, error: "Rechnung wurde bereits eingereicht." };
  }

  // Nummerkreis nur weiterschalten, wenn der Vorschlag genutzt wurde
  if (!customNr || customNr === suggestedNr) {
    await supabaseAdmin
      .from("handwerker")
      .update({ rechnungsnr_seq: nextSeq })
      .eq("id", auth.handwerkerId);
  }

  const rechnungPdfUrl = await resolvePartnerFileUrl(
    upload.path,
    MAIL_PDF_LINK_TTL_SEC
  );

  let ensuredRechnungId: string | null = null;
  try {
    const { notifyCrmPartnerDokumentUpload } = await import(
      "@/lib/partner/notify-crm-partner-dokument"
    );
    const crmRes = await notifyCrmPartnerDokumentUpload({
      typ: "rechnung",
      handwerkerId: auth.handwerkerId,
      anfrageId: id,
      auftragId: ctx.auftragId ?? null,
      titel: `Rechnung ${dokumentNr}`,
    });
    ensuredRechnungId = crmRes.rechnungId?.trim() || null;
  } catch (e) {
    console.warn("[submitPartnerAutoRechnung] CRM-Notify:", e);
  }

  void sendPartnerInternalRechnungMail({
    handwerkerName: hw.absender.inhaber || hw.absender.firma,
    firma: hw.absender.firma,
    gewerkName: ctx.betreff,
    plz: ctx.objektOrt.split(/\s+/)[0] || "—",
    angebotId: String(ctx.row.angebot_id ?? id),
    rechnungId: ensuredRechnungId,
    rechnungPdfUrl,
  });

  revalidatePath("/partner");
  return { ok: true, path: upload.path, dokumentNr };
}

/**
 * Nach Firmendaten-Save: offene angenommene Vorgänge ohne Angebot-PDF nachziehen.
 */
export async function retryPendingPartnerAutoAngebote(): Promise<{
  ok: true;
  created: number;
  skipped: number;
  missingFirmendaten: boolean;
  errors: string[];
}> {
  const auth = await partnerAuth();
  if (!auth.ok) {
    return {
      ok: true,
      created: 0,
      skipped: 0,
      missingFirmendaten: false,
      errors: [auth.error],
    };
  }

  const hw = await loadHandwerkerAbsender(auth.handwerkerId);
  if (hw.gateMissingAngebot.length) {
    return {
      ok: true,
      created: 0,
      skipped: 0,
      missingFirmendaten: true,
      errors: [],
    };
  }

  const { data: rows } = await supabaseAdmin
    .from("angebot_handwerker")
    .select("id, status, hw_angebot_pdf_url")
    .eq("handwerker_id", auth.handwerkerId)
    .in("status", ["akzeptiert", "angenommen"])
    .order("updated_at", { ascending: false })
    .limit(20);

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows ?? []) {
    const id = String(row.id ?? "").trim();
    if (!id) continue;
    if (String(row.hw_angebot_pdf_url ?? "").trim()) {
      skipped += 1;
      continue;
    }
    const res = await submitPartnerAutoAngebot(id);
    if (res.ok) {
      if (!res.already) created += 1;
      else skipped += 1;
    } else {
      errors.push(res.error);
      skipped += 1;
    }
  }

  if (created > 0) revalidatePath("/partner");
  return { ok: true, created, skipped, missingFirmendaten: false, errors };
}
