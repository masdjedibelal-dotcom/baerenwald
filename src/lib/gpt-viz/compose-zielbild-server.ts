import { createCanvas, loadImage } from "@napi-rs/canvas";
import { readFile } from "fs/promises";
import path from "path";

import {
  renderZielbildFeed,
  ZIELBILD_H,
  ZIELBILD_W,
} from "@/lib/gpt-viz/compose-zielbild-layout";
import { resolvePublicImageUrl } from "@/lib/gpt-viz/storage";
import type { GptVizBauErklaerung } from "@/lib/gpt-viz/types";

export type ComposeZielbildServerInput = {
  vorherUrl: string;
  nachherUrl: string;
  erklaerung: GptVizBauErklaerung;
  logoPath?: string;
};

async function loadRasterFromUrl(url: string) {
  const absolute = resolvePublicImageUrl(url);
  return loadImage(absolute);
}

async function loadLogoImage(logoPath?: string) {
  if (logoPath) {
    return loadImage(logoPath);
  }
  const file = path.join(process.cwd(), "public", "logo-mark-white.png");
  const buf = await readFile(file);
  return loadImage(buf);
}

export async function composeGptZielbildPngBuffer(
  input: ComposeZielbildServerInput
): Promise<Buffer> {
  const [logo, vorher, nachher] = await Promise.all([
    loadLogoImage(input.logoPath),
    loadRasterFromUrl(input.vorherUrl),
    loadRasterFromUrl(input.nachherUrl),
  ]);

  const canvas = createCanvas(ZIELBILD_W, ZIELBILD_H);
  const ctx = canvas.getContext("2d");
  renderZielbildFeed(
    ctx as unknown as CanvasRenderingContext2D,
    input.erklaerung,
    logo,
    vorher,
    nachher
  );
  return canvas.toBuffer("image/png");
}
