/** Deterministischer RNG pro Kalendertag (LCG, Spezifikation Funnel). */
export function seedRng(d: Date): () => number {
  let x = d.getDate() * 7 + d.getMonth() * 31 + d.getFullYear();
  return () => {
    x = (x * 1664525 + 1013904223) & 0xffffffff;
    return Math.abs(x) / 2147483648;
  };
}

const SLOT_POOL = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "14:00",
  "15:00",
  "16:00",
] as const;

export const FULL_SLOTS = new Set<string>(["09:00", "15:00"]);

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Slot-Zeiten für einen Tag; leer = nicht buchbar. */
export function getSlotsForDay(date: Date, today: Date = new Date()): string[] {
  if (startOfDay(date) <= startOfDay(today)) return [];
  if (date.getDay() === 0) return [];
  const rng = seedRng(date);
  if (rng() < 0.2) return [];
  const count = date.getDay() === 6 ? 3 : Math.floor(rng() * 3) + 3;
  const pool = [...SLOT_POOL];
  const picked: string[] = [];
  for (let i = 0; i < count && pool.length; i++) {
    const idx = Math.floor(rng() * pool.length);
    const t = pool.splice(idx, 1)[0];
    if (t) picked.push(t);
  }
  return picked.sort();
}

export function isSlotAlwaysFull(time: string): boolean {
  return FULL_SLOTS.has(time);
}
