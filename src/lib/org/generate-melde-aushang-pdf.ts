import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";

import { SITE_CONFIG } from "@/lib/config";
import {
  AUSHANG_BADGE,
  AUSHANG_FOOTER_DATENSCHUTZ,
  AUSHANG_FOOTER_NO_PHONE,
  AUSHANG_HERO_BODY,
  AUSHANG_HERO_LINE1,
  AUSHANG_HERO_LINE2,
  AUSHANG_OBJEKT_LABEL,
  AUSHANG_PILL_HINT,
  AUSHANG_PROCESSED_BY,
  AUSHANG_STEPS,
} from "@/lib/portal2/aushang";

export type MeldeAushangInput = {
  orgName: string;
  orgSub?: string | null;
  logoKuerzel?: string | null;
  primaryColor?: string;
  primaryColorSoft?: string | null;
  objektTitel?: string;
  objektAdresse?: string;
  meldeUrl: string;
  qrPngBytes?: Uint8Array | null;
  hvTelefon?: string;
  hvEmail?: string;
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
  if (!Number.isFinite(n)) return rgb(0.18, 0.49, 0.32);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
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
  lineHeight = 1.35
): number {
  const lines = wrapText(text, font, size, maxWidth);
  let cy = y;
  for (const line of lines) {
    page.drawText(line, { x, y: cy, size, font, color });
    cy -= size * lineHeight;
  }
  return cy;
}

