/**
 * Fotos/Videos aus Website-Anfragen (Rechner, Anfrage-Weg) vor dem Absenden hochladen.
 * Ziel: `funnel_daten.fotos` → im CRM unter „Meldungsdetails“ sichtbar.
 * Nutzt denselben öffentlichen Upload wie die Mieter-Meldung (Bilder ≤ 8 MB, Videos ≤ 100 MB).
 */

/** Upload-Sitzung (Ordner im Speicher), Format `anfrage-<uuid>`. */
export function neueFotoSitzung(): string {
  const r =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `anfrage-${r.toLowerCase()}`;
}

function istBildOderVideo(f: File): boolean {
  return f.type.startsWith("image/") || f.type.startsWith("video/") || /\.(jpe?g|png|webp|heic|heif|mp4|mov)$/i.test(f.name);
}

/** Lädt bis zu `max` Bilder/Videos hoch; andere Dateitypen (PDF, DOC) werden übersprungen. */
export async function ladeAnfrageFotosHoch(
  dateien: File[],
  sitzung: string,
  max = 5
): Promise<{ urls: string[]; uebersprungen: number }> {
  const medien = dateien.filter(istBildOderVideo).slice(0, max);
  const urls: string[] = [];
  for (const f of medien) {
    const fd = new FormData();
    fd.set("session_key", sitzung);
    fd.set("file", f);
    const res = await fetch("/api/meldung/upload", { method: "POST", body: fd });
    const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok || !json.url) throw new Error(json.error ?? "Foto konnte nicht hochgeladen werden.");
    urls.push(json.url);
  }
  return { urls, uebersprungen: dateien.length - medien.length };
}
