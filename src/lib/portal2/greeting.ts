/**
 * Tageszeit-Begrüßung für Portal-Dashboard (Deep Green).
 */
export function portalDayGreeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 11) return "Guten Morgen";
  if (h < 18) return "Guten Tag";
  return "Guten Abend";
}

/** Servus TEO: wie im Arbeitsplatz „Guten Abend.“ — Stunde nach Berliner Zeit (Server läuft in UTC). */
export function teoTagesGruss(now = new Date()): string {
  const teil = new Intl.DateTimeFormat("de-DE", { hour: "numeric", hour12: false, timeZone: "Europe/Berlin" })
    .formatToParts(now)
    .find((t) => t.type === "hour");
  const h = Number(teil?.value ?? 12);
  return h < 11 ? "Guten Morgen." : h < 18 ? "Guten Tag." : "Guten Abend.";
}

/** Deep Green: „Guten Morgen,“ / „Guten Tag,“ / „Guten Abend,“ */
export function portalDayGreetingPhrase(now = new Date()): string {
  return `${portalDayGreeting(now)},`;
}
