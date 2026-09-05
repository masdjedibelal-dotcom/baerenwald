/**
 * Tageszeit-Begrüßung für Portal-Dashboard (Mobil-Kurve).
 */
export function portalDayGreeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 11) return "Guten Morgen";
  if (h < 18) return "Guten Tag";
  return "Guten Abend";
}

/** Uppercase-Zeile wie Mock „GUTEN MORGEN 👋“. */
export function portalDayGreetingLabel(now = new Date()): string {
  return `${portalDayGreeting(now).toUpperCase()} 👋`;
}
