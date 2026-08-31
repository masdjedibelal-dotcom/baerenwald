import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import type { VersicherungPdfPhase } from "@/lib/org/versicherung-pdf-readiness";

export type VersicherungsTeilPdfAbsender = {
  name: string;
  zeilen?: string[];
  telefon?: string | null;
  email?: string | null;
};

export type VersicherungsTeilPdfInput = {
  phase: VersicherungPdfPhase;
  absender: VersicherungsTeilPdfAbsender;
  objektTitel: string;
  objektAdresse?: string;
  versicherungsNr?: string | null;
  schadenNr?: string | null;
  schadendatum?: string | null;
  /** Freitext Hergang / Melder */
  hergang?: string | null;
  melderZeile?: string | null;
  chronologie?: Array<{ datum: string; text: string }>;
  befundZeilen?: Array<{
    datum: string;
    titel: string;
    text: string;
    fotoCount: number;
  }>;
  fotoHinweis?: string | null;
};

const green = rgb(0.1, 0.24, 0.17);
const gray = rgb(0.35, 0.42, 0.39);
const line = rgb(0.82, 0.84, 0.82);
const margin = 48;
const pageW = 595;
const pageH = 842;

function fmtDatum(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [];
}

function phaseTitle(phase: VersicherungPdfPhase): string {
  return phase === "meldung"
    ? "Schadenmeldung zur Versicherung"
    : "Schadenursache / Befund";
}

/**
 * Teil-PDF Versicherung — Briefkopf + Meta + Phaseninhalt (ohne Platzhalter-Kapitel).
 */
export async function generateVersicherungsTeilPdf(
  input: VersicherungsTeilPdfInput
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([pageW, pageH]);
  let y = 790;
  const schadenNr =
    input.schadenNr?.trim() ||
    input.versicherungsNr?.trim() ||
    "ohne Nr.";
  const erstelltAm = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const ensureSpace = (need: number) => {
    if (y < need) {
      drawFooter(page, font, schadenNr, erstelltAm);
      page = pdf.addPage([pageW, pageH]);
      y = 790;
    }
  };

  const drawText = (
    text: string,
    opts?: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb> }
  ) => {
    const size = opts?.size ?? 10;
    ensureSpace(size + 24);
    page.drawText(text.slice(0, 110), {
      x: margin,
      y,
      size,
      font: opts?.bold ? fontBold : font,
      color: opts?.color ?? gray,
    });
    y -= size + 5;
  };

  const drawWrapped = (
    text: string,
    opts?: { bold?: boolean; size?: number; max?: number }
  ) => {
    const size = opts?.size ?? 10;
    for (const ln of wrapText(text, opts?.max ?? 88)) {
      drawText(ln, { bold: opts?.bold, size });
    }
  };

  const hr = () => {
    ensureSpace(20);
    page.drawLine({
      start: { x: margin, y: y + 4 },
      end: { x: pageW - margin, y: y + 4 },
      thickness: 0.6,
      color: line,
    });
    y -= 12;
  };

  // —— Absender ——
  drawText(input.absender.name || "Hausverwaltung", {
    bold: true,
    size: 12,
    color: green,
  });
  for (const z of input.absender.zeilen ?? []) {
    if (z.trim()) drawText(z.trim(), { size: 9 });
  }
  const kontakt = [
    input.absender.telefon?.trim() ? `Tel. ${input.absender.telefon.trim()}` : null,
    input.absender.email?.trim() || null,
  ]
    .filter(Boolean)
    .join(" · ");
  if (kontakt) drawText(kontakt, { size: 9 });

  y -= 6;
  hr();

  // —— Titel ——
  drawText(phaseTitle(input.phase), { bold: true, size: 16, color: green });
  y -= 4;

  // —— Meta ——
  drawText(input.objektTitel, { bold: true, size: 11, color: green });
  if (input.objektAdresse?.trim()) {
    drawText(input.objektAdresse.trim(), { size: 10 });
  }
  y -= 4;
  const meta: Array<[string, string]> = [
    ["Policen-Nr.", input.versicherungsNr?.trim() || "—"],
    ["Schaden-Nr.", schadenNr],
    ["Schadendatum", fmtDatum(input.schadendatum)],
  ];
  for (const [k, v] of meta) {
    drawText(`${k}: ${v}`, { size: 10 });
  }
  if (input.melderZeile?.trim()) {
    drawText(`Melder: ${input.melderZeile.trim()}`, { size: 10 });
  }

  y -= 4;
  hr();

  if (input.phase === "meldung") {
    drawText("Schadenhergang", { bold: true, size: 12, color: green });
    y -= 2;
    const hergang = input.hergang?.trim();
    if (hergang) drawWrapped(hergang, { size: 10 });
    else drawText("Keine Hergangsbeschreibung hinterlegt.", { size: 10 });

    if (input.fotoHinweis?.trim()) {
      y -= 6;
      drawText("Anlagen / Fotos", { bold: true, size: 12, color: green });
      y -= 2;
      drawWrapped(input.fotoHinweis.trim(), { size: 10 });
    }
  } else {
    const befund = input.befundZeilen ?? [];
    if (befund.length > 0) {
      drawText("Befund / Ursachenfindung", { bold: true, size: 12, color: green });
      y -= 2;
      for (const b of befund) {
        drawText(`${fmtDatum(b.datum)} — ${b.titel}`, {
          bold: true,
          size: 10,
          color: green,
        });
        if (b.text.trim()) drawWrapped(b.text, { size: 10 });
        if (b.fotoCount > 0) {
          drawText(
            `${b.fotoCount} Foto${b.fotoCount === 1 ? "" : "s"} zum Befund dokumentiert.`,
            { size: 9 }
          );
        }
        y -= 4;
      }
    }

    const chrono = input.chronologie ?? [];
    if (chrono.length > 0) {
      y -= 2;
      drawText("Chronologie vor Ort", { bold: true, size: 12, color: green });
      y -= 2;
      for (const c of chrono) {
        drawWrapped(`${fmtDatum(c.datum)} — ${c.text}`, { size: 10 });
      }
    }
  }

  drawFooter(page, font, schadenNr, erstelltAm);
  return pdf.save();
}

