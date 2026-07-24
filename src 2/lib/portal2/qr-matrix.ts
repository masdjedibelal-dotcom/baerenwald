/**
 * Portal 2.0 B10 — Mock `qrMatrix` / `qrSvg` (deterministisch).
 * ACHTUNG: Diese Matrix ist dekorativ und NICHT scannbar.
 * Live-Aushang nutzt echte QR-Bilder auf meldeUrl (E3).
 */

const N = 29;

function fnvSeed(seed: string): number {
  let s = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    s ^= seed.charCodeAt(i);
    s = Math.imul(s, 16777619);
  }
  return s >>> 0;
}

/** Mock `qrMatrix(seed)` — 29×29 Bool-Matrix. */
export function qrMatrix(seed: string): boolean[][] {
  const m: boolean[][] = Array.from({ length: N }, () =>
    Array.from({ length: N }, () => false)
  );
  let s = fnvSeed(seed);
  const rnd = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };

  const finder = (r: number, c: number) => {
    for (let i = -1; i < 8; i++) {
      for (let j = -1; j < 8; j++) {
        const rr = r + i;
        const cc = c + j;
        if (rr < 0 || cc < 0 || rr >= N || cc >= N) continue;
        const edge =
          (i >= 0 && i <= 6 && (j === 0 || j === 6)) ||
          (j >= 0 && j <= 6 && (i === 0 || i === 6));
        const core = i >= 2 && i <= 4 && j >= 2 && j <= 4;
        m[rr]![cc] = edge || core;
      }
    }
  };

  const reserved = (r: number, c: number) =>
    (r < 9 && c < 9) || (r < 9 && c >= N - 8) || (r >= N - 8 && c < 9);

  finder(0, 0);
  finder(0, N - 7);
  finder(N - 7, 0);

  for (let c = 8; c < N - 8; c++) {
    const on = c % 2 === 0;
    m[6]![c] = on;
    m[c]![6] = on;
  }

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (reserved(r, c) || r === 6 || c === 6) continue;
      if (rnd() > 0.5) m[r]![c] = true;
    }
  }
  return m;
}

/** Mock `qrSvg(seed, px)` als SVG-Markup-String. */
export function qrSvgMarkup(seed: string, px: number): string {
  const m = qrMatrix(seed);
  const cell = px / N;
  const rects: string[] = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (!m[r]![c]) continue;
      rects.push(
        `<rect x="${(c * cell).toFixed(2)}" y="${(r * cell).toFixed(2)}" width="${(cell + 0.4).toFixed(2)}" height="${(cell + 0.4).toFixed(2)}" fill="#0d1f16"/>`
      );
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}" shape-rendering="crispEdges" data-om-raster="true"><rect x="0" y="0" width="${px}" height="${px}" fill="#fff"/>${rects.join("")}</svg>`;
}
