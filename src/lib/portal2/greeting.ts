/**
 * Tageszeit-Begrüßung für Portal-Dashboard (Deep Green).
 */
export function portalDayGreeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 11) return "Guten Morgen";
  if (h < 18) return "Guten Tag";
  return "Guten Abend";
}

/** Deep Green: „Guten Morgen,“ / „Guten Tag,“ / „Guten Abend,“ */
export function portalDayGreetingPhrase(now = new Date()): string {
  return `${portalDayGreeting(now)},`;
}

/** @deprecated Legacy Uppercase — Dashboard nutzt `portalDayGreetingPhrase`. */
export function portalDayGreetingLabel(now = new Date()): string {
  return `${portalDayGreeting(now).toUpperCase()} 👋`;
}
