/** Portal-Spiegel der CRM Abnahme-Typen (punkte / maengel / meta). */

export type PortalAbnahmeErgebnis =
  | "abgenommen"
  | "mit_vorbehalt"
  | "verweigert";

export const PORTAL_ABNAHME_ERGEBNIS_LABEL: Record<
  PortalAbnahmeErgebnis,
  string
> = {
  abgenommen: "Abgenommen",
  mit_vorbehalt: "Mit Vorbehalt",
  verweigert: "Verweigert",
};

export type PortalAbnahmePunkt = {
  id: string;
  gewerk?: string;
  leistung_id?: string | null;
  leistung_name: string;
  beschreibung: string;
  status: "ok";
  foto_urls?: string[];
};

export type PortalAbnahmeMangel = {
  id: string;
  punkt_id: string;
  titel: string;
  beschreibung: string;
  foto_urls?: string[];
  frist?: string | null;
  status: "offen";
};

export type PortalAbnahmeFreigabeStatus =
  | "entwurf"
  | "zur_freigabe"
  | "freigegeben"
  | "abgelehnt";

export type PortalAbnahmeStatus = {
  ok: true;
  protokoll_id: string | null;
  pdf_url: string | null;
  abnahme_datum: string | null;
  punkte_count: number;
  maengel_count: number;
  an_kunde_gesendet_at: string | null;
  handwerker_bestaetigt_at: string | null;
  abnahme_ergebnis: string | null;
  freigabe_status: string | null;
};

/** Position → Abnahmepunkt (erledigte Leistungen vorbefüllen). */
export function mapPositionToAbnahmePunkt(pos: {
  id: string;
  leistung_name: string;
  beschreibung?: string | null;
  gewerk_name?: string | null;
}): PortalAbnahmePunkt {
  return {
    id: newLocalId("ok"),
    leistung_id: pos.id,
    leistung_name: pos.leistung_name.trim() || "Leistung",
    beschreibung: pos.beschreibung?.trim() || "",
    status: "ok",
    gewerk: pos.gewerk_name?.trim() || "Ohne Gewerk",
  };
}

export function autoAbnahmeErgebnis(
  maengelCount: number
): Exclude<PortalAbnahmeErgebnis, "verweigert"> {
  return maengelCount > 0 ? "mit_vorbehalt" : "abgenommen";
}

export function newLocalId(prefix = "p"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function mapMangelToCrm(m: PortalAbnahmeMangel) {
  const text = [m.titel.trim(), m.beschreibung.trim()].filter(Boolean).join(" — ");
  return {
    punkt_id: m.punkt_id || m.id,
    beschreibung: text || m.titel.trim() || "Mangel",
    foto_urls: m.foto_urls ?? [],
    frist: m.frist?.trim() || null,
    status: "offen" as const,
    erfasst_at: new Date().toISOString(),
  };
}

export function mapPunktToCrm(p: PortalAbnahmePunkt) {
  return {
    id: p.id,
    gewerk: p.gewerk?.trim() || "Ohne Gewerk",
    leistung_id: p.leistung_id ?? null,
    leistung_name: p.leistung_name.trim() || "Leistung",
    beschreibung: p.beschreibung ?? "",
    status: "ok" as const,
    foto_urls: p.foto_urls ?? [],
  };
}
