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

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;

const ACCENT = rgb(0.1, 0.24, 0.17);
const TEXT = rgb(0.07, 0.07, 0.07);
const MUTED = rgb(0.42, 0.45, 0.44);
const LINE = rgb(0.82, 0.84, 0.82);
const SOFT = rgb(0.95, 0.96, 0.95);

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

function phaseKicker(phase: VersicherungPdfPhase): string {
  return phase === "meldung" ? "SCHADENMELDUNG" : "SCHADENURSACHE / BEFUND";
}

function phaseTitle(phase: VersicherungPdfPhase): string {
  return phase === "meldung"
    ? "Schadenmeldung zur Versicherung"
    : "Schadenursache und Befund";
}

type DrawCtx = {
  pdf: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  fontBold: PDFFont;
  y: number;
  schadenNr: string;
  orgName: string;
  erstelltAm: string;
};

function drawFooter(ctx: DrawCtx) {
  ctx.page.drawLine({
    start: { x: MARGIN, y: 52 },
    end: { x: PAGE_W - MARGIN, y: 52 },
    thickness: 0.5,
    color: LINE,
  });
  const left = `${ctx.orgName} · Erstellt ${ctx.erstelltAm}`;
  ctx.page.drawText(left.slice(0, 70), {
    x: MARGIN,
    y: 38,
    size: 8,
    font: ctx.font,
    color: MUTED,
  });
  const right = `Schaden-Nr. ${ctx.schadenNr}`;
  const rw = ctx.font.widthOfTextAtSize(right, 8);
  ctx.page.drawText(right, {
    x: PAGE_W - MARGIN - rw,
    y: 38,
    size: 8,
    font: ctx.font,
    color: MUTED,
  });
}

function ensureSpace(ctx: DrawCtx, need: number) {
  if (ctx.y < need) {
    drawFooter(ctx);
    ctx.page = ctx.pdf.addPage([PAGE_W, PAGE_H]);
    ctx.y = PAGE_H - 56;
  }
}

function drawText(
  ctx: DrawCtx,
  text: string,
  opts?: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb>; x?: number }
) {
  const size = opts?.size ?? 10;
  ensureSpace(ctx, size + 28);
  ctx.page.drawText(text.slice(0, 110), {
    x: opts?.x ?? MARGIN,
    y: ctx.y,
    size,
    font: opts?.bold ? ctx.fontBold : ctx.font,
    color: opts?.color ?? MUTED,
  });
  ctx.y -= size + 5;
}

function drawWrapped(
  ctx: DrawCtx,
  text: string,
  opts?: { bold?: boolean; size?: number; max?: number; color?: ReturnType<typeof rgb> }
) {
  const size = opts?.size ?? 10;
  for (const ln of wrapText(text, opts?.max ?? 88)) {
    drawText(ctx, ln, {
      bold: opts?.bold,
      size,
      color: opts?.color ?? TEXT,
    });
  }
}

function drawHr(ctx: DrawCtx, accent = false) {
  ensureSpace(ctx, 20);
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y + 4 },
    end: { x: PAGE_W - MARGIN, y: ctx.y + 4 },
    thickness: accent ? 1.5 : 0.6,
    color: accent ? ACCENT : LINE,
  });
  ctx.y -= 14;
}

function drawSection(ctx: DrawCtx, n: number, title: string) {
  ensureSpace(ctx, 36);
  ctx.y -= 4;
  drawText(ctx, `${n}. ${title}`, {
    bold: true,
    size: 11,
    color: ACCENT,
  });
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y + 8 },
    end: { x: PAGE_W - MARGIN, y: ctx.y + 8 },
    thickness: 1.2,
    color: ACCENT,
  });
  ctx.y -= 6;
}

function drawMetaBar(
  ctx: DrawCtx,
  cells: Array<{ label: string; value: string }>
) {
  const usable = cells.filter((c) => c.value.trim());
  if (!usable.length) return;

  const rowH = 36;
  ensureSpace(ctx, rowH + 16);
  const top = ctx.y + 4;
  const bottom = top - rowH;

  ctx.page.drawRectangle({
    x: MARGIN,
    y: bottom,
    width: CONTENT_W,
    height: rowH,
    color: SOFT,
    borderColor: LINE,
    borderWidth: 0.6,
  });

  const colW = CONTENT_W / usable.length;
  usable.forEach((c, i) => {
    const x = MARGIN + i * colW + 10;
    if (i > 0) {
      ctx.page.drawLine({
        start: { x: MARGIN + i * colW, y: bottom + 6 },
        end: { x: MARGIN + i * colW, y: top - 6 },
        thickness: 0.5,
        color: LINE,
      });
    }
    ctx.page.drawText(c.label.toUpperCase().slice(0, 22), {
      x,
      y: top - 14,
      size: 7,
      font: ctx.font,
      color: MUTED,
    });
    ctx.page.drawText(c.value.slice(0, 28), {
      x,
      y: top - 28,
      size: 9.5,
      font: ctx.fontBold,
      color: TEXT,
    });
  });

  ctx.y = bottom - 14;
}

