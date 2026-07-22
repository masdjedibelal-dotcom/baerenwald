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
import { getPartnerDocEmpfaenger } from "@/lib/partner/partner-doc-empfaenger";
import { checkPartnerFirmendatenGate } from "@/lib/partner/partner-firmendaten-gate";
import {
  parsePartnerHwKonditionen,
  PARTNER_KONDITION_MWST,
} from "@/lib/partner/partner-konditionen";
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
  positionen: Array<{ titel: string; netto: number; mwstSatz: number }>;
  nettoSumme: number;
  missingFirmendaten: string[];
  canSubmit: boolean;
};

export type PartnerAutoDocResult =
  | { ok: true; path: string; dokumentNr: string }
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
}> {
  let { data, error } = await supabaseAdmin
    .from("handwerker")
    .select(
      "firma, name, vorname, nachname, strasse, ort, adresse, telefon, email, steuernummer, ustid, handelsregister, iban, bic, bank, logo_url, rechnungsnr_seq, kleinunternehmer"
    )
    .eq("id", handwerkerId)
    .maybeSingle();

  if (error && /logo_url|rechnungsnr_seq|kleinunternehmer|strasse|ort|bic|bank|handelsregister/i.test(error.message)) {
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
  const absender: PartnerDocAbsender = {
    firma: String(row.firma ?? row.name ?? "Handwerksbetrieb"),
    inhaber: inhaber || null,
    strasse: (row.strasse as string | null) ?? null,
    ort: (row.ort as string | null) ?? null,
    adresse: (row.adresse as string | null) ?? null,
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

function positionenFromKonditionen(raw: unknown): PartnerDocPosition[] {
  const hw = parsePartnerHwKonditionen(raw);
  if (!hw?.positionen?.length) return [];
  return hw.positionen.map((p) => ({
    titel: p.leistung,
    beschreibung: p.beschreibung ?? null,
    netto: p.hw_netto,
    mwstSatz: p.mwst_satz || PARTNER_KONDITION_MWST,
  }));
}

async function loadAnfrageCtx(anfrageId: string, handwerkerId: string) {
  const { data: row, error } = await supabaseAdmin
    .from("angebot_handwerker")
    .select(
      `
      id, handwerker_id, status, hw_status, hw_konditionen, hw_preis_netto,
      hw_angebot_pdf_url, hw_angebot_anhang_urls, hw_rechnung_eingereicht_at,
      angebot_id,
      gewerke(name),
      angebote(titel, kunden(plz, ort), leads(plz, ort, strasse))
    `
    )
    .eq("id", anfrageId)
    .maybeSingle();

  if (error || !row) return { ok: false as const, error: "Anfrage nicht gefunden." };
  if (String(row.handwerker_id) !== handwerkerId) {
    return { ok: false as const, error: "Keine Berechtigung." };
  }
  return { ok: true as const, row: row as Record<string, unknown> };
}

function objektOrtFromAnfrage(row: Record<string, unknown>): string {
  const ang = Array.isArray(row.angebote) ? row.angebote[0] : row.angebote;
  if (!ang || typeof ang !== "object") return "";
  const a = ang as Record<string, unknown>;
  const kunde = Array.isArray(a.kunden) ? a.kunden[0] : a.kunden;
  const lead = Array.isArray(a.leads) ? a.leads[0] : a.leads;
  const plz =
    (kunde as { plz?: string } | null)?.plz ||
    (lead as { plz?: string } | null)?.plz ||
    "";
  const ort =
    (kunde as { ort?: string } | null)?.ort ||
    (lead as { ort?: string } | null)?.ort ||
    "";
  return [plz, ort].filter(Boolean).join(" ").trim();
}

function betreffFromAnfrage(row: Record<string, unknown>): string {
  const ang = Array.isArray(row.angebote) ? row.angebote[0] : row.angebote;
  const titel =
    ang && typeof ang === "object"
      ? String((ang as { titel?: string }).titel ?? "").trim()
      : "";
  const gw = Array.isArray(row.gewerke) ? row.gewerke[0] : row.gewerke;
  const gewerk = gw ? String((gw as { name?: string }).name ?? "").trim() : "";
  return titel || gewerk || "Partnerleistung";
}

/** Preview-Daten für Auto-Angebot / Auto-Rechnung. */
export async function previewPartnerAutoDokument(input: {
  anfrageId: string;
  art: "angebot" | "rechnung";
}): Promise<{ ok: true; preview: PartnerAutoDocPreview } | { ok: false; error: string }> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;

  const ctx = await loadAnfrageCtx(input.anfrageId.trim(), auth.handwerkerId);
  if (!ctx.ok) return ctx;

  const hw = await loadHandwerkerAbsender(auth.handwerkerId);
  const positionen = positionenFromKonditionen(ctx.row.hw_konditionen);
  if (!positionen.length) {
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

  const missing =
    input.art === "rechnung" ? hw.gateMissingRechnung : hw.gateMissingAngebot;
  const nettoSumme = positionen.reduce((s, p) => s + p.netto, 0);

  return {
    ok: true,
    preview: {
      anfrageId: input.anfrageId.trim(),
      art: input.art,
      dokumentNr,
      betreff: betreffFromAnfrage(ctx.row),
      objektOrt: objektOrtFromAnfrage(ctx.row),
      positionen: positionen.map((p) => ({
        titel: p.titel,
        netto: p.netto,
        mwstSatz: p.mwstSatz,
      })),
      nettoSumme,
      missingFirmendaten: missing,
      canSubmit: missing.length === 0,
    },
  };
}

/** Konzept B: Angebot erzeugen und speichern. */
export async function submitPartnerAutoAngebot(
  anfrageId: string,
  opts?: { dokumentNr?: string }
): Promise<PartnerAutoDocResult> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;

  const id = anfrageId.trim();
  const ctx = await loadAnfrageCtx(id, auth.handwerkerId);
  if (!ctx.ok) return ctx;

  if (!isAngenommenStatus(String(ctx.row.status ?? ""))) {
    return { ok: false, error: "Nur nach Annahme möglich." };
  }

  const hw = await loadHandwerkerAbsender(auth.handwerkerId);
  if (hw.gateMissingAngebot.length) {
    return {
      ok: false,
      error: `Firmendaten unvollständig: ${hw.gateMissingAngebot.join(", ")}. Bitte unter Firmendaten ergänzen.`,
    };
  }

  const positionen = positionenFromKonditionen(ctx.row.hw_konditionen);
  if (!positionen.length) {
    return { ok: false, error: "Keine Positionen für das Angebot." };
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
    betreff: betreffFromAnfrage(ctx.row),
    objektOrt: objektOrtFromAnfrage(ctx.row),
    positionen,
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

  const { error: upErr } = await supabaseAdmin
    .from("angebot_handwerker")
    .update({
      hw_angebot_pdf_url: upload.path,
      hw_angebot_anhang_urls: merged,
    })
    .eq("id", id)
    .eq("handwerker_id", auth.handwerkerId);

  if (upErr) return { ok: false, error: upErr.message };

  revalidatePath("/partner");
  return { ok: true, path: upload.path, dokumentNr };
}

/** Konzept B: Rechnung erzeugen und einreichen. */
export async function submitPartnerAutoRechnung(input: {
  anfrageId: string;
  leistungsZeitraum?: string;
  /** Eigene interne Rechnungsnummer; sonst Vorschlag aus Nummerkreis. */
  dokumentNr?: string;
}): Promise<PartnerAutoDocResult> {
  const auth = await partnerAuth();
  if (!auth.ok) return auth;

  const id = input.anfrageId.trim();
  const ctx = await loadAnfrageCtx(id, auth.handwerkerId);
  if (!ctx.ok) return ctx;

  if (!isAngenommenStatus(String(ctx.row.status ?? ""))) {
    return { ok: false, error: "Nur für angenommene Vorgänge möglich." };
  }
  if (ctx.row.hw_rechnung_eingereicht_at) {
    return { ok: false, error: "Rechnung wurde bereits eingereicht." };
  }
  if (String(ctx.row.hw_status ?? "").toLowerCase() !== "uebernommen") {
    return {
      ok: false,
      error: "Rechnung erst nach Übernahme der Konditionen durch Bärenwald möglich.",
    };
  }

  const hw = await loadHandwerkerAbsender(auth.handwerkerId);
  if (hw.gateMissingRechnung.length) {
    return {
      ok: false,
      error: `Firmendaten unvollständig: ${hw.gateMissingRechnung.join(", ")}. Bitte unter Firmendaten ergänzen.`,
    };
  }

  const positionen = positionenFromKonditionen(ctx.row.hw_konditionen);
  if (!positionen.length) {
    return { ok: false, error: "Keine Positionen für die Rechnung." };
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
    betreff: betreffFromAnfrage(ctx.row),
    objektOrt: objektOrtFromAnfrage(ctx.row),
    leistungsZeitraum: input.leistungsZeitraum?.trim() || undefined,
    auftragsRef: String(ctx.row.angebot_id ?? id).slice(0, 8).toUpperCase(),
    positionen,
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
  const { error: upErr } = await supabaseAdmin
    .from("angebot_handwerker")
    .update({
      hw_rechnung_pdf_url: upload.path,
      hw_rechnung_eingereicht_at: now,
    })
    .eq("id", id)
    .eq("handwerker_id", auth.handwerkerId)
    .is("hw_rechnung_eingereicht_at", null);

  if (upErr) return { ok: false, error: upErr.message };

  // Nummerkreis nur weiterschalten, wenn der Vorschlag genutzt wurde
  if (!customNr || customNr === suggestedNr) {
    await supabaseAdmin
      .from("handwerker")
      .update({ rechnungsnr_seq: nextSeq })
      .eq("id", auth.handwerkerId);
  }

  const gw = Array.isArray(ctx.row.gewerke) ? ctx.row.gewerke[0] : ctx.row.gewerke;
  const rechnungPdfUrl = await resolvePartnerFileUrl(
    upload.path,
    MAIL_PDF_LINK_TTL_SEC
  );
  void sendPartnerInternalRechnungMail({
    handwerkerName: hw.absender.inhaber || hw.absender.firma,
    firma: hw.absender.firma,
    gewerkName: String((gw as { name?: string } | null)?.name ?? "Gewerk"),
    plz: objektOrtFromAnfrage(ctx.row).split(/\s+/)[0] || "—",
    angebotId: String(ctx.row.angebot_id ?? id),
    rechnungPdfUrl,
  });

  revalidatePath("/partner");
  return { ok: true, path: upload.path, dokumentNr };
}
