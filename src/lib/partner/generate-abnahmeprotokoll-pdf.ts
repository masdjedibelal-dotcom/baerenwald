import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type AbnahmeprotokollPdfInput = {
  auftragTitel: string;
  handwerkerName: string;
  leistungen: string[];
  protokollText: string;
  maengelText?: string | null;
  ort: string;
  abnahmeDatum: string;
  hwUnterschriftName: string;
  kundeUnterschriftName: string;
  /** ISO timestamps */
  hwSigniertAm?: string | null;
  kundeSigniertAm?: string | null;
  /** PNG data URLs */
  hwSignaturPng?: string | null;
  kundeSignaturPng?: string | null;
  /** Optional check summary lines */
  checkSummaryLines?: string[];
};

function fmtDatum(iso: string): string {
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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
  return lines;
}

async function embedPngDataUrl(
  pdf: PDFDocument,
  dataUrl: string | null | undefined
) {
  if (!dataUrl?.startsWith("data:image/png")) return null;
  const b64 = dataUrl.split(",")[1];
  if (!b64) return null;
  try {
    const bytes = Buffer.from(b64, "base64");
    return await pdf.embedPng(bytes);
  } catch {
    return null;
  }
}

/** Digitales Abnahmeprotokoll (PDF) — Namen + Canvas-Signaturen + Timestamps. */
export async function generateAbnahmeprotokollPdf(
  input: AbnahmeprotokollPdfInput
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  let page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const green = rgb(0.1, 0.24, 0.17);
  const gray = rgb(0.35, 0.42, 0.39);
  const margin = 48;
  let y = 780;

  const ensureSpace = (need: number) => {
    if (y < need) {
      page = pdf.addPage([595, 842]);
      y = 780;
    }
  };

  const drawLine = (text: string, opts?: { bold?: boolean; size?: number }) => {
    const size = opts?.size ?? 11;
    ensureSpace(size + 20);
    page.drawText(text, {
      x: margin,
      y,
      size,
      font: opts?.bold ? fontBold : font,
      color: opts?.bold ? green : gray,
    });
    y -= size + 6;
  };

  const drawParagraph = (label: string, body: string) => {
    ensureSpace(40);
    page.drawText(label, { x: margin, y, size: 12, font: fontBold, color: green });
    y -= 18;
    for (const line of wrapText(body, 88)) {
      ensureSpace(30);
      page.drawText(line, { x: margin, y, size: 10, font, color: gray });
      y -= 14;
    }
    y -= 8;
  };

  page.drawText("Abnahmeprotokoll", {
    x: margin,
    y,
    size: 20,
    font: fontBold,
    color: green,
  });
  y -= 28;

  drawLine(input.auftragTitel, { bold: true, size: 13 });
  drawLine(`Ausführender Betrieb: ${input.handwerkerName}`);
  drawLine(`Abnahme am ${fmtDatum(input.abnahmeDatum)} in ${input.ort}`);
  y -= 6;

  if (input.leistungen.length) {
    drawParagraph("Erbrachte Leistungen", input.leistungen.join(", "));
  }

  if (input.checkSummaryLines?.length) {
    drawParagraph("Abschluss-Checkliste", input.checkSummaryLines.join(" · "));
  }

  drawParagraph("Protokoll / Beschreibung", input.protokollText);

  if (input.maengelText?.trim()) {
    drawParagraph("Vermerkte Mängel / Vorbehalte", input.maengelText.trim());
  }

  y -= 8;
  ensureSpace(220);
  page.drawText("Unterschriften (digital)", {
    x: margin,
    y,
    size: 12,
    font: fontBold,
    color: green,
  });
  y -= 22;

  const hwImg = await embedPngDataUrl(pdf, input.hwSignaturPng);
  const kundeImg = await embedPngDataUrl(pdf, input.kundeSignaturPng);

  page.drawText("Handwerker / Ausführender Betrieb:", {
    x: margin,
    y,
    size: 10,
    font,
    color: gray,
  });
  y -= 16;
  page.drawText(input.hwUnterschriftName, {
    x: margin,
    y,
    size: 13,
    font: fontBold,
    color: green,
  });
  y -= 14;
  if (input.hwSigniertAm) {
    page.drawText(`Signiert am ${fmtDateTime(input.hwSigniertAm)}`, {
      x: margin,
      y,
      size: 9,
      font,
      color: gray,
    });
    y -= 12;
  }
  if (hwImg) {
    ensureSpace(90);
    const w = Math.min(220, hwImg.width);
    const h = (hwImg.height / hwImg.width) * w;
    page.drawImage(hwImg, { x: margin, y: y - h, width: w, height: h });
    y -= h + 16;
  } else {
    y -= 8;
  }

  ensureSpace(120);
  page.drawText("Auftraggeber / Kunde (vor Ort):", {
    x: margin,
    y,
    size: 10,
    font,
    color: gray,
  });
  y -= 16;
  page.drawText(input.kundeUnterschriftName, {
    x: margin,
    y,
    size: 13,
    font: fontBold,
    color: green,
  });
  y -= 14;
  if (input.kundeSigniertAm) {
    page.drawText(`Signiert am ${fmtDateTime(input.kundeSigniertAm)}`, {
      x: margin,
      y,
      size: 9,
      font,
      color: gray,
    });
    y -= 12;
  } else {
    page.drawText("Keine Canvas-Gegenzeichnung — nur Namensangabe.", {
      x: margin,
      y,
      size: 9,
      font,
      color: gray,
    });
    y -= 12;
  }
  if (kundeImg) {
    ensureSpace(90);
    const w = Math.min(220, kundeImg.width);
    const h = (kundeImg.height / kundeImg.width) * w;
    page.drawImage(kundeImg, { x: margin, y: y - h, width: w, height: h });
    y -= h + 16;
  }

  page.drawText(
    "Erstellt über Bärenwald — Abnahme gemeinsam mit dem Kunden vor Ort.",
    { x: margin, y: 48, size: 9, font, color: gray }
  );

  return pdf.save();
}
