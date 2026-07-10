import type { GptVizBauErklaerung } from "@/lib/gpt-viz/types";

export const ZIELBILD_W = 1080;
export const ZIELBILD_H = 1350;

export type ZielbildRasterImage = {
  width: number;
  height: number;
};

const CREAM = "#F7F4EF";
const CREAM_MID = "#EDE8E0";
const GREEN_DARK = "#0F2818";
const GREEN_MID = "#1A3D2B";
const GREEN_ACCENT = "#2E7D52";
const GREEN_GLOW = "#3D9966";
const TEXT_BODY = "#1A2420";
const TEXT_SOFT = "#4A5C54";
const WHITE = "#FFFFFF";

const FONT_SANS = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const FONT_SERIF = "Georgia, 'Times New Roman', 'Palatino Linotype', serif";

export function wrapZielbildText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  lineHeight: number
): { lines: string[]; height: number } {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return { lines, height: Math.max(lines.length, 1) * lineHeight };
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: ZielbildRasterImage,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const ir = img.width / img.height;
  const r = w / h;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  if (ir > r) {
    sw = img.height * r;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / r;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img as unknown as CanvasImageSource, sx, sy, sw, sh, x, y, w, h);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function drawPhotoFrame(
  ctx: CanvasRenderingContext2D,
  img: ZielbildRasterImage,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  badge: string
) {
  ctx.save();
  ctx.shadowColor = "rgba(15, 40, 24, 0.28)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 6;
  roundRect(ctx, x, y, w, h, radius);
  ctx.fillStyle = "#E4EAE6";
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, x, y, w, h, radius);
  ctx.clip();
  drawCoverImage(ctx, img, x, y, w, h);
  ctx.restore();

  const badgePadX = 10;
  const badgeH = 22;
  ctx.font = `700 9px ${FONT_SANS}`;
  const badgeW = ctx.measureText(badge).width + badgePadX * 2;
  const bx = x + 12;
  const by = y + h - badgeH - 12;

  roundRect(ctx, bx, by, badgeW, badgeH, 4);
  ctx.fillStyle = "rgba(15, 40, 24, 0.78)";
  ctx.fill();
  ctx.fillStyle = WHITE;
  ctx.textBaseline = "middle";
  ctx.fillText(badge, bx + badgePadX, by + badgeH / 2 + 0.5);
  ctx.textBaseline = "top";
}

function drawBrandFooter(
  ctx: CanvasRenderingContext2D,
  logo: ZielbildRasterImage,
  erk: GptVizBauErklaerung,
  y: number
) {
  const footerH = 118;

  const grad = ctx.createLinearGradient(0, y, 0, y + footerH);
  grad.addColorStop(0, GREEN_MID);
  grad.addColorStop(1, GREEN_DARK);
  ctx.fillStyle = grad;
  ctx.fillRect(0, y, ZIELBILD_W, footerH);

  const logoSize = 34;
  ctx.drawImage(logo as unknown as CanvasImageSource, 44, y + 24, logoSize, logoSize);

  ctx.textBaseline = "top";
  ctx.fillStyle = WHITE;
  ctx.font = `600 19px ${FONT_SANS}`;
  ctx.fillText("Bärenwald", 44 + logoSize + 10, y + 22);
  const bwW = ctx.measureText("Bärenwald").width;
  ctx.fillStyle = "#C8E6D4";
  ctx.fillText("GPT", 44 + logoSize + 10 + bwW + 4, y + 22);

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = `500 11px ${FONT_SANS}`;
  ctx.fillText("Generalunternehmer · München", 44 + logoSize + 10, y + 46);

  const ctaText = erk.cta_text || "Projekt anfragen";
  ctx.font = `700 14px ${FONT_SANS}`;
  const ctaLabel = ctaText.length > 28 ? `${ctaText.slice(0, 26)}…` : ctaText;
  const ctaW = ctx.measureText(`${ctaLabel}  →`).width + 34;
  const ctaH = 40;
  const ctaX = ZIELBILD_W - 44 - ctaW;
  const ctaY = y + 32;

  roundRect(ctx, ctaX, ctaY, ctaW, ctaH, ctaH / 2);
  const ctaGrad = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaW, ctaY);
  ctaGrad.addColorStop(0, GREEN_ACCENT);
  ctaGrad.addColorStop(1, GREEN_GLOW);
  ctx.fillStyle = ctaGrad;
  ctx.fill();

  ctx.fillStyle = WHITE;
  ctx.textBaseline = "middle";
  ctx.fillText(`${ctaLabel}  →`, ctaX + 16, ctaY + ctaH / 2);
  ctx.textBaseline = "top";

  if (erk.hinweis_gu) {
    ctx.font = `400 10px ${FONT_SANS}`;
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.textAlign = "center";
    ctx.fillText(erk.hinweis_gu.slice(0, 56), ZIELBILD_W / 2, y + footerH - 20);
    ctx.textAlign = "left";
  }
}

function zielbildKicker(erk: GptVizBauErklaerung): string {
  const k = erk.zielbild_kicker?.trim();
  return k ? k.toUpperCase().slice(0, 48) : "RAUMVISION · MÜNCHEN";
}

function zielbildHeadline(erk: GptVizBauErklaerung): string {
  const h = erk.zielbild_headline?.trim();
  if (h) return h.slice(0, 80);
  const t = erk.titel?.trim();
  if (t) return t.slice(0, 80);
  return "Hell, klar, endlich deins";
}

function vorhabenText(erk: GptVizBauErklaerung): string {
  const summary = erk.zusammenfassung.trim();
  if (summary) return summary.slice(0, 220);
  const teaser = erk.zielbild_teaser?.trim();
  if (teaser) return teaser;
  return "Wir planen die nötigen Gewerke und koordinieren alles als Generalunternehmer in München.";
}

