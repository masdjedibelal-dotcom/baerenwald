import { isKundenEmailUniqueViolation } from "@/lib/kunden/kunde-email";

const TECHNICAL_PATTERNS = [
  /violates unique constraint/i,
  /duplicate key/i,
  /23505/,
  /23503/,
  /23502/,
  /PGRST/i,
  /postgres/i,
];

function isTechnicalMessage(message: string): boolean {
  return TECHNICAL_PATTERNS.some((re) => re.test(message));
}

/** Nutzerfreundliche Meldung — niemals rohe DB-Fehler anzeigen. */
export function mapKundenPortalError(
  error: { code?: string; message?: string } | string | null | undefined
): string {
  if (!error) {
    return "Ihr Konto konnte noch nicht automatisch zugeordnet werden. Bitte kontaktieren Sie uns — wir helfen Ihnen weiter.";
  }

  const payload =
    typeof error === "string" ? { message: error } : error;
  const message = payload.message ?? "";

  if (isKundenEmailUniqueViolation(payload)) {
    return "Diese E-Mail ist bereits mit einem anderen Portal-Konto verknüpft. Bitte wenden Sie sich an uns.";
  }

  if (isTechnicalMessage(message)) {
    return "Ihr Konto konnte noch nicht automatisch zugeordnet werden. Bitte kontaktieren Sie uns — wir helfen Ihnen weiter.";
  }

  if (message.trim()) return message.trim();

  return "Ihr Konto konnte noch nicht automatisch zugeordnet werden. Bitte kontaktieren Sie uns — wir helfen Ihnen weiter.";
}
