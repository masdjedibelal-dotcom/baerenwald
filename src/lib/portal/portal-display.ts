/** Kundenfreundliche Texte fürs Portal — keine JSON-Rohdaten, keine internen IDs. */

const UUID_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;

const INTERNAL_KEY_RE =
  /^(id|uuid|lead_id|kunde_id|auftrag_id|angebot_id|handwerker_id|gewerk_id|vorlage_id|created_at|updated_at|_[a-z]+)$/i;

type WizardMeta = {
  titel?: string;
  einleitung?: string;
  schluss?: string;
  leistungsumfang?: string;
  hinweise?: string;
};

export type AngebotPortalDisplay = {
  titel: string;
  leistungen: string[];
  hinweise?: string;
  einleitung?: string;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function looksLikeJsonBlob(text: string): boolean {
  const t = text.trim();
  return (
    (t.startsWith("{") && t.endsWith("}")) ||
    (t.startsWith("[") && t.endsWith("]"))
  );
}

export function sanitizeCustomerText(
  raw?: string | null,
  maxLen = 2000
): string | undefined {
  if (!isNonEmptyString(raw)) return undefined;
  let text = raw.trim();
  if (looksLikeJsonBlob(text)) return undefined;

  text = text
    .replace(UUID_RE, "")
    .replace(/\b[a-z]+_id\s*[:=]\s*["']?[^"'\s,}]+["']?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!text || looksLikeJsonBlob(text)) return undefined;
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
}

export function parseWizardMetaFromNotizen(
  notizen?: string | null
): WizardMeta | null {
  if (!isNonEmptyString(notizen)) return null;
  try {
    const j = JSON.parse(notizen) as {
      wizard_meta?: WizardMeta;
      intern?: string;
    };
    const wm = j.wizard_meta;
    if (!wm || typeof wm !== "object") return null;
    return {
      titel: sanitizeCustomerText(wm.titel, 120),
      einleitung: sanitizeCustomerText(wm.einleitung, 600),
      schluss: sanitizeCustomerText(wm.schluss, 600),
      leistungsumfang: sanitizeCustomerText(wm.leistungsumfang, 1200),
      hinweise: sanitizeCustomerText(wm.hinweise, 800),
    };
  } catch {
    return null;
  }
}

function labelFromRecord(row: Record<string, unknown>): string | null {
  const parts: string[] = [];
  const name =
    row.leistung ??
    row.leistung_name ??
    row.name ??
    row.gewerk_name ??
    row.titel ??
    row.label;
  if (isNonEmptyString(name)) parts.push(sanitizeCustomerText(name, 120) ?? "");

  const desc = row.beschreibung ?? row.text;
  const nameClean = isNonEmptyString(name) ? sanitizeCustomerText(name, 80) : undefined;
  if (
    isNonEmptyString(desc) &&
    sanitizeCustomerText(desc, 80) !== nameClean
  ) {
    const d = sanitizeCustomerText(desc, 160);
    if (d) parts.push(d);
  }

  const menge = row.menge;
  const einheit = row.einheit;
  if (typeof menge === "number" && menge > 0) {
    const unit = isNonEmptyString(einheit) ? ` ${einheit.trim()}` : "";
    parts.push(`${menge}${unit}`);
  }

  const line = parts.filter(Boolean).join(" · ").trim();
  return line || null;
}

export function parseLeistungenList(raw?: string | null): string[] {
  if (!isNonEmptyString(raw)) return [];
  const trimmed = raw.trim();

  if (looksLikeJsonBlob(trimmed)) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => {
            if (typeof item === "string") {
              return sanitizeCustomerText(item, 200);
            }
            if (item && typeof item === "object") {
              return labelFromRecord(item as Record<string, unknown>);
            }
            return null;
          })
          .filter((v): v is string => Boolean(v));
      }
      if (parsed && typeof parsed === "object") {
        const obj = parsed as Record<string, unknown>;
        if (Array.isArray(obj.positionen)) {
          return parseLeistungenList(JSON.stringify(obj.positionen));
        }
        if (isNonEmptyString(obj.leistungsumfang)) {
          return parseLeistungenList(obj.leistungsumfang);
        }
        if (Array.isArray(obj.leistungen)) {
          return parseLeistungenList(JSON.stringify(obj.leistungen));
        }
      }
    } catch {
      return [];
    }
    return [];
  }

  const clean = sanitizeCustomerText(trimmed, 1200);
  if (!clean) return [];

  const byLine = clean
    .split(/\n|•|·|;/)
    .map((s) => s.replace(/^[-*]\s*/, "").trim())
    .filter((s) => s.length > 2 && !INTERNAL_KEY_RE.test(s));

  if (byLine.length > 1) return byLine;
  return [clean];
}

export function resolveAngebotTitel(opts: {
  angebotsnr?: string | null;
  notizen?: string | null;
}): string {
  const wm = parseWizardMetaFromNotizen(opts.notizen);
  const fromWizard = sanitizeCustomerText(wm?.titel, 200);
  if (fromWizard) return fromWizard;
  const nr = opts.angebotsnr?.trim();
  return nr ? `Angebot ${nr}` : "Angebot";
}

export function buildAngebotPortalDisplay(angebot: {
  angebotsnr?: string | null;
  leistungsumfang?: string | null;
  notizen?: string | null;
}): AngebotPortalDisplay {
  const wm = parseWizardMetaFromNotizen(angebot.notizen);

  const leistungen = dedupeStrings([
    ...parseLeistungenList(angebot.leistungsumfang),
    ...parseLeistungenList(wm?.leistungsumfang),
  ]);

  return {
    titel: resolveAngebotTitel({
      angebotsnr: angebot.angebotsnr,
      notizen: angebot.notizen,
    }),
    leistungen,
    hinweise: undefined,
    einleitung: wm?.einleitung,
  };
}

export function fmtPortalStatus(status?: string | null): string {
  if (!status) return "Offen";
  const s = status.toLowerCase().replace(/[\s-]+/g, "_");
  const labels: Record<string, string> = {
    neu: "Neu",
    offen: "Offen",
    entwurf: "In Vorbereitung",
    gesendet: "Gesendet",
    angenommen: "Angenommen",
    kunde_akzeptiert: "Angenommen",
    abgelehnt: "Abgelehnt",
    abgelaufen: "Abgelaufen",
    in_arbeit: "In Arbeit",
    aktiv: "Aktiv",
    planung: "Planung",
    abgeschlossen: "Abgeschlossen",
    fertig: "Abgeschlossen",
    angebot: "Angebot",
    auftrag: "Auftrag",
    storniert: "Storniert",
  };
  return labels[s] || status.replace(/_/g, " ");
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

export type PortalDetailSection = {
  heading: string;
  rows?: Array<{ label: string; value: string }>;
  bullets?: string[];
  text?: string;
};
