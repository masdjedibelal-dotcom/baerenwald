export type ComposeZielbildInput = {
  vorherUrl: string;
  nachherUrl: string;
  beschreibung: string;
  brandTitle?: string;
  logoUrl?: string;
};

const W = 1200;
const PAD = 48;
const GREEN_DARK = "#1A3D2B";
const GREEN_MID = "#2E7D52";
const GREEN_LIGHT = "#E8F5EC";
const WHITE = "#FFFFFF";
const TEXT_ON_GREEN = "#FFFFFF";
const TEXT_MUTED = "#C5D9CC";
const TEXT_BODY = "#2A332E";

async function fetchAsBlobUrl(src: string): Promise<{ url: string; revoke: () => void }> {
  const absolute = src.startsWith("http") ? src : `${window.location.origin}${src}`;
  try {
    const proxy = `/api/gpt-viz/image-proxy?url=${encodeURIComponent(absolute)}`;
    const res = await fetch(proxy);
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      return { url, revoke: () => URL.revokeObjectURL(url) };
    }
  } catch {
    /* fallback direct */
  }
  return { url: absolute, revoke: () => {} };
}

function loadImageFromUrl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Bild konnte nicht geladen werden.`));
    img.src = src;
  });
}

async function loadImage(src: string): Promise<{ img: HTMLImageElement; revoke: () => void }> {
  const { url, revoke } = await fetchAsBlobUrl(src);
  const img = await loadImageFromUrl(url);
  return { img, revoke };
}

function wrapText(
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
  img: HTMLImageElement,
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
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function composeGptZielbildCanvas(
  input: ComposeZielbildInput
): Promise<HTMLCanvasElement> {
  const logoPath = input.logoUrl ?? "/logo-mark-white.png";
  const beschreibung =
    input.beschreibung.trim() ||
    "So könnte dein Raum nach der Renovierung aussehen — visualisiert mit Bärenwald GPT.";

  const revokes: Array<() => void> = [];
  try {
    const [logoR, vorherR, nachherR] = await Promise.all([
      loadImage(logoPath),
      loadImage(input.vorherUrl),
      loadImage(input.nachherUrl),
    ]);
    revokes.push(logoR.revoke, vorherR.revoke, nachherR.revoke);
    const logo = logoR.img;
    const vorher = vorherR.img;
    const nachher = nachherR.img;

    const innerW = W - PAD * 2;
    const colGap = 20;
    const colW = (innerW - colGap) / 2;
    const imgH = 360;
    const headerH = 76;

    const measureCanvas = document.createElement("canvas");
    const measureCtx = measureCanvas.getContext("2d")!;
    measureCtx.font = "24px system-ui, -apple-system, Segoe UI, sans-serif";
    const { lines: descLines, height: descBlockH } = wrapText(
      measureCtx,
      beschreibung,
      innerW - 48,
      34
    );

    const contentPad = 24;
    const cardH = imgH + 36 + contentPad * 2;
    const descSectionH = 40 + descBlockH + 36;
    const H = PAD + headerH + 28 + cardH + 28 + descSectionH + PAD;

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Grüner Hintergrund (Brand)
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, GREEN_DARK);
    bg.addColorStop(0.55, GREEN_MID);
    bg.addColorStop(1, GREEN_DARK);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    let y = PAD;

    // Header: Logo + Bärenwald GPT
    const logoSize = 56;
    ctx.drawImage(logo, PAD, y, logoSize, logoSize);
    ctx.textBaseline = "top";
    const brandX = PAD + logoSize + 18;
    ctx.fillStyle = TEXT_ON_GREEN;
    ctx.font = "700 38px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillText("Bärenwald", brandX, y + 2);
    const bwW = ctx.measureText("Bärenwald").width;
    ctx.fillStyle = GREEN_LIGHT;
    ctx.fillText("GPT", brandX + bwW + 10, y + 2);
    ctx.fillStyle = TEXT_MUTED;
    ctx.font = "500 19px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillText("Raumvisualisierung · München", brandX, y + 46);

    y += headerH + 28;

    // Weiße Karte: Vorher | Nachher
    const cardX = PAD;
    const cardW = innerW;
    roundRect(ctx, cardX, y, cardW, cardH, 18);
    ctx.fillStyle = WHITE;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const imgY = y + contentPad;
    const leftX = cardX + contentPad;
    const rightX = leftX + colW + colGap;

    for (const [img, x, label, accent] of [
      [vorher, leftX, "Vorher", GREEN_MID] as const,
      [nachher, rightX, "Nachher", GREEN_DARK] as const,
    ]) {
      ctx.save();
      roundRect(ctx, x, imgY, colW, imgH, 12);
      ctx.clip();
      drawCoverImage(ctx, img, x, imgY, colW, imgH);
      ctx.restore();

      ctx.fillStyle = accent;
      ctx.font = "700 15px system-ui, -apple-system, Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(label.toUpperCase(), x + colW / 2, imgY + imgH + 14);
    }
    ctx.textAlign = "left";

    y += cardH + 28;

    // Beschreibung auf Grün
    ctx.fillStyle = TEXT_ON_GREEN;
    ctx.font = "700 22px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillText("Dein Wunsch", PAD, y);
    y += 36;

    roundRect(ctx, PAD, y, innerW, descBlockH + 32, 14);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fill();

    ctx.fillStyle = TEXT_BODY;
    ctx.font = "24px system-ui, -apple-system, Segoe UI, sans-serif";
    let ty = y + 18;
    for (const line of descLines) {
      ctx.fillText(line, PAD + 20, ty);
      ty += 34;
    }

    y += descBlockH + 32 + 20;
    ctx.fillStyle = GREEN_LIGHT;
    ctx.font = "600 18px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillText("baerenwaldmuenchen.de", PAD, y);

    return canvas;
  } finally {
    revokes.forEach((r) => r());
  }
}

export async function composeGptZielbildBlob(input: ComposeZielbildInput): Promise<Blob> {
  const canvas = await composeGptZielbildCanvas(input);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("PNG-Export fehlgeschlagen"))),
      "image/png",
      0.92
    );
  });
}

export async function composeGptZielbildDataUrl(input: ComposeZielbildInput): Promise<string> {
  const canvas = await composeGptZielbildCanvas(input);
  return canvas.toDataURL("image/png", 0.92);
}

export function downloadZielbildBlob(blob: Blob, filename = "baerenwald-gpt-zielbild.png") {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
