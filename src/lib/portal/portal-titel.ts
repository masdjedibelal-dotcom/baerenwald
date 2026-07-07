const TITLE_NAME_SEPARATORS = [" — ", " - "] as const;

/** Privat-Endkunde (nicht Gewerbe, nicht Auftraggeber-Organisation). */
export function isPrivatPortalKontext(opts: {
  auftraggeber_kunde_id?: string | null;
  situation?: string | null;
  kundeTyp?: string | null;
  portalModus?: string | null;
}): boolean {
  if (opts.portalModus === "organisation") return false;
  const typ = opts.kundeTyp?.toLowerCase().trim();
  if (typ && typ !== "privat") return false;
  if (opts.auftraggeber_kunde_id) return false;
  if (opts.situation?.toLowerCase().trim() === "gewerbe") return false;
  return true;
}

/** Entfernt bekannte Kundennamen-Suffixe aus CRM-Titeln (z. B. „Bad — Max Mustermann“). */
export function stripKundennameFromPortalTitel(
  titel: string,
  nameCandidates: Array<string | null | undefined>
): string {
  let result = titel.trim();
  if (!result) return result;

  const names = Array.from(
    new Set(
      nameCandidates
        .map((n) => n?.trim())
        .filter((n): n is string => Boolean(n && n.length >= 2))
    )
  );

  for (const name of names) {
    for (const sep of TITLE_NAME_SEPARATORS) {
      const suffix = `${sep}${name}`;
      if (result.endsWith(suffix)) {
        result = result.slice(0, -suffix.length).trim();
        break;
      }
    }
  }

  return result || titel.trim();
}

export function resolvePrivatPortalTitel(
  titel: string,
  opts: {
    privat: boolean;
    nameCandidates?: Array<string | null | undefined>;
  }
): string {
  const raw = titel.trim() || titel;
  if (!opts.privat) return raw;

  const fromNames = stripKundennameFromPortalTitel(raw, opts.nameCandidates ?? []);
  if (fromNames !== raw) return fromNames;

  const idx = raw.lastIndexOf(" — ");
  if (idx > 0) {
    const left = raw.slice(0, idx).trim();
    const suffix = raw.slice(idx + 3).trim();
    if (left && suffix && !suffix.includes(",")) {
      return left;
    }
  }

  return raw;
}
