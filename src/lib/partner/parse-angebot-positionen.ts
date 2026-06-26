import { stripHtmlToPlainText } from "@/lib/portal/portal-display";

export type PartnerAngebotPosition = {
  gewerk_id?: string;
  leistung: string;
  beschreibung?: string;
  menge: number;
  einheit?: string;
};

export function parseAngebotPositionen(raw: unknown): PartnerAngebotPosition[] {
  if (!raw) return [];
  let data: unknown = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(data)) return [];

  const out: PartnerAngebotPosition[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const p = item as Record<string, unknown>;
    const leistung = stripHtmlToPlainText(String(p.leistung ?? p.leistung_name ?? ""));
    if (!leistung) continue;
    const mengeRaw = p.menge;
    const menge = typeof mengeRaw === "number" && mengeRaw > 0 ? mengeRaw : 1;
    const beschreibungRaw =
      typeof p.beschreibung === "string"
        ? stripHtmlToPlainText(p.beschreibung)
        : typeof p.notiz_extern === "string"
          ? stripHtmlToPlainText(p.notiz_extern)
          : "";
    out.push({
      gewerk_id: typeof p.gewerk_id === "string" ? p.gewerk_id : undefined,
      leistung,
      beschreibung: beschreibungRaw || undefined,
      menge,
      einheit: typeof p.einheit === "string" ? p.einheit.trim() : undefined,
    });
  }
  return out;
}
