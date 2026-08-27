import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import type { VersammlungsberichtPortalPayload } from "@/lib/org/objektakte/load-versammlungsbericht-portal";

const green = rgb(0.1, 0.24, 0.17);
const gray = rgb(0.35, 0.42, 0.39);
const margin = 48;

function fmtDatum(iso: string | null | undefined): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtEuro(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return "—";
  return `${Math.round(n).toLocaleString("de-DE")} €`;
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

function cell(v: string | null | undefined): string {
  return v?.trim() || "—";
}

/** Versammlungsbericht — pdf-lib, rendert immer (auch leer). */
export async function generateVersammlungsberichtPdf(
  p: VersammlungsberichtPortalPayload
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  let y = 780;

  const ensureSpace = (need: number) => {
    if (y < need) {
      page.drawText(`${p.objektTitel} · Versammlungsbericht`, {
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

  const drawLine = (text: string, opts?: { bold?: boolean; size?: number }) => {
    const size = opts?.size ?? 10;
    ensureSpace(60);
    page.drawText(text.slice(0, 110), {
      x: margin,
      y,
      size,
      font: opts?.bold ? fontBold : font,
      color: opts?.bold ? green : gray,
    });
    y -= size + 6;
  };

  page.drawText("Versammlungsbericht", {
    x: margin,
    y,
    size: 20,
    font: fontBold,
    color: green,
  });
  y -= 28;

  drawLine(p.orgName, { bold: true, size: 12 });
  drawLine(p.objektTitel, { bold: true });
  if (p.objektAdresse) drawLine(p.objektAdresse, { size: 9 });
  y -= 4;

  drawLine(
    `Zeitraum: ${fmtDatum(p.zeitraumVon)} – ${fmtDatum(p.zeitraumBis)}`
  );
  drawLine(`Erstellt am: ${fmtDatum(p.erstelltAm)}`, { size: 9 });
  y -= 8;

  drawLine("Zusammenfassung", { bold: true, size: 12 });
  drawLine(`Maßnahmen im Zeitraum: ${p.vorgaengeImZeitraum.length}`);
  drawLine(`Davon offen / in Arbeit: ${p.vorgaengeOffen.length}`);
  drawLine(`Gesamtkosten (mit Angabe): ${fmtEuro(p.gesamtKosten)}`);
  if (p.ohneKostenAngabe > 0) {
    drawLine(
      `Ohne Kostenangabe: ${p.ohneKostenAngabe} Maßnahme${p.ohneKostenAngabe === 1 ? "" : "n"}`,
      { size: 9 }
    );
  }
  if (p.leererZeitraum) {
    drawLine("Keine Maßnahmen im gewählten Zeitraum.", { size: 9 });
  }
  if (p.keineAnlagen) {
    drawLine("Kein Anlagen-Register für dieses Objekt.", { size: 9 });
  }
  y -= 8;

  drawLine("Maßnahmen", { bold: true, size: 12 });
  y -= 4;

  const rows = [...p.vorgaengeImZeitraum].sort((a, b) =>
    a.datum.localeCompare(b.datum)
  );

  if (!rows.length) {
    drawLine("—", { size: 9 });
  } else {
    for (const r of rows) {
      ensureSpace(80);
      const kosten = p.einzelpreise
        ? r.kostenLabel
        : r.kostenEuro != null
          ? "•"
          : r.kostenLabel;
      const headline = `${fmtDatum(r.datum)} · ${cell(r.titel)}`;
      page.drawText(headline.slice(0, 95), {
        x: margin,
        y,
        size: 9,
        font: fontBold,
        color: green,
      });
      y -= 14;
      const detail = [
        cell(r.einheitLabel),
        cell(r.anlageLabel),
        cell(r.gewerkLabel),
        r.statusLabel,
        kosten,
      ].join(" · ");
      for (const line of wrapText(detail, 92)) {
        ensureSpace(50);
        page.drawText(line, { x: margin + 8, y, size: 8, font, color: gray });
        y -= 12;
      }
      y -= 4;
    }
  }

  y -= 8;
  drawLine("Nach Gewerk", { bold: true, size: 12 });
  if (!p.nachGewerk.length) {
    drawLine("Keine Gewerk-Daten im Zeitraum.", { size: 9 });
  } else {
    for (const g of p.nachGewerk) {
      drawLine(
        `${g.gewerk}: ${g.count} Maßnahme${g.count === 1 ? "" : "n"} · ${fmtEuro(g.summe)}`,
        { size: 9 }
      );
    }
  }

  if (p.anlagenHighlights.length) {
    y -= 8;
    drawLine("Anlagen mit auffälliger Historie", { bold: true, size: 12 });
    for (const a of p.anlagenHighlights) {
      drawLine(
        `${a.bezeichnung}: ${a.vorgangCount} Vorgänge · ${fmtEuro(a.kostenSumme)}`,
        { size: 9 }
      );
    }
  }

  page.drawText(`${p.objektTitel} · Versammlungsbericht`, {
    x: margin,
    y: 36,
    size: 8,
    font,
    color: gray,
  });

  return pdf.save();
}
