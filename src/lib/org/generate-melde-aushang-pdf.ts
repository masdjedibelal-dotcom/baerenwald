import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { SITE_CONFIG } from "@/lib/config";

export type MeldeAushangInput = {
  orgName: string;
  objektTitel: string;
  objektAdresse?: string;
  meldeUrl: string;
  qrPngBytes?: Uint8Array | null;
  hvTelefon?: string;
};

export async function generateMeldeAushangPdf(
  input: MeldeAushangInput
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const green = rgb(0.1, 0.24, 0.17);
  const gray = rgb(0.35, 0.42, 0.39);

  let y = 780;

  page.drawText("Schaden melden", {
    x: 48,
    y,
    size: 28,
    font: fontBold,
    color: green,
  });
  y -= 36;

  page.drawText(input.orgName, { x: 48, y, size: 14, font: fontBold, color: green });
  y -= 20;
  page.drawText(input.objektTitel, { x: 48, y, size: 12, font, color: gray });
  y -= 16;
  if (input.objektAdresse) {
    page.drawText(input.objektAdresse, { x: 48, y, size: 11, font, color: gray });
    y -= 28;
  } else {
    y -= 12;
  }

  const steps = [
    "1. QR-Code scannen oder Link öffnen",
    "2. Kurz beschreiben und Fotos hochladen",
    "3. Hausverwaltung und Bärenwald koordinieren den Rest",
  ];
  for (const step of steps) {
    page.drawText(step, { x: 48, y, size: 13, font, color: green });
    y -= 22;
  }

  y -= 8;
  page.drawText("Melde-Link:", { x: 48, y, size: 10, font: fontBold, color: gray });
  y -= 14;
  page.drawText(input.meldeUrl, {
    x: 48,
    y,
    size: 9,
    font,
    color: gray,
    maxWidth: 340,
    lineHeight: 11,
  });

  if (input.qrPngBytes?.length) {
    try {
      const qr = await pdf.embedPng(input.qrPngBytes);
      const size = 140;
      page.drawImage(qr, { x: 400, y: 620, width: size, height: size });
    } catch {
      /* QR optional */
    }
  }

  y = 120;
  const tel = input.hvTelefon?.trim() || SITE_CONFIG.phone;
  page.drawText(`Notfall / Rückfragen: ${tel}`, {
    x: 48,
    y,
    size: 11,
    font,
    color: gray,
  });
  page.drawText(SITE_CONFIG.companyName, {
    x: 48,
    y: y - 18,
    size: 10,
    font,
    color: gray,
  });

  return pdf.save();
}
