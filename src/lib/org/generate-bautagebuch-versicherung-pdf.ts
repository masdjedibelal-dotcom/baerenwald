import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type BautagebuchVersicherungPdfInput = {
  orgName: string;
  objektTitel: string;
  versicherungsNr?: string | null;
  schadenNr?: string | null;
  eintraege: Array<{
    datum: string;
    titel: string;
    text: string;
    fotoCount: number;
    typ?: string | null;
  }>;
};

const green = rgb(0.1, 0.24, 0.17);
const gray = rgb(0.35, 0.42, 0.39);
const margin = 48;

function fmtDatum(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10) || "—";
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
  return lines.length ? lines : ["—"];
}

/** Bautagebuch-Export für die Versicherung (Helvetica-grün). */
export async function generateBautagebuchVersicherungPdf(
  input: BautagebuchVersicherungPdfInput
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 780;
  const schadenNr =
    input.schadenNr?.trim() ||
    input.versicherungsNr?.trim() ||
    "ohne Nr.";

  const ensureSpace = (need: number) => {
    if (y < need) {
      page.drawText(`Schaden-Nr. ${schadenNr}`, {
        x: margin,
        y: 36,
        size: 8,
        font,
        color: gray,
      });
      page = pdf.addPage([595, 842]);
      y = 780;
    }
  };

  page.drawText("Bautagebuch — Export Versicherung", {
    x: margin,
    y,
    size: 18,
    font: fontBold,
    color: green,
  });
  y -= 26;
  page.drawText(input.orgName, {
    x: margin,
    y,
    size: 11,
    font: fontBold,
    color: green,
  });
  y -= 16;
  page.drawText(input.objektTitel, {
    x: margin,
    y,
    size: 11,
    font,
    color: gray,
  });
  y -= 16;
  page.drawText(`Policen-Nr.: ${input.versicherungsNr?.trim() || "—"}`, {
    x: margin,
    y,
    size: 10,
    font,
    color: gray,
  });
  y -= 24;

  if (input.eintraege.length === 0) {
    page.drawText("Keine Bautagebuch-Einträge vorhanden.", {
      x: margin,
      y,
      size: 11,
      font,
      color: gray,
    });
  } else {
    for (const e of input.eintraege) {
      ensureSpace(100);
      const typ =
        e.typ === "befund" ? " (Befund)" : e.typ ? ` (${e.typ})` : "";
      page.drawText(`${fmtDatum(e.datum)} — ${e.titel}${typ}`.slice(0, 95), {
        x: margin,
        y,
        size: 11,
        font: fontBold,
        color: green,
      });
      y -= 16;
      for (const line of wrapText(e.text || "—", 88)) {
        ensureSpace(50);
        page.drawText(line, { x: margin, y, size: 10, font, color: gray });
        y -= 13;
      }
      page.drawText(
        e.fotoCount > 0
          ? `Anhänge/Fotos: ${e.fotoCount}`
          : "Anhänge/Fotos: —",
        { x: margin, y, size: 9, font, color: gray }
      );
      y -= 20;
    }
  }

  page.drawText("Erstellt über Bärenwald Verwaltungs-Plattform", {
    x: margin,
    y: 52,
    size: 9,
    font,
    color: gray,
  });
  page.drawText(`Schaden-Nr. ${schadenNr}`, {
    x: margin,
    y: 36,
    size: 8,
    font,
    color: gray,
  });

  return pdf.save();
}
