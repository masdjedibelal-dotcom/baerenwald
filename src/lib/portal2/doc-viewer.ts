/**
 * Portal 2.0 B6 — docViewer / openDoc Hilfen.
 * Quelle: Baerenwald Portale (5).html `openDoc` / `docViewer`
 */

export type PortalDocKind = "pdf" | "image" | "other";

export type PortalDocView = {
  /** Dateiname / Anzeigename (Mock `name`) */
  name: string;
  /** Meta-Zeile unter dem Namen (Mock `meta`, Default „PDF“) */
  meta?: string;
  /** Reale URL — Pflicht für Live-Preview (kein Mock-Platzhalter) */
  url: string;
  /** Optional explizit; sonst aus Name/URL abgeleitet */
  kind?: PortalDocKind;
};

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i;
const PDF_EXT = /\.pdf(\?|#|$)/i;

export function detectPortalDocKind(
  nameOrUrl: string,
  mime?: string | null
): PortalDocKind {
  const m = (mime ?? "").toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m === "application/pdf" || m.includes("pdf")) return "pdf";
  if (IMAGE_EXT.test(nameOrUrl)) return "image";
  if (PDF_EXT.test(nameOrUrl)) return "pdf";
  return "other";
}

export function resolvePortalDocKind(doc: PortalDocView): PortalDocKind {
  if (doc.kind) return doc.kind;
  const fromName = detectPortalDocKind(doc.name);
  if (fromName !== "other") return fromName;
  return detectPortalDocKind(doc.url);
}

/** Mock: Titel ohne `.pdf`-Suffix. */
export function portalDocTitle(name: string): string {
  return name.replace(/\.pdf$/i, "").trim() || name;
}

/** Badge-Text in der dunklen Leiste (PDF / IMG / DOC). */
export function portalDocBadgeLabel(kind: PortalDocKind): string {
  if (kind === "pdf") return "PDF";
  if (kind === "image") return "IMG";
  return "DOC";
}

export function normalizePortalDocUrl(url: string): string {
  const t = url.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t) || t.startsWith("blob:") || t.startsWith("data:")) {
    return t;
  }
  if (t.startsWith("/")) return t;
  return `https://${t}`;
}

/** Meta-Fallback: „PDF · …“ bzw. Kind-Label. */
export function portalDocMetaLine(
  doc: PortalDocView,
  kind: PortalDocKind
): string {
  const base = doc.meta?.trim();
  if (base) return base;
  if (kind === "pdf") return "PDF";
  if (kind === "image") return "Bild";
  return "Dokument";
}

/** Installierte PWA (kein Browser-Chrome / kein Zurück). */
export function isPortalStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mq || iosStandalone;
}

export function isPortalIosWebkit(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * iOS + Standalone: natives PDF in `_blank` ersetzt die ganze PWA
 * ohne Schließen/Zurück. In-App-Overlay + Blob/PDF.js nutzen.
 */
export function shouldAvoidNativePdfNavigation(): boolean {
  return isPortalIosWebkit() || isPortalStandaloneDisplay();
}

export function portalDocDownloadName(name: string, kind: PortalDocKind): string {
  const base = name.trim() || "Dokument";
  if (kind === "pdf" && !/\.pdf$/i.test(base)) return `${base}.pdf`;
  return base;
}

/** Datei laden (für Blob-URL / Download ohne Top-Level-Navigation). */
export async function fetchPortalDocBlob(url: string): Promise<Blob> {
  const absolute = /^https?:\/\//i.test(url);
  const res = await fetch(url, {
    credentials: absolute ? "omit" : "include",
    mode: "cors",
  });
  if (!res.ok) throw new Error(`Dokument nicht ladbar (${res.status})`);
  return res.blob();
}

/** Download ohne `target=_blank` (bleibt in der PWA). */
export function downloadPortalBlob(blob: Blob, filename: string): void {
  // octet-stream: Browser zeigt PDF nicht an, sondern startet den Download.
  const file =
    blob.type === "application/pdf" || !blob.type
      ? new Blob([blob], { type: "application/octet-stream" })
      : blob;
  const objectUrl = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 4_000);
}

/**
 * PDF/Dokument in neuem Tab öffnen.
 * iOS/PWA: kein natives `_blank` (ersetzt die App) — Caller soll Viewer nutzen.
 */
export async function openPortalDocInNewTab(url: string): Promise<void> {
  const absolute = normalizePortalDocUrl(url);
  if (!absolute) return;
  if (shouldAvoidNativePdfNavigation()) {
    throw new Error("native-pdf-nav-blocked");
  }
  // Fenster sofort öffnen (User-Gesture), sonst blockiert der Browser nach await.
  const win = window.open("about:blank", "_blank");
  try {
    const blob = await fetchPortalDocBlob(absolute);
    const pdfBlob =
      blob.type === "application/pdf" || PDF_EXT.test(absolute)
        ? new Blob([blob], { type: "application/pdf" })
        : blob;
    const objectUrl = URL.createObjectURL(pdfBlob);
    if (win) {
      win.opener = null;
      win.location.href = objectUrl;
    } else {
      window.open(objectUrl, "_blank", "noopener,noreferrer");
    }
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000);
  } catch {
    if (win) {
      win.opener = null;
      win.location.href = absolute;
    } else {
      window.open(absolute, "_blank", "noopener,noreferrer");
    }
  }
}

/** Erzwingt Datei-Download (kein Tab, kein „Datei anzeigen“). */
export async function triggerPortalDocDownload(
  url: string,
  filename: string
): Promise<void> {
  const absolute = normalizePortalDocUrl(url);
  if (!absolute) return;
  const blob = await fetchPortalDocBlob(absolute);
  const kind = detectPortalDocKind(filename, blob.type);
  downloadPortalBlob(blob, portalDocDownloadName(filename, kind));
}

export async function sharePortalBlob(
  blob: Blob,
  filename: string
): Promise<boolean> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }
  const file = new File([blob], filename, {
    type: blob.type || "application/pdf",
  });
  const payload: ShareData = { files: [file], title: filename };
  if (
    typeof navigator.canShare === "function" &&
    !navigator.canShare(payload)
  ) {
    return false;
  }
  try {
    await navigator.share(payload);
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return true;
    return false;
  }
}