export async function generateMeldeAushangPdf(
  input: MeldeAushangInput
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pageW = 595;
  const margin = 48;
  const contentW = pageW - margin * 2;
  const primary = hexToRgb(input.primaryColor?.trim() || "#2E7D52");
  const soft = input.primaryColorSoft?.trim()
    ? hexToRgb(input.primaryColorSoft)
    : rgb(0.91, 0.95, 0.91);
  const ink = rgb(0.13, 0.19, 0.16);
  const muted = rgb(0.42, 0.48, 0.44);
  const lightMuted = rgb(0.55, 0.6, 0.57);

  const logo = (input.logoKuerzel?.trim() || input.orgName.trim().charAt(0) || "H")
    .slice(0, 2)
    .toUpperCase();

  const headerH = 72;
  page.drawRectangle({
    x: 0,
    y: 842 - headerH,
    width: pageW,
    height: headerH,
    color: primary,
  });

  page.drawRectangle({
    x: margin,
    y: 842 - headerH + 16,
    width: 40,
    height: 40,
    color: rgb(1, 1, 1),
    borderColor: rgb(1, 1, 1),
    borderWidth: 0,
  });
  page.drawText(logo, {
    x: margin + 11,
    y: 842 - headerH + 28,
    size: 16,
    font: fontBold,
    color: primary,
  });

  const orgLines = wrapText(input.orgName, fontBold, 15, contentW - 180);
  let orgY = 842 - headerH + 38;
  for (const line of orgLines.slice(0, 2)) {
    page.drawText(line, {
      x: margin + 52,
      y: orgY,
      size: 15,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    orgY -= 17;
  }
  if (input.orgSub?.trim()) {
    page.drawText(input.orgSub.trim(), {
      x: margin + 52,
      y: orgY,
      size: 10,
      font,
      color: rgb(0.92, 0.97, 0.94),
    });
  }

  const badge = AUSHANG_BADGE.toUpperCase();
  const badgeW = fontBold.widthOfTextAtSize(badge, 9) + 20;
  page.drawRectangle({
    x: pageW - margin - badgeW,
    y: 842 - headerH + 26,
    width: badgeW,
    height: 22,
    color: rgb(1, 1, 1),
    borderColor: rgb(1, 1, 1),
    borderWidth: 0,
  });
  page.drawText(badge, {
    x: pageW - margin - badgeW + 10,
    y: 842 - headerH + 32,
    size: 9,
    font: fontBold,
    color: primary,
  });

  let y = 842 - headerH - 44;
  page.drawText(AUSHANG_HERO_LINE1, {
    x: margin,
    y,
    size: 34,
    font: fontBold,
    color: ink,
  });
  y -= 40;
  page.drawText(AUSHANG_HERO_LINE2, {
    x: margin,
    y,
    size: 34,
    font: fontBold,
    color: primary,
  });
  y -= 28;

  y = drawWrapped(
    page,
    AUSHANG_HERO_BODY,
    margin,
    y,
    font,
    13.5,
    muted,
    430,
    1.45
  );
  y -= 18;

  const qrSize = 188;
  const qrX = (pageW - qrSize) / 2;
  const qrY = y - qrSize;
  const corner = 22;
  const cornerW = 3;
  for (const [cx, cy, dx, dy] of [
    [qrX - 8, qrY + qrSize + 8, 1, -1],
    [qrX + qrSize + 8, qrY + qrSize + 8, -1, -1],
    [qrX - 8, qrY - 8, 1, 1],
    [qrX + qrSize + 8, qrY - 8, -1, 1],
  ] as const) {
    page.drawLine({
      start: { x: cx, y: cy },
      end: { x: cx + dx * corner, y: cy },
      thickness: cornerW,
      color: primary,
    });
    page.drawLine({
      start: { x: cx, y: cy },
      end: { x: cx, y: cy + dy * corner },
      thickness: cornerW,
      color: primary,
    });
  }

  page.drawRectangle({
    x: qrX - 4,
    y: qrY - 4,
    width: qrSize + 8,
    height: qrSize + 8,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.9, 0.93, 0.91),
    borderWidth: 1,
  });

  if (input.qrPngBytes?.length) {
    try {
      const qr = await pdf.embedPng(input.qrPngBytes);
      page.drawImage(qr, { x: qrX, y: qrY, width: qrSize, height: qrSize });
      page.drawRectangle({
        x: qrX + qrSize / 2 - 18,
        y: qrY + qrSize / 2 - 18,
        width: 36,
        height: 36,
        color: rgb(1, 1, 1),
        borderColor: primary,
        borderWidth: 2,
      });
      page.drawText(logo, {
        x: qrX + qrSize / 2 - fontBold.widthOfTextAtSize(logo, 11) / 2,
        y: qrY + qrSize / 2 - 5,
        size: 11,
        font: fontBold,
        color: primary,
      });
    } catch {
      /* QR optional */
    }
  }

  y = qrY - 24;
  const displayUrl = input.meldeUrl.replace(/^https?:\/\//i, "");
  const pillText = `${AUSHANG_PILL_HINT}  ·  ${displayUrl}`;
  const pillLines = wrapText(pillText, font, 10.5, contentW - 24);
  const pillH = pillLines.length * 14 + 16;
  page.drawRectangle({
    x: margin,
    y: y - pillH + 10,
    width: contentW,
    height: pillH,
    color: soft,
    borderColor: soft,
    borderWidth: 0,
  });
  let pillY = y - 4;
  for (const line of pillLines) {
    page.drawText(line, {
      x: margin + 14,
      y: pillY,
      size: 10.5,
      font,
      color: muted,
    });
    pillY -= 14;
  }
  y -= pillH + 22;

  const stepW = contentW / 3;
  const stepTop = y;
  page.drawLine({
    start: { x: margin + stepW * 0.5, y: stepTop - 8 },
    end: { x: margin + stepW * 2.5, y: stepTop - 8 },
    thickness: 1,
    color: soft,
  });
  AUSHANG_STEPS.forEach((step, i) => {
    const sx = margin + i * stepW + stepW / 2;
    page.drawCircle({
      x: sx,
      y: stepTop,
      size: 4,
      color: primary,
      borderColor: primary,
      borderWidth: 0,
    });
    page.drawText(step.title, {
      x: sx - fontBold.widthOfTextAtSize(step.title, 12) / 2,
      y: stepTop - 22,
      size: 12,
      font: fontBold,
      color: ink,
    });
    drawWrapped(
      page,
      step.detail,
      sx - stepW / 2 + 8,
      stepTop - 38,
      font,
      10,
      lightMuted,
      stepW - 16,
      1.35
    );
  });
  y = stepTop - 88;

  if (input.objektTitel?.trim()) {
    const boxH = input.objektAdresse?.trim() ? 58 : 44;
    page.drawRectangle({
      x: margin,
      y: y - boxH,
      width: contentW,
      height: boxH,
      color: soft,
      borderColor: soft,
      borderWidth: 0,
    });
    page.drawText(AUSHANG_OBJEKT_LABEL.toUpperCase(), {
      x: margin + 16,
      y: y - 18,
      size: 9,
      font: fontBold,
      color: primary,
    });
    page.drawText(input.objektTitel.trim(), {
      x: margin + 16,
      y: y - 34,
      size: 14,
      font: fontBold,
      color: ink,
    });
    if (input.objektAdresse?.trim()) {
      page.drawText(input.objektAdresse.trim(), {
        x: margin + 16,
        y: y - 50,
        size: 11,
        font,
        color: muted,
      });
    }
    y -= boxH + 16;
  }

  const tel = input.hvTelefon?.trim() || SITE_CONFIG.phone;
  const mail = input.hvEmail?.trim() || SITE_CONFIG.email;
  page.drawLine({
    start: { x: margin, y: 118 },
    end: { x: pageW - margin, y: 118 },
    thickness: 1,
    color: soft,
  });
  page.drawText(AUSHANG_FOOTER_NO_PHONE, {
    x: margin,
    y: 98,
    size: 11,
    font,
    color: lightMuted,
  });
  page.drawText(`Telefon ${tel}`, {
    x: margin,
    y: 82,
    size: 11,
    font: fontBold,
    color: ink,
  });
  page.drawText(mail, {
    x: margin,
    y: 66,
    size: 11,
    font,
    color: muted,
  });
  page.drawText(AUSHANG_FOOTER_DATENSCHUTZ, {
    x: margin,
    y: 50,
    size: 9.5,
    font,
    color: lightMuted,
  });
  page.drawText(`Bearbeitet durch ${AUSHANG_PROCESSED_BY}`, {
    x: margin,
    y: 34,
    size: 9.5,
    font,
    color: lightMuted,
  });

  return pdf.save();
}
