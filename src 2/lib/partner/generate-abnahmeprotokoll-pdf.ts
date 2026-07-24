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
};

function fmtDatum(iso: string): string {
  const d = new Date(iso);
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
  return lines;
}

/** Digitales Abnahmeprotokoll (PDF) — Unterschrift als ausgeschriebener Name. */
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

  const drawLine = (text: string, opts?: { bold?: boolean; size?: number }) => {
    const size = opts?.size ?? 11;
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
    page.drawText(label, { x: margin, y, size: 12, font: fontBold, color: green });
    y -= 18;
    for (const line of wrapText(body, 88)) {
      if (y < 100) {
        page = pdf.addPage([595, 842]);
        y = 780;
      }
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
    drawParagraph(
      "Erbrachte Leistungen",
      input.leistungen.join(", ")
    );
  }

  drawParagraph("Protokoll / Beschreibung", input.protokollText);

  if (input.maengelText?.trim()) {
    drawParagraph("Vermerkte Mängel / Vorbehalte", input.maengelText.trim());
  }

  y -= 12;
  if (y < 180) {
    page = pdf.addPage([595, 842]);
    y = 780;
  }

  page.drawText("Unterschriften (digital — voller Name)", {
    x: margin,
    y,
    size: 12,
    font: fontBold,
    color: green,
  });
  y -= 24;

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
    size: 14,
    font: fontBold,
    color: green,
  });
  y -= 28;

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
    size: 14,
    font: fontBold,
    color: green,
  });
  y -= 40;

  page.drawText(
    "Erstellt über Bärenwald — Abnahme gemeinsam mit dem Kunden vor Ort.",
    { x: margin, y: 72, size: 9, font, color: gray }
  );

  return pdf.save();
}
