/** Verdächtige €/m²-Angaben bei Komplett-Bad (typische Modell-Halluzination). */
const SUSPICIOUS_BAD_QM_EUR =
  /\b([3-9]\d{2}|1[0-2]\d{2})\s*[-–]\s*([3-9]\d{2}|1[0-4]\d{2})\s*(€|eur|euro)\b[^.\n]{0,40}\b(pro|je|\/)\s*(m²|m2|qm|quadratmeter)\b/i;

const BAD_KOMPLETT_SIGNAL =
  /\b(bad|badezimmer|luxus|gehoben|komplett|komplettsanierung|neues bad|badsanierung|hochwertig)\b/i;

const BAD_CORRECTION =
  "Für eine komplette Badsanierung in München liegen unsere unverbindlichen Richtwerte pauschal deutlich höher — z. B. gehobenes kleines Bad (bis 5 m²) etwa 16.000–22.000 €, nicht wenige hundert Euro pro m². Nenne mir gern die ungefähre Badgröße und Ausstattung (standard, komfort oder gehoben), oder tippe unten auf „Zum Preis“ für den Rechner.";

/** Ersetzt offensichtlich falsche Bad-Komplett-Preise in der Antwort. */
export function correctSuspiciousKiPrices(
  displayText: string,
  lastUserMessage: string
): string {
  if (!displayText.trim()) return displayText;
  if (!BAD_KOMPLETT_SIGNAL.test(lastUserMessage)) return displayText;
  if (!SUSPICIOUS_BAD_QM_EUR.test(displayText)) return displayText;
  return BAD_CORRECTION;
}
