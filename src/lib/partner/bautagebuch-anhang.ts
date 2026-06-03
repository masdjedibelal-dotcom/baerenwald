/** Erkennt PDF-Anhänge an Storage-Pfad oder signierter URL. */
export function isBautagebuchPdfUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  if (!u) return false;
  if (u.includes(".pdf")) return true;
  try {
    const path = new URL(u).pathname.toLowerCase();
    return path.endsWith(".pdf");
  } catch {
    return /\.pdf(\?|$)/i.test(u);
  }
}

export function bautagebuchAnhangLabel(url: string, index: number): string {
  if (isBautagebuchPdfUrl(url)) {
    return `Dokument ${index + 1} (PDF)`;
  }
  return `Foto ${index + 1}`;
}
