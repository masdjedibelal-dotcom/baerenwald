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
    return "Dein Konto konnte noch nicht automatisch zugeordnet werden. Bitte kontaktiere uns — wir helfen dir weiter.";
  }

  const payload =
    typeof error === "string" ? { message: error } : error;
  const message = payload.message ?? "";

  if (isKundenEmailUniqueViolation(payload)) {
    return "Diese E-Mail ist bereits mit einem anderen Portal-Konto verknüpft. Bitte wende dich an uns.";
  }

  if (isTechnicalMessage(message)) {
    return "Dein Konto konnte noch nicht automatisch zugeordnet werden. Bitte kontaktiere uns — wir helfen dir weiter.";
  }

  if (message.trim()) return message.trim();

  return "Dein Konto konnte noch nicht automatisch zugeordnet werden. Bitte kontaktiere uns — wir helfen dir weiter.";
}
