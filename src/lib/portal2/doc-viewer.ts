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
