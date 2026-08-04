import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import type { PartnerDocEmpfaenger } from "@/lib/partner/partner-doc-empfaenger";

export type PartnerDocPosition = {
  titel: string;
  beschreibung?: string | null;
  menge?: number | null;
  einheit?: string | null;
  netto: number;
  mwstSatz: number;
};

export type PartnerDocAbsender = {
  firma: string;
  inhaber?: string | null;
  strasse?: string | null;
  ort?: string | null;
  adresse?: string | null;
  telefon?: string | null;
  email?: string | null;
  steuernummer?: string | null;
  ustid?: string | null;
  handelsregister?: string | null;
  iban?: string | null;
  bic?: string | null;
  bank?: string | null;
  kleinunternehmer?: boolean;
};

export type PartnerAngebotPdfInput = {
  docArt: "angebot";
  absender: PartnerDocAbsender;
  empfaenger: PartnerDocEmpfaenger;
  dokumentNr: string;
  datum: string;
  betreff: string;
  objektOrt?: string | null;
  positionen: PartnerDocPosition[];
  logoBytes?: Uint8Array | null;
  gueltigTage?: number;
};

export type PartnerRechnungPdfInput = {
  docArt: "rechnung";
  absender: PartnerDocAbsender;
  empfaenger: PartnerDocEmpfaenger;
  dokumentNr: string;
  datum: string;
  betreff: string;
  objektOrt?: string | null;
  leistungsZeitraum?: string | null;
  auftragsRef?: string | null;
  positionen: PartnerDocPosition[];
  logoBytes?: Uint8Array | null;
  abnahmeHinweis?: string | null;
};