function flowSteps(erk: GptVizBauErklaerung): string[] {
  const raw = erk.naechste_schritte
    .map((s) => s.replace(/^\d+[.)]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);
  if (raw.length >= 2) return raw;
  return ["Anfrage stellen", "Beratung vor Ort", "Umsetzung aus einer Hand"];
}

function drawStepPills(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  maxW: number,
  steps: string[]
): number {
  const items = steps.slice(0, 3);
  if (!items.length) return y;

  ctx.font = `600 9px ${FONT_SANS}`;
  ctx.fillStyle = GREEN_ACCENT;
  ctx.fillText("SO GEHT'S WEITER", x, y);
  let cy = y + 22;

  const gap = 10;
  let cx = x;
  for (let i = 0; i < items.length; i++) {
    const label = items[i].length > 22 ? `${items[i].slice(0, 20)}…` : items[i];
    ctx.font = `600 12px ${FONT_SANS}`;
    const pillW = ctx.measureText(`${i + 1}. ${label}`).width + 24;
    const pillH = 32;

    if (cx + pillW > x + maxW && i > 0) {
      cx = x;
      cy += pillH + gap;
    }

    roundRect(ctx, cx, cy, pillW, pillH, pillH / 2);
    ctx.fillStyle = i === 0 ? GREEN_MID : "rgba(26, 61, 43, 0.08)";
    ctx.fill();
    ctx.fillStyle = i === 0 ? WHITE : TEXT_BODY;
    ctx.textBaseline = "middle";
    ctx.fillText(`${i + 1}. ${label}`, cx + 12, cy + pillH / 2);
    ctx.textBaseline = "top";

    cx += pillW + gap;
  }

  return cy + 32 + 8;
}

/** Editorial Feed-Zielbild (4:5) — Hero-Nachher, Vorher-Inset, Typo darunter. */
export function renderZielbildFeed(
  ctx: CanvasRenderingContext2D,
  erk: GptVizBauErklaerung,
  logo: ZielbildRasterImage,
  vorher: ZielbildRasterImage,
  nachher: ZielbildRasterImage
) {
  const footerH = 118;
  const contentBottom = ZIELBILD_H - footerH;
  const pad = 44;

  const bg = ctx.createLinearGradient(0, 0, 0, ZIELBILD_H);
  bg.addColorStop(0, CREAM);
  bg.addColorStop(0.45, CREAM_MID);
  bg.addColorStop(1, "#E2EBE4");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, ZIELBILD_W, ZIELBILD_H);

  const heroH = 720;
  const heroX = pad;
  const heroY = 36;
  const heroW = ZIELBILD_W - pad * 2;

  ctx.save();
  roundRect(ctx, heroX, heroY, heroW, heroH, 16);
  ctx.clip();
  drawCoverImage(ctx, nachher, heroX, heroY, heroW, heroH);

  const heroFade = ctx.createLinearGradient(0, heroY + heroH - 180, 0, heroY + heroH);
  heroFade.addColorStop(0, "rgba(15, 40, 24, 0)");
  heroFade.addColorStop(1, "rgba(15, 40, 24, 0.35)");
  ctx.fillStyle = heroFade;
  ctx.fillRect(heroX, heroY, heroW, heroH);
  ctx.restore();

  roundRect(ctx, heroX, heroY, heroW, heroH, 16);
  ctx.strokeStyle = "rgba(26, 61, 43, 0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();

  const vorherW = 196;
  const vorherH = 148;
  drawPhotoFrame(ctx, vorher, heroX + 16, heroY + 16, vorherW, vorherH, 10, "VORHER");

  ctx.save();
  ctx.font = `700 11px ${FONT_SANS}`;
  const nachherBadge = "NACHHER";
  const nbW = ctx.measureText(nachherBadge).width + 20;
  const nbH = 26;
  const nbX = heroX + heroW - nbW - 16;
  const nbY = heroY + heroH - nbH - 16;
  roundRect(ctx, nbX, nbY, nbW, nbH, 6);
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.fill();
  ctx.fillStyle = GREEN_MID;
  ctx.textBaseline = "middle";
  ctx.fillText(nachherBadge, nbX + 10, nbY + nbH / 2);
  ctx.textBaseline = "top";
  ctx.restore();

  const textX = pad;
  let textY = heroY + heroH + 28;
  const textW = ZIELBILD_W - pad * 2;

  ctx.fillStyle = GREEN_ACCENT;
  ctx.font = `600 10px ${FONT_SANS}`;
  ctx.fillText(zielbildKicker(erk), textX, textY);
  textY += 20;

  ctx.fillStyle = TEXT_BODY;
  ctx.font = `700 38px ${FONT_SERIF}`;
  const headlineLines = wrapZielbildText(ctx, zielbildHeadline(erk), textW, 44).lines.slice(0, 2);
  for (const line of headlineLines) {
    ctx.fillText(line, textX, textY);
    textY += 44;
  }
  textY += 6;

  ctx.fillStyle = TEXT_SOFT;
  ctx.font = `400 15px ${FONT_SANS}`;
  const bodyLines = wrapZielbildText(ctx, vorhabenText(erk), textW, 22).lines.slice(0, 3);
  for (const line of bodyLines) {
    ctx.fillText(line, textX, textY);
    textY += 22;
  }
  textY += 12;

  textY = drawStepPills(ctx, textX, textY, textW, flowSteps(erk));

  if (textY > contentBottom - 12) {
    textY = contentBottom - 12;
  }

  drawBrandFooter(ctx, logo, erk, ZIELBILD_H - footerH);
}
