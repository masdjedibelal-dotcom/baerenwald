/** Gemeinsame API-Eingabevalidierung (ohne externe Pakete). */

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  const t = phone.trim();
  if (!t) return false;
  return /^[\d\s+\-()]{6,20}$/.test(t);
}

export function isValidPlz(plz: string): boolean {
  return /^\d{5}$/.test(plz.trim());
}

export function isValidName(name: string): boolean {
  const n = name.trim();
  return n.length >= 2 && n.length <= 100;
}