function fmtEur(n: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

function fmtDatum(iso: string): string {
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxChars) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function absenderAdresse(a: PartnerDocAbsender): string {
  if (a.strasse?.trim() && a.ort?.trim()) {
    return `${a.strasse.trim()}, ${a.ort.trim()}`;
  }
  return a.adresse?.trim() || "";
}

async function embedLogo(
  pdf: PDFDocument,
  bytes?: Uint8Array | null
): Promise<{ width: number; height: number; draw: (page: PDFPage, x: number, y: number) => void } | null> {
  if (!bytes?.length) return null;
  try {
    const img = await pdf.embedPng(bytes).catch(() => pdf.embedJpg(bytes));
    const max = 56;
    const scale = Math.min(max / img.width, max / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    return {
      width: w,
      height: h,
      draw: (page, x, y) => page.drawImage(img, { x, y, width: w, height: h }),
    };
  } catch {
    return null;
  }
}

type DrawCtx = {
  pdf: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  fontBold: PDFFont;
  y: number;
  margin: number;
};

function ensureSpace(ctx: DrawCtx, need: number) {
  if (ctx.y < need) {
    ctx.page = ctx.pdf.addPage([595, 842]);
    ctx.y = 780;
  }
}

function drawText(
  ctx: DrawCtx,
  text: string,
  opts?: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb>; x?: number }
) {
  const size = opts?.size ?? 10;
  ensureSpace(ctx, size + 8);
  ctx.page.drawText(text, {
    x: opts?.x ?? ctx.margin,
    y: ctx.y,
    size,
    font: opts?.bold ? ctx.fontBold : ctx.font,
    color: opts?.color ?? rgb(0.25, 0.3, 0.28),
  });
  ctx.y -= size + 5;
}

/** Gemeinsames Partner-Dokument (Angebot | Rechnung). */
export async function generatePartnerDokumentPdf(
  input: PartnerAngebotPdfInput | PartnerRechnungPdfInput
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const green = rgb(0.1, 0.24, 0.17);
  const gray = rgb(0.35, 0.42, 0.39);
  const margin = 48;
  const ctx: DrawCtx = { pdf, page, font, fontBold, y: 780, margin };

  const logo = await embedLogo(pdf, input.logoBytes);
  if (logo) {
    logo.draw(ctx.page, 595 - margin - logo.width, ctx.y - logo.height + 12);
  }

  const a = input.absender;
  drawText(ctx, a.firma || "Handwerksbetrieb", { bold: true, size: 14, color: green });
  const adr = absenderAdresse(a);
  if (adr) drawText(ctx, adr, { size: 9 });
  if (a.inhaber?.trim()) drawText(ctx, `Inhaber: ${a.inhaber.trim()}`, { size: 9 });
  if (a.telefon?.trim()) drawText(ctx, `Tel. ${a.telefon.trim()}`, { size: 9 });
  if (a.email?.trim()) drawText(ctx, a.email.trim(), { size: 9 });
  ctx.y -= 8;

  const isRechnung = input.docArt === "rechnung";
  drawText(ctx, isRechnung ? "RECHNUNG" : "ANGEBOT", {
    bold: true,
    size: 16,
    color: green,
  });
  drawText(ctx, `${isRechnung ? "Rechnungsnr." : "Angebotsnr."}: ${input.dokumentNr}`, {
    bold: true,
    size: 11,
  });
  drawText(ctx, `Datum: ${fmtDatum(input.datum)}`, { size: 10 });
  if (isRechnung && input.leistungsZeitraum) {
    drawText(ctx, `Leistungszeitraum: ${input.leistungsZeitraum}`, { size: 10 });
  }
  if (isRechnung && input.auftragsRef) {
    drawText(ctx, `Auftragsreferenz: ${input.auftragsRef}`, { size: 10 });
  }
  if (!isRechnung && input.gueltigTage) {
    drawText(ctx, `Gültig ${input.gueltigTage} Tage ab Datum`, { size: 10 });
  }
  ctx.y -= 6;

  drawText(ctx, "Empfänger", { bold: true, size: 10, color: green });
  const e = input.empfaenger;
  drawText(ctx, e.firma, { size: 10 });
  drawText(ctx, e.strasse, { size: 9 });
  drawText(ctx, e.plzOrt, { size: 9 });
  ctx.y -= 6;

  drawText(ctx, `Betreff: ${input.betreff}`, { bold: true, size: 11 });
  if (input.objektOrt?.trim()) {
    drawText(ctx, `Objekt / Ort: ${input.objektOrt.trim()}`, { size: 10 });
  }
  ctx.y -= 10;

  // Tabellenkopf
  ensureSpace(ctx, 40);
  ctx.page.drawText("Pos.", { x: margin, y: ctx.y, size: 9, font: fontBold, color: green });
  ctx.page.drawText("Leistung", { x: margin + 28, y: ctx.y, size: 9, font: fontBold, color: green });
  ctx.page.drawText("Netto", { x: 480, y: ctx.y, size: 9, font: fontBold, color: green });
  ctx.y -= 14;

  let nettoSum = 0;
  let mwstSum = 0;
  const ku = Boolean(a.kleinunternehmer);

  input.positionen.forEach((p, i) => {
    ensureSpace(ctx, 36);
    const netto = Number.isFinite(p.netto) ? p.netto : 0;
    const mwstSatz = ku ? 0 : p.mwstSatz || 19;
    nettoSum += netto;
    mwstSum += (netto * mwstSatz) / 100;

    ctx.page.drawText(String(i + 1), {
      x: margin,
      y: ctx.y,
      size: 9,
      font,
      color: gray,
    });
    const titleLines = wrapText(p.titel || "Leistung", 62);
    titleLines.forEach((line, li) => {
      ctx.page.drawText(line, {
        x: margin + 28,
        y: ctx.y - li * 11,
        size: 9,
        font,
        color: gray,
      });
    });
    ctx.page.drawText(fmtEur(netto), {
      x: 470,
      y: ctx.y,
      size: 9,
      font,
      color: gray,
    });
    ctx.y -= Math.max(16, titleLines.length * 11 + 4);
    if (p.beschreibung?.trim()) {
      for (const line of wrapText(p.beschreibung.trim(), 70)) {
        ensureSpace(ctx, 14);
        ctx.page.drawText(line, {
          x: margin + 28,
          y: ctx.y,
          size: 8,
          font,
          color: rgb(0.45, 0.5, 0.48),
        });
        ctx.y -= 11;
      }
    }
  });

  ctx.y -= 8;
  ensureSpace(ctx, 80);
  drawText(ctx, `Summe netto: ${fmtEur(nettoSum)}`, { bold: true, size: 11 });
  if (ku) {
    drawText(ctx, "MwSt.: 0,00 € (Kleinunternehmer §19 UStG)", { size: 10 });
    drawText(ctx, `Gesamt: ${fmtEur(nettoSum)}`, { bold: true, size: 12, color: green });
  } else {
    drawText(ctx, `MwSt.: ${fmtEur(mwstSum)}`, { size: 10 });
    drawText(ctx, `Brutto: ${fmtEur(nettoSum + mwstSum)}`, {
      bold: true,
      size: 12,
      color: green,
    });
  }

  if (isRechnung) {
    ctx.y -= 10;
    drawText(ctx, "Zahlungsinformationen", { bold: true, size: 10, color: green });
    if (a.iban?.trim()) drawText(ctx, `IBAN: ${a.iban.trim()}`, { size: 10 });
    if (a.bic?.trim()) drawText(ctx, `BIC: ${a.bic.trim()}`, { size: 9 });
    if (a.bank?.trim()) drawText(ctx, `Bank: ${a.bank.trim()}`, { size: 9 });
    drawText(ctx, `Verwendungszweck: ${input.dokumentNr}`, { size: 9 });
    if (input.abnahmeHinweis?.trim()) {
      ctx.y -= 4;
      drawText(ctx, input.abnahmeHinweis.trim(), { size: 8 });
    }
  }

  ctx.y -= 16;
  const fuss: string[] = [];
  if (a.steuernummer?.trim()) fuss.push(`Steuernr.: ${a.steuernummer.trim()}`);
  if (a.ustid?.trim()) fuss.push(`USt-IdNr.: ${a.ustid.trim()}`);
  if (a.handelsregister?.trim()) fuss.push(`HR: ${a.handelsregister.trim()}`);
  if (ku) {
    fuss.push(
      "Gemäß §19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung)."
    );
  }
  for (const line of fuss) {
    drawText(ctx, line, { size: 8 });
  }

  return pdf.save();
}

export function sumPartnerDocNetto(positionen: PartnerDocPosition[]): number {
  return positionen.reduce((s, p) => s + (Number.isFinite(p.netto) ? p.netto : 0), 0);
}

export function formatPartnerRechnungsNr(year: number, seq: number): string {
  return `${year}-${String(seq).padStart(4, "0")}`;
}

export function formatPartnerAngebotsNr(prefix: string, isoDate: string): string {
  const d = isoDate.slice(0, 10).replace(/-/g, "");
  const short = prefix.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase() || "HW";
  return `A-${short}-${d}`;
}
