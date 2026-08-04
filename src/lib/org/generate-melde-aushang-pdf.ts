import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  type RGB,
} from "pdf-lib";

import {
  imageBytesToCoverPng,
  imageBytesToPng,
} from "@/lib/org/aushang-image-png";
import {
  AUSHANG_FOOTER_CONTACT,
  AUSHANG_FOOTER_DATENSCHUTZ,
  AUSHANG_FOOTER_NO_PHONE,
  AUSHANG_FOOTER_PARTNER,
  AUSHANG_HERO_BODY,
  AUSHANG_HERO_LINE1,
  AUSHANG_HERO_LINE2,
  AUSHANG_PHOTO_HINT,
  AUSHANG_SCAN_LABEL,
  AUSHANG_STEPS,
  AUSHANG_STEPS_TITLE,
} from "@/lib/portal2/aushang";

export type MeldeAushangInput = {
  orgName: string;
  orgSub?: string | null;
  logoKuerzel?: string | null;
  /** Portal-Primärfarbe (Akzente / Footer / „einfach scannen“) */
  primaryColor?: string | null;
  /** Portal-Softfarbe (dezente Linien) */
  primaryColorSoft?: string | null;
  objektTitel?: string;
  objektAdresse?: string;
  meldeUrl: string;
  qrPngBytes?: Uint8Array | null;
  logoImageBytes?: Uint8Array | null;
  heroImageBytes?: Uint8Array | null;
  hvTelefon?: string | null;
  hvEmail?: string | null;
};

/** StandardFonts = WinAnsi: problematische Unicode-Zeichen ersetzen. */
function pdfSafe(text: string): string {
  return text
    .replace(/\u2014|\u2013/g, "-") // em/en dash
    .replace(/\u2026/g, "...")
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/\u00A0/g, " ")
    .replace(/\u2022/g, "-")
    .replace(/\u2192|\u2193|\u25BC|\u25B2/g, "");
}