function drawFooter(
  page: PDFPage,
  font: PDFFont,
  schadenNr: string,
  erstelltAm: string
) {
  page.drawText(`Erstellt ${erstelltAm} · Bärenwald Verwaltungs-Plattform`, {
    x: margin,
    y: 40,
    size: 8,
    font,
    color: gray,
  });
  page.drawText(`Schaden-Nr. ${schadenNr}`, {
    x: pageW - margin - 120,
    y: 40,
    size: 8,
    font,
    color: gray,
  });
}

/** @deprecated Alias — alte Mega-Akte; nutzt Phase Meldung + leere Ursache-Felder. */
export async function generateVersicherungsaktePdf(
  input: {
    orgName: string;
    objektTitel: string;
    objektAdresse?: string;
    versicherungsNr?: string | null;
    schadenNr?: string | null;
    schadendatum?: string | null;
    hergang?: string | null;
    chronologie?: Array<{ datum: string; text: string }>;
    befundZeilen?: Array<{
      datum: string;
      titel: string;
      text: string;
      fotoCount: number;
    }>;
    kostentraegerLabel?: string | null;
    abnahmeHinweis?: string | null;
    rechnungHinweis?: string | null;
  }
): Promise<Uint8Array> {
  return generateVersicherungsTeilPdf({
    phase: "meldung",
    absender: { name: input.orgName },
    objektTitel: input.objektTitel,
    objektAdresse: input.objektAdresse,
    versicherungsNr: input.versicherungsNr,
    schadenNr: input.schadenNr,
    schadendatum: input.schadendatum,
    hergang: input.hergang,
  });
}
