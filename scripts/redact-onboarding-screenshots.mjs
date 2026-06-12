/**
 * Unkenntlich machen personenbezogener Bereiche per Blur (keine farbigen Boxen).
 *
 * Hinweis: Beim Screenshot-Capture werden Daten bereits durch Demo-Werte ersetzt
 * (Max Mustermann). Dieses Skript ist optional — z. B. für zusätzlichen Blur
 * auf Namens-/Adressfeldern.
 *
 * Usage: node scripts/redact-onboarding-screenshots.mjs
 */

import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ONBOARDING_DIR = path.join(__dirname, "..", "public", "images", "onboarding");
const LANDING_DIR = path.join(__dirname, "..", "public", "images", "landing");

/** Blur-Stärke (sharp sigma) */
const BLUR_SIGMA = 32;

/**
 * Sensible Bereiche — nur schmale Zonen (Persönliche Angaben / Begrüßung).
 * Koordinaten für @2x-Mobile (780×1688) und Desktop (1440×900).
 */
const REDACTIONS = {
  "portal/mobile/01-uebersicht.png": [{ left: 16, top: 118, width: 360, height: 72 }],
  "portal/mobile/02-anfragen.png": [{ left: 16, top: 332, width: 748, height: 248 }],
  "portal/mobile/03-angebote.png": [
    { left: 16, top: 168, width: 748, height: 96 },
    { left: 16, top: 280, width: 748, height: 380 },
  ],
  "portal/mobile/04-auftraege.png": [
    { left: 16, top: 168, width: 748, height: 96 },
    { left: 16, top: 280, width: 748, height: 420 },
  ],
  "portal/desktop/01-uebersicht.png": [{ left: 328, top: 88, width: 320, height: 64 }],
  "portal/desktop/03-angebote.png": [{ left: 628, top: 168, width: 796, height: 280 }],
  "portal/desktop/04-auftraege.png": [{ left: 628, top: 168, width: 796, height: 280 }],
  "landing/portal-mobile.png": [{ left: 16, top: 118, width: 360, height: 72 }],
  "landing/portal-desktop.png": [{ left: 328, top: 88, width: 320, height: 64 }],
};

async function blurRegion(sourcePath, box, imgW, imgH) {
  const left = Math.max(0, Math.round(box.left));
  const top = Math.max(0, Math.round(box.top));
  const width = Math.min(Math.round(box.width), imgW - left);
  const height = Math.min(Math.round(box.height), imgH - top);
  if (width < 4 || height < 4) return null;

  const blurred = await sharp(sourcePath)
    .extract({ left, top, width, height })
    .resize(
      Math.max(6, Math.round(width / 18)),
      Math.max(6, Math.round(height / 18)),
      { kernel: sharp.kernel.nearest }
    )
    .resize(width, height, { kernel: sharp.kernel.nearest })
    .blur(BLUR_SIGMA)
    .png()
    .toBuffer();

  return { input: blurred, top, left };
}

async function redactFile(relPath, boxes) {
  const baseDir = relPath.startsWith("landing/") ? LANDING_DIR : ONBOARDING_DIR;
  const rel = relPath.startsWith("landing/") ? relPath.slice("landing/".length) : relPath;
  const abs = path.join(baseDir, rel);
  const meta = await sharp(abs).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;

  const overlays = (
    await Promise.all(boxes.map((box) => blurRegion(abs, box, w, h)))
  ).filter(Boolean);

  if (overlays.length === 0) return;

  const buf = await sharp(abs).composite(overlays).png().toBuffer();
  await sharp(buf).toFile(abs);
  console.log(`✓ ${relPath}`);
}

async function main() {
  for (const [rel, boxes] of Object.entries(REDACTIONS)) {
    await redactFile(rel, boxes);
  }

  const portalMobile = path.join(ONBOARDING_DIR, "portal", "mobile");
  const files = await readdir(portalMobile);
  for (const file of files) {
    const rel = `portal/mobile/${file}`;
    if (!REDACTIONS[rel]) {
      console.log(`· ${rel} (keine Schwärzung nötig)`);
    }
  }

  console.log("Fertig — Blur auf sensible Bereiche angewendet.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