/**
 * Teil-PDF Versicherung — Briefkopf HV + Meta-Leiste + nummerierte Abschnitte
 * (ohne Plattform-Branding, White-Label der Hausverwaltung).
 */
export async function generateVersicherungsTeilPdf(
  input: VersicherungsTeilPdfInput
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const schadenNr =
    input.schadenNr?.trim() ||
    input.versicherungsNr?.trim() ||
    "ohne Nr.";
  const erstelltAm = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const orgName = input.absender.name?.trim() || "Hausverwaltung";

  const ctx: DrawCtx = {
    pdf,
    page: pdf.addPage([PAGE_W, PAGE_H]),
    font,
    fontBold,
    y: PAGE_H - 56,
    schadenNr,
    orgName,
    erstelltAm,
  };

  // —— Absender (White-Label HV) ——
  drawText(ctx, orgName, { bold: true, size: 12, color: ACCENT });
  for (const z of input.absender.zeilen ?? []) {
    if (z.trim()) drawText(ctx, z.trim(), { size: 9, color: MUTED });
  }
  const kontakt = [
    input.absender.telefon?.trim()
      ? `Tel. ${input.absender.telefon.trim()}`
      : null,
    input.absender.email?.trim() || null,
  ]
    .filter(Boolean)
    .join(" · ");
  if (kontakt) drawText(ctx, kontakt, { size: 9, color: MUTED });

  ctx.y -= 4;
  drawHr(ctx, true);

  // —— Dokumenttitel ——
  drawText(ctx, phaseKicker(input.phase), {
    bold: true,
    size: 8,
    color: MUTED,
  });
  ctx.y += 2;
  drawText(ctx, phaseTitle(input.phase), {
    bold: true,
    size: 16,
    color: ACCENT,
  });
  ctx.y -= 2;

  drawText(ctx, input.objektTitel, { bold: true, size: 11, color: TEXT });
  if (input.objektAdresse?.trim()) {
    drawText(ctx, input.objektAdresse.trim(), { size: 10, color: MUTED });
  }

  ctx.y -= 2;
  drawMetaBar(ctx, [
    { label: "Policen-Nr.", value: input.versicherungsNr?.trim() || "—" },
    { label: "Schaden-Nr.", value: schadenNr },
    { label: "Schadendatum", value: fmtDatum(input.schadendatum) },
  ]);

  if (input.melderZeile?.trim()) {
    drawText(ctx, `Melder: ${input.melderZeile.trim()}`, {
      size: 10,
      color: MUTED,
    });
    ctx.y -= 2;
  }

  let section = 1;

  if (input.phase === "meldung") {
    drawSection(ctx, section++, "Schadenhergang");
    const hergang = input.hergang?.trim();
    if (hergang) drawWrapped(ctx, hergang, { size: 10 });
    else
      drawText(ctx, "Keine Hergangsbeschreibung hinterlegt.", {
        size: 10,
        color: MUTED,
      });

    if (input.fotoHinweis?.trim()) {
      drawSection(ctx, section++, "Anlagen / Fotos");
      drawWrapped(ctx, input.fotoHinweis.trim(), { size: 10 });
    }
  } else {
    const befund = input.befundZeilen ?? [];
    drawSection(ctx, section++, "Befund / Ursachenfindung");
    if (befund.length === 0) {
      drawText(ctx, "Noch kein Befund hinterlegt.", {
        size: 10,
        color: MUTED,
      });
    } else {
      for (const b of befund) {
        ensureSpace(ctx, 48);
        drawText(ctx, `${fmtDatum(b.datum)} — ${b.titel}`, {
          bold: true,
          size: 10,
          color: ACCENT,
        });
        if (b.text.trim()) drawWrapped(ctx, b.text, { size: 10 });
        drawText(
          ctx,
          b.fotoCount > 0
            ? `${b.fotoCount} Foto${b.fotoCount === 1 ? "" : "s"} zum Befund dokumentiert.`
            : "Keine Fotos zum Befund.",
          { size: 9, color: MUTED }
        );
        ctx.y -= 4;
      }
    }

    const chrono = input.chronologie ?? [];
    if (chrono.length > 0) {
      drawSection(ctx, section++, "Chronologie vor Ort");
      for (const c of chrono) {
        drawWrapped(ctx, `${fmtDatum(c.datum)} — ${c.text}`, { size: 10 });
      }
    }
  }

  drawFooter(ctx);
  return pdf.save();
}

/** @deprecated Alias — alte Mega-Akte; nutzt Phase Meldung + leere Ursache-Felder. */
export async function generateVersicherungsaktePdf(input: {
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
}): Promise<Uint8Array> {
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
