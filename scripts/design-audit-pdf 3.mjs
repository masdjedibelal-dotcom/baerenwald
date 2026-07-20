/**
 * Erzeugt eine PDF aus den Design-Audit-Screenshots.
 * Usage: npm run audit:pdf
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SCREENSHOTS = path.join(ROOT, "docs", "design-audit", "screenshots");
const OUT = path.join(ROOT, "docs", "design-audit", "design-audit.pdf");

const GROUP_ORDER = [
  "marketing",
  "portal-auth",
  "partner-auth",
  "portal",
  "partner",
];

const GROUP_LABELS = {
  marketing: "Marketing & Website",
  "portal-auth": "Kundenportal — Auth",
  "partner-auth": "Partnerportal — Auth",
  portal: "MeinBärenwald (eingeloggt)",
  partner: "Partner-Portal (eingeloggt)",
};

const VIEWPORT_ORDER = ["desktop", "mobile"];
const VIEWPORT_LABELS = {
  desktop: "Desktop (1440 × 900)",
  mobile: "Mobile (390 × 844)",
};

const PAGE_LANDSCAPE = { w: 842, h: 595 };
const PAGE_PORTRAIT = { w: 595, h: 842 };
const MARGIN = 36;
const CAPTION_H = 28;

async function collectPngs(viewport, group) {
  const dir = path.join(SCREENSHOTS, viewport, group);
  let files = [];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".png")).sort();
  } catch {
    return [];
  }
  return files.map((f) => ({
    rel: `${viewport}/${group}/${f}`,
    abs: path.join(dir, f),
    name: f.replace(/\.png$/, ""),
  }));
}

async function addTitlePage(pdf, { title, subtitle, font, fontBold }) {
  const page = pdf.addPage([PAGE_LANDSCAPE.w, PAGE_LANDSCAPE.h]);
  const { w, h } = PAGE_LANDSCAPE;
  page.drawText(title, {
    x: MARGIN,
    y: h - 120,
    size: 28,
    font: fontBold,
    color: rgb(0.12, 0.24, 0.17),
  });
  if (subtitle) {
    page.drawText(subtitle, {
      x: MARGIN,
      y: h - 160,
      size: 14,
      font,
      color: rgb(0.35, 0.35, 0.35),
    });
  }
}

async function addSectionPage(pdf, { heading, subheading, font, fontBold }) {
  const page = pdf.addPage([PAGE_LANDSCAPE.w, PAGE_LANDSCAPE.h]);
  const { h } = PAGE_LANDSCAPE;
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_LANDSCAPE.w,
    height: PAGE_LANDSCAPE.h,
    color: rgb(0.95, 0.96, 0.94),
  });
  page.drawText(heading, {
    x: MARGIN,
    y: h / 2 + 10,
    size: 22,
    font: fontBold,
    color: rgb(0.12, 0.24, 0.17),
  });
  if (subheading) {
    page.drawText(subheading, {
      x: MARGIN,
      y: h / 2 - 20,
      size: 13,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  }
}

async function addImagePage(pdf, { file, caption, viewport, font }) {
  const bytes = await readFile(file.abs);
  const isMobile = viewport === "mobile";
  const pageSize = isMobile ? PAGE_PORTRAIT : PAGE_LANDSCAPE;
  const page = pdf.addPage([pageSize.w, pageSize.h]);

  const image = await pdf.embedPng(bytes);
  const imgW = image.width;
  const imgH = image.height;

  const availW = pageSize.w - MARGIN * 2;
  const availH = pageSize.h - MARGIN * 2 - CAPTION_H;
  const scale = Math.min(availW / imgW, availH / imgH, 1);
  const drawW = imgW * scale;
  const drawH = imgH * scale;
  const x = MARGIN + (availW - drawW) / 2;
  const y = MARGIN + CAPTION_H + (availH - drawH) / 2;

  page.drawImage(image, { x, y, width: drawW, height: drawH });
  page.drawText(caption, {
    x: MARGIN,
    y: MARGIN,
    size: 10,
    font,
    color: rgb(0.3, 0.3, 0.3),
    maxWidth: pageSize.w - MARGIN * 2,
  });
}

async function main() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const generatedAt = new Date().toLocaleString("de-DE", {
    dateStyle: "long",
    timeStyle: "short",
  });

  await addTitlePage(pdf, {
    title: "Bärenwald — Design-Audit",
    subtitle: `Screenshots aller Bereiche · ${generatedAt}`,
    font,
    fontBold,
  });

  let count = 0;

  for (const viewport of VIEWPORT_ORDER) {
    await addSectionPage(pdf, {
      heading: VIEWPORT_LABELS[viewport],
      subheading: "Übersicht aller erfassten Screens",
      font,
      fontBold,
    });

    for (const group of GROUP_ORDER) {
      const files = await collectPngs(viewport, group);
      if (files.length === 0) continue;

      await addSectionPage(pdf, {
        heading: GROUP_LABELS[group] ?? group,
        subheading: VIEWPORT_LABELS[viewport],
        font,
        fontBold,
      });

      for (const file of files) {
        const caption = `${VIEWPORT_LABELS[viewport]} · ${GROUP_LABELS[group] ?? group} · ${file.name}`;
        await addImagePage(pdf, { file, caption, viewport, font });
        count++;
        process.stdout.write(`\r${count} Screenshots eingebettet…`);
      }
    }
  }

  const pdfBytes = await pdf.save();
  await writeFile(OUT, pdfBytes);

  const mb = (pdfBytes.length / (1024 * 1024)).toFixed(1);
  console.log(`\n✓ PDF erstellt: ${OUT} (${count} Screenshots, ${mb} MB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
