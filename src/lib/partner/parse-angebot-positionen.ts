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
    const leistung = String(p.leistung ?? p.leistung_name ?? "").trim();
    if (!leistung) continue;
    const mengeRaw = p.menge;
    const menge = typeof mengeRaw === "number" && mengeRaw > 0 ? mengeRaw : 1;
    out.push({
      gewerk_id: typeof p.gewerk_id === "string" ? p.gewerk_id : undefined,
      leistung,
      beschreibung:
        typeof p.beschreibung === "string" ? p.beschreibung.trim() : undefined,
      menge,
      einheit: typeof p.einheit === "string" ? p.einheit.trim() : undefined,
    });
  }
  return out;
}