function hexToRgb(hex: string): RGB {
  const raw = hex.replace("#", "").trim();
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw.padStart(6, "0").slice(0, 6);
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n)) return rgb(0.18, 0.42, 0.31); // #2E6B4F
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function lighten(c: RGB, amount: number): RGB {
  return rgb(
    Math.min(1, c.red + (1 - c.red) * amount),
    Math.min(1, c.green + (1 - c.green) * amount),
    Math.min(1, c.blue + (1 - c.blue) * amount)
  );
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const words = pdfSafe(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function drawWrapped(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color: RGB,
  maxWidth: number,
  lineHeight = 1.3
): number {
  const lines = wrapText(text, font, size, maxWidth);
  let cy = y;
  for (const line of lines) {
    page.drawText(line, { x, y: cy, size, font, color });
    cy -= size * lineHeight;
  }
  return cy;
}

function drawTextSafe(
  page: PDFPage,
  text: string,
  opts: {
    x: number;
    y: number;
    size: number;
    font: PDFFont;
    color: RGB;
  }
) {
  page.drawText(pdfSafe(text), opts);
}

function drawDashedRect(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  color: RGB
) {
  const dash = 6;
  const gap = 4;
  const drawSegs = (x0: number, y0: number, x1: number, y1: number) => {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    let t = 0;
    let on = true;
    while (t < len) {
      const seg = Math.min(on ? dash : gap, len - t);
      if (on) {
        page.drawLine({
          start: { x: x0 + ux * t, y: y0 + uy * t },
          end: { x: x0 + ux * (t + seg), y: y0 + uy * (t + seg) },
          thickness: 1.2,
          color,
        });
      }
      t += seg;
      on = !on;
    }
  };
  drawSegs(x, y + h, x + w, y + h);
  drawSegs(x + w, y + h, x + w, y);
  drawSegs(x + w, y, x, y);
  drawSegs(x, y, x, y + h);
}

async function embedImage(
  pdf: PDFDocument,
  bytes: Uint8Array | null | undefined
): Promise<PDFImage | null> {
  if (!bytes?.length) return null;
  // WebP/andere Formate → PNG (pdf-lib kann nur PNG/JPEG)
  const png = await imageBytesToPng(bytes);
  const candidates = [png, bytes].filter(Boolean) as Uint8Array[];
  for (const b of candidates) {
    try {
      return await pdf.embedPng(b);
    } catch {
      try {
        return await pdf.embedJpg(b);
      } catch {
        /* next */
      }
    }
  }
  return null;
}

/**
 * Aushang-PDF: weißer Brand-Header → Banner → Headline → QR/Schritte → Footer.
 */
export async function generateMeldeAushangPdf(
  input: MeldeAushangInput
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);

  const pageW = 595;
  const pageH = 842;
  const margin = 45;
  const contentW = pageW - margin * 2;

  const primary = hexToRgb(input.primaryColor?.trim() || "#2E6B4F");
  const soft = input.primaryColorSoft?.trim()
    ? hexToRgb(input.primaryColorSoft)
    : lighten(primary, 0.88);
  const paper = rgb(0.98, 0.975, 0.965);
  const ink = rgb(0.1, 0.12, 0.14);
  const muted = rgb(0.35, 0.37, 0.39);
  const white = rgb(1, 1, 1);
  const hairline = soft;

  const logoLetters = (
    input.logoKuerzel?.trim() ||
    input.orgName.trim().charAt(0) ||
    "HV"
  )
    .slice(0, 2)
    .toUpperCase();

  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageW,
    height: pageH,
    color: paper,
  });

  // —— 1) Weißer Brand-Header ——
  const headerH = 72;
  const headerBottom = pageH - headerH;
  page.drawRectangle({
    x: 0,
    y: headerBottom,
    width: pageW,
    height: headerH,
    color: white,
  });
  page.drawLine({
    start: { x: 0, y: headerBottom },
    end: { x: pageW, y: headerBottom },
    thickness: 0.8,
    color: hairline,
  });

  const markSize = 40;
  const markX = margin;
  const markY = headerBottom + (headerH - markSize) / 2;

  const logoImg = await embedImage(pdf, input.logoImageBytes);
  if (logoImg) {
    const max = markSize;
    const scale = Math.min(max / logoImg.width, max / logoImg.height);
    const lw = logoImg.width * scale;
    const lh = logoImg.height * scale;
    page.drawImage(logoImg, {
      x: markX,
      y: markY + (markSize - lh) / 2,
      width: lw,
      height: lh,
    });
  } else {
    page.drawRectangle({
      x: markX,
      y: markY,
      width: markSize,
      height: markSize,
      color: primary,
    });
  page.drawText(logoLetters, {
      x: markX + (markSize - fontBold.widthOfTextAtSize(logoLetters, 14)) / 2,
      y: markY + 12,
      size: 14,
      font: fontBold,
      color: white,
    });
  }

  const nameX = markX + markSize + 14;
  const nameMaxW = contentW - markSize - 20;
  const nameLines = wrapText(input.orgName, fontBold, 16, nameMaxW).slice(0, 1);
  drawTextSafe(page, nameLines[0] || input.orgName, {
    x: nameX,
    y: markY + markSize / 2 - 5,
    size: 16,
    font: fontBold,
    color: ink,
  });

  // —— 2) Banner: Cover-Crop als PNG (kein PDF-clip — Chrome/PDFium-sicher) ——
  const photoH = 152;
  const photoY = headerBottom - photoH;
  page.drawRectangle({
    x: 0,
    y: photoY,
    width: pageW,
    height: photoH,
    color: rgb(0.9, 0.88, 0.84),
  });
  const heroCover = await imageBytesToCoverPng(
    input.heroImageBytes,
    Math.round(pageW * 2),
    Math.round(photoH * 2)
  );
  let heroDrawn = false;
  if (heroCover?.length) {
    try {
      const heroImg = await pdf.embedPng(heroCover);
      page.drawImage(heroImg, {
        x: 0,
        y: photoY,
        width: pageW,
        height: photoH,
      });
      heroDrawn = true;
    } catch {
      heroDrawn = false;
    }
  }
  if (!heroDrawn) {
    drawDashedRect(
      page,
      margin,
      photoY + 14,
      contentW,
      photoH - 28,
      lighten(primary, 0.45)
    );
    const hint = AUSHANG_PHOTO_HINT;
    drawTextSafe(page, hint, {
      x: margin + (contentW - font.widthOfTextAtSize(pdfSafe(hint), 10)) / 2,
      y: photoY + photoH / 2 - 3,
      size: 10,
      font,
      color: muted,
    });
  }

  // —— 3) Headline + Intro (Abstand zum Banner) ——
  let y = photoY - 48;
  const heroSize = 40;
  drawTextSafe(page, AUSHANG_HERO_LINE1, {
    x: margin,
    y,
    size: heroSize,
    font: serifBold,
    color: ink,
  });
  y -= 46;
  drawTextSafe(page, AUSHANG_HERO_LINE2, {
    x: margin,
    y,
    size: heroSize,
    font: serifBold,
    color: primary,
  });
  y -= 30;
  y = drawWrapped(
    page,
    AUSHANG_HERO_BODY,
    margin,
    y,
    font,
    14.5,
    muted,
    contentW,
    1.42
  );

  // —— 4) Zwei Spalten: QR und Schritte weiter unten ——
  const footerH = 68;
  const colTop = y - 44;
  const colBottom = footerH + 18;

  const colGap = 30;
  const leftW = 210;
  const rightX = margin + leftW + colGap;
  const rightW = contentW - leftW - colGap;

  // Sanfte Fläche hinter QR + Schritte
  page.drawRectangle({
    x: margin - 10,
    y: colBottom - 8,
    width: contentW + 20,
    height: colTop - colBottom + 20,
    color: rgb(0.995, 0.992, 0.985),
  });

  // QR: fest kleiner, oben bündig, zentriert in linker Spalte
  const scanLabel = AUSHANG_SCAN_LABEL;
  const scanSize = 9.5;
  const qrOuter = 168;
  const qrFrame = 10;
  const qrBox = qrOuter - qrFrame * 2;
  const qrOuterY = colTop - qrOuter;
  const qrOuterX = margin + (leftW - qrOuter) / 2;

  page.drawRectangle({
    x: qrOuterX,
    y: qrOuterY,
    width: qrOuter,
    height: qrOuter,
    color: primary,
  });
  page.drawRectangle({
    x: qrOuterX + qrFrame,
    y: qrOuterY + qrFrame,
    width: qrBox,
    height: qrBox,
    color: white,
  });

  if (input.qrPngBytes?.length) {
    try {
      const qr = await pdf.embedPng(input.qrPngBytes);
      const pad = 5;
      page.drawImage(qr, {
        x: qrOuterX + qrFrame + pad,
        y: qrOuterY + qrFrame + pad,
        width: qrBox - pad * 2,
        height: qrBox - pad * 2,
      });
    } catch {
      /* QR optional */
    }
  } else {
    const missing = "QR fehlt";
    drawTextSafe(page, missing, {
      x: qrOuterX + (qrOuter - font.widthOfTextAtSize(missing, 11)) / 2,
      y: qrOuterY + qrOuter / 2 - 4,
      size: 11,
      font,
      color: muted,
    });
  }

  const scanSafe = pdfSafe(scanLabel);
  drawTextSafe(page, scanSafe, {
    x: margin + (leftW - fontBold.widthOfTextAtSize(scanSafe, scanSize)) / 2,
    y: qrOuterY - 16,
    size: scanSize,
    font: fontBold,
    color: primary,
  });

  // Rechte Spalte: Oberkante optisch = QR-Oberkante (ohne Strich)
  const stepsTitleSize = 13;
  const titleAscent = stepsTitleSize * 0.72;
  let rightY = colTop - titleAscent;
  drawTextSafe(page, AUSHANG_STEPS_TITLE, {
    x: rightX,
    y: rightY,
    size: stepsTitleSize,
    font: fontBold,
    color: ink,
  });
  rightY -= 24;

  const stepTitleSize = 14;
  const stepDetailSize = 11;
  /** Fester Abstand zwischen Schritten — nicht über die Spalte strecken. */
  const gapBetweenSteps = 14;

  // Timeline-Schiene links
  const railX = rightX + 5;
  const textX = rightX + 22;
  const textW = rightW - 22;
  const dotR = 4.5;

  const titleYs: number[] = [];

  AUSHANG_STEPS.forEach((step, i) => {
    titleYs.push(rightY);
    const dotY = rightY + stepTitleSize * 0.28;

    page.drawCircle({
      x: railX,
      y: dotY,
      size: dotR,
      color: primary,
    });

    const numLabel = `${step.n}  ${step.title}`;
    drawTextSafe(page, numLabel, {
      x: textX,
      y: rightY,
      size: stepTitleSize,
      font: fontBold,
      color: primary,
    });
    rightY -= stepTitleSize + 5;
    rightY = drawWrapped(
      page,
      step.detail,
      textX,
      rightY,
      font,
      stepDetailSize,
      muted,
      textW,
      1.32
    );

    if (i < AUSHANG_STEPS.length - 1) {
      rightY -= gapBetweenSteps;
    }
  });

  // Verbindungslinien zwischen den Punkten (nach bekannter Titel-Höhe)
  for (let i = 0; i < titleYs.length - 1; i++) {
    const lineTop = titleYs[i]! + stepTitleSize * 0.28 - dotR - 1;
    const lineBottom = titleYs[i + 1]! + stepTitleSize * 0.28 + dotR + 1;
    if (lineTop > lineBottom) {
      page.drawLine({
        start: { x: railX, y: lineTop },
        end: { x: railX, y: lineBottom },
        thickness: 1.4,
        color: lighten(primary, 0.35),
      });
    }
  }

  // —— Footer ——
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageW,
    height: footerH,
    color: primary,
  });

  drawTextSafe(page, AUSHANG_FOOTER_NO_PHONE, {
    x: margin,
    y: footerH - 14,
    size: 8,
    font: fontBold,
    color: lighten(primary, 0.72),
  });

  const tel = input.hvTelefon?.trim();
  const mail = input.hvEmail?.trim();
  const contactBits = [
    AUSHANG_FOOTER_CONTACT,
    tel ? `Tel. ${tel}` : null,
    mail || null,
  ].filter(Boolean) as string[];
  drawTextSafe(page, contactBits.join("  ·  "), {
    x: margin,
    y: footerH - 28,
    size: 10.5,
    font: fontBold,
    color: white,
  });

  drawTextSafe(page, AUSHANG_FOOTER_PARTNER, {
    x: margin,
    y: footerH - 44,
    size: 8.5,
    font,
    color: lighten(primary, 0.68),
  });

  drawTextSafe(page, AUSHANG_FOOTER_DATENSCHUTZ, {
    x: margin,
    y: 10,
    size: 8,
    font,
    color: lighten(primary, 0.55),
  });

  // Object Streams aus: bessere Kompatibilität Chrome-Viewer vs. gespeicherte Datei
  return pdf.save({ useObjectStreams: false });
}
