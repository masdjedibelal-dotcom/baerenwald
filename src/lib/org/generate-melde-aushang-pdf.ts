import {
  PDFDocument,
  StandardFonts,
  clip,
  endPath,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  type RGB,
} from "pdf-lib";

import {
  AUSHANG_BADGE,
  AUSHANG_FOOTER_CONTACT,
  AUSHANG_FOOTER_DATENSCHUTZ,
  AUSHANG_FOOTER_NO_PHONE,
  AUSHANG_HERO_BODY,
  AUSHANG_HERO_LINE1,
  AUSHANG_HERO_LINE2,
  AUSHANG_PHOTO_HINT,
  AUSHANG_SCAN_LABEL,
  AUSHANG_STEPS,
  AUSHANG_STEPS_TITLE,
  AUSHANG_TAGLINE,
} from "@/lib/portal2/aushang";

export type MeldeAushangInput = {
  orgName: string;
  orgSub?: string | null;
  logoKuerzel?: string | null;
  /** Portal-Primärfarbe (Header/Footer/Akzente) */
  primaryColor?: string | null;
  /** Portal-Softfarbe (dezente Akzente) */
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
  if (!Number.isFinite(n)) return rgb(0.133, 0.314, 0.549); // #22508C
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function lighten(c: RGB, amount: number): RGB {
  return rgb(
    Math.min(1, c.red + (1 - c.red) * amount),
    Math.min(1, c.green + (1 - c.green) * amount),
    Math.min(1, c.blue + (1 - c.blue) * amount)
  );
}

function spacedCaps(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split("")
    .join(" ")
    .replace(/  +/g, " ");
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
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
  try {
    return await pdf.embedPng(bytes);
  } catch {
    try {
      return await pdf.embedJpg(bytes);
    } catch {
      return null;
    }
  }
}

/**
 * Aushang-PDF nach Konzept „Details vereinheitlichen“.
 * Dichtes Layout: große Headline, kompakter Hero, großer scannbarer QR.
 */
export async function generateMeldeAushangPdf(
  input: MeldeAushangInput
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await pdf.embedFont(StandardFonts.TimesRomanBoldItalic);

  const pageW = 595;
  const pageH = 842;
  const margin = 36;
  const contentW = pageW - margin * 2;

  const primary = hexToRgb(input.primaryColor?.trim() || "#22508C");
  const soft = input.primaryColorSoft?.trim()
    ? hexToRgb(input.primaryColorSoft)
    : lighten(primary, 0.88);
  const paper = rgb(0.965, 0.955, 0.93);
  const ink = rgb(0.1, 0.12, 0.14);
  const muted = rgb(0.32, 0.34, 0.36);
  const white = rgb(1, 1, 1);
  const labelAccent = rgb(0.92, 0.62, 0.28);
  const hairline = soft;

  const logo = (input.logoKuerzel?.trim() || input.orgName.trim().charAt(0) || "HV")
    .slice(0, 2)
    .toUpperCase();

  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageW,
    height: pageH,
    color: paper,
  });

  // —— Header ——
  const headerH = 52;
  page.drawRectangle({
    x: 0,
    y: pageH - headerH,
    width: pageW,
    height: headerH,
    color: primary,
  });

  const markSize = 32;
  const markX = margin;
  const markY = pageH - headerH + (headerH - markSize) / 2;
  page.drawRectangle({
    x: markX,
    y: markY,
    width: markSize,
    height: markSize,
    color: white,
  });

  const logoImg = await embedImage(pdf, input.logoImageBytes);
  if (logoImg) {
    const pad = 3;
    const max = markSize - pad * 2;
    const scale = Math.min(max / logoImg.width, max / logoImg.height);
    const lw = logoImg.width * scale;
    const lh = logoImg.height * scale;
    page.drawImage(logoImg, {
      x: markX + (markSize - lw) / 2,
      y: markY + (markSize - lh) / 2,
      width: lw,
      height: lh,
    });
  } else {
    page.drawText(logo, {
      x: markX + (markSize - fontBold.widthOfTextAtSize(logo, 13)) / 2,
      y: markY + 9,
      size: 13,
      font: fontBold,
      color: primary,
    });
  }

  const nameX = markX + markSize + 12;
  const nameMaxW = contentW - markSize - 150;
  const nameLines = wrapText(input.orgName, serifBold, 16, nameMaxW);
  let nameY = pageH - headerH + (nameLines.length > 1 ? 32 : 20);
  for (const line of nameLines.slice(0, 2)) {
    page.drawText(line, {
      x: nameX,
      y: nameY,
      size: 16,
      font: serifBold,
      color: white,
    });
    nameY -= 16;
  }

  const badge = spacedCaps(AUSHANG_BADGE);
  const badgeSize = 8.5;
  const badgeW = font.widthOfTextAtSize(badge, badgeSize);
  page.drawText(badge, {
    x: pageW - margin - badgeW,
    y: pageH - headerH + 21,
    size: badgeSize,
    font,
    color: lighten(primary, 0.55),
  });

  // —— Hero (große Schrift wie Mock, wenig Luft) ——
  let y = pageH - headerH - 22;
  page.drawText(AUSHANG_HERO_LINE1, {
    x: margin,
    y,
    size: 42,
    font: serifBold,
    color: ink,
  });
  y -= 44;
  page.drawText(AUSHANG_HERO_LINE2, {
    x: margin,
    y,
    size: 42,
    font: serifItalic,
    color: primary,
  });
  y -= 20;
  y = drawWrapped(
    page,
    AUSHANG_HERO_BODY,
    margin,
    y,
    font,
    14.5,
    muted,
    contentW,
    1.28
  );
  y -= 10;

  // —— Foto kompakt (Platz → Schrift + QR) ——
  const photoH = 86;
  const photoY = y - photoH;
  const heroImg = await embedImage(pdf, input.heroImageBytes);
  page.drawRectangle({
    x: margin,
    y: photoY,
    width: contentW,
    height: photoH,
    color: rgb(0.88, 0.88, 0.86),
  });
  if (heroImg) {
    const scale = Math.max(contentW / heroImg.width, photoH / heroImg.height);
    const iw = heroImg.width * scale;
    const ih = heroImg.height * scale;
    page.pushOperators(
      pushGraphicsState(),
      rectangle(margin, photoY, contentW, photoH),
      clip(),
      endPath()
    );
    page.drawImage(heroImg, {
      x: margin + (contentW - iw) / 2,
      y: photoY + (photoH - ih) / 2,
      width: iw,
      height: ih,
    });
    page.pushOperators(popGraphicsState());
  } else {
    drawDashedRect(page, margin, photoY, contentW, photoH, lighten(primary, 0.5));
    const hint = AUSHANG_PHOTO_HINT;
    page.drawText(hint, {
      x: margin + (contentW - font.widthOfTextAtSize(hint, 11)) / 2,
      y: photoY + photoH / 2 - 4,
      size: 11,
      font,
      color: muted,
    });
  }

  const tag = spacedCaps(AUSHANG_TAGLINE);
  const tagSize = 8;
  const tagPadX = 10;
  const tagW = Math.min(
    fontBold.widthOfTextAtSize(tag, tagSize) + tagPadX * 2,
    contentW * 0.8
  );
  const tagH = 18;
  page.drawRectangle({
    x: margin,
    y: photoY,
    width: tagW,
    height: tagH,
    color: primary,
  });
  page.drawText(tag, {
    x: margin + tagPadX,
    y: photoY + 5,
    size: tagSize,
    font: fontBold,
    color: white,
  });

  y = photoY - 14;

  // —— Zwei Spalten: großer QR | Schritte ——
  const colGap = 18;
  const leftW = 248;
  const rightX = margin + leftW + colGap;
  const rightW = contentW - leftW - colGap;

  const qrBox = 218;
  const qrFrame = 8;
  const qrOuter = qrBox + qrFrame * 2;
  const qrOuterX = margin + (leftW - qrOuter) / 2;
  const qrOuterY = y - qrOuter;

  // Weißer Außenrand (Quiet Zone) — kein farbiger Rahmen am Code selbst
  page.drawRectangle({
    x: qrOuterX,
    y: qrOuterY,
    width: qrOuter,
    height: qrOuter,
    color: white,
  });
  page.drawRectangle({
    x: qrOuterX + 1.2,
    y: qrOuterY + 1.2,
    width: qrOuter - 2.4,
    height: qrOuter - 2.4,
    borderColor: primary,
    borderWidth: 1.8,
    color: white,
  });

  if (input.qrPngBytes?.length) {
    try {
      const qr = await pdf.embedPng(input.qrPngBytes);
      page.drawImage(qr, {
        x: qrOuterX + qrFrame,
        y: qrOuterY + qrFrame,
        width: qrBox,
        height: qrBox,
      });
    } catch {
      /* QR optional */
    }
  } else {
    const missing = "QR fehlt";
    page.drawText(missing, {
      x: qrOuterX + (qrOuter - font.widthOfTextAtSize(missing, 11)) / 2,
      y: qrOuterY + qrOuter / 2 - 4,
      size: 11,
      font,
      color: muted,
    });
  }

  let leftY = qrOuterY - 12;
  const scanLabel = spacedCaps(AUSHANG_SCAN_LABEL);
  const scanSize = 8.5;
  const scanLines = wrapText(scanLabel, fontBold, scanSize, leftW);
  for (const line of scanLines) {
    page.drawText(line, {
      x: margin + (leftW - fontBold.widthOfTextAtSize(line, scanSize)) / 2,
      y: leftY,
      size: scanSize,
      font: fontBold,
      color: muted,
    });
    leftY -= 11;
  }
  leftY -= 3;

  const displayUrl = input.meldeUrl.replace(/^https?:\/\//i, "");
  leftY = drawWrapped(
    page,
    displayUrl,
    margin,
    leftY,
    fontBold,
    11,
    primary,
    leftW,
    1.22
  );

  if (input.objektTitel?.trim()) {
    leftY -= 6;
    leftY = drawWrapped(
      page,
      input.objektTitel.trim(),
      margin,
      leftY,
      font,
      9.5,
      muted,
      leftW,
      1.25
    );
  }

  // Rechte Spalte: Schritte (größere Typo)
  let rightY = y;
  const stepsTitle = spacedCaps(AUSHANG_STEPS_TITLE);
  page.drawText(stepsTitle, {
    x: rightX,
    y: rightY,
    size: 11,
    font: fontBold,
    color: primary,
  });
  const titleW = fontBold.widthOfTextAtSize(stepsTitle, 11);
  page.drawLine({
    start: { x: rightX + titleW + 10, y: rightY + 3 },
    end: { x: rightX + rightW, y: rightY + 3 },
    thickness: 1.6,
    color: primary,
  });
  rightY -= 26;

  AUSHANG_STEPS.forEach((step, i) => {
    page.drawText(step.n, {
      x: rightX,
      y: rightY,
      size: 24,
      font: serifBold,
      color: primary,
    });
    page.drawText(step.title, {
      x: rightX + 40,
      y: rightY + 5,
      size: 16,
      font: fontBold,
      color: ink,
    });
    rightY -= 18;
    rightY = drawWrapped(
      page,
      step.detail,
      rightX + 40,
      rightY,
      font,
      12.5,
      muted,
      rightW - 40,
      1.28
    );
    rightY -= 6;
    if (i < AUSHANG_STEPS.length - 1) {
      page.drawLine({
        start: { x: rightX + 40, y: rightY + 4 },
        end: { x: rightX + rightW, y: rightY + 4 },
        thickness: 0.8,
        color: hairline,
      });
      rightY -= 10;
    }
  });

  // —— Footer ——
  const footerH = 88;
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageW,
    height: footerH,
    color: primary,
  });

  page.drawText(spacedCaps(AUSHANG_FOOTER_NO_PHONE), {
    x: margin,
    y: footerH - 22,
    size: 8.5,
    font: fontBold,
    color: labelAccent,
  });
  page.drawText(AUSHANG_FOOTER_CONTACT, {
    x: margin,
    y: footerH - 42,
    size: 15,
    font: serifBold,
    color: white,
  });

  const tel = input.hvTelefon?.trim();
  const mail = input.hvEmail?.trim();
  const contactBits = [tel ? `Tel. ${tel}` : null, mail || null].filter(
    Boolean
  ) as string[];
  if (contactBits.length) {
    page.drawText(contactBits.join("  ·  "), {
      x: margin,
      y: footerH - 60,
      size: 11.5,
      font,
      color: lighten(primary, 0.62),
    });
  }

  page.drawText(AUSHANG_FOOTER_DATENSCHUTZ, {
    x: margin,
    y: 16,
    size: 9,
    font,
    color: lighten(primary, 0.55),
  });

  return pdf.save();
}
