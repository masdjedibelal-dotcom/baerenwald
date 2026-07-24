import type {
  MeldeSlotDisplay,
  MeldeSlotSource,
} from "@/lib/portal2/basisdaten-types";

const WD_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"] as const;

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/** Uhrzeit-Teil: „09“ oder „09:30“ (Minuten nur wenn ≠ 0). */
function formatClockPart(d: Date): string {
  const h = pad2(d.getHours());
  const m = d.getMinutes();
  return m === 0 ? h : `${h}:${pad2(m)}`;
}

/**
 * Mock `MELDE_SLOTS`-Datum: „Do 10.07.“
 * Aus realem `slot_beginn` (ISO) — keine Hardcodes.
 */
export function formatMeldeSlotDateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const wd = WD_SHORT[d.getDay()] ?? "";
  return `${wd} ${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.`;
}

/**
 * Mock-Zeitfenster: „09–11 Uhr“ (en-dash).
 * Braucht `slot_ende`; ohne Ende → „09 Uhr“ / „09:30 Uhr“.
 */
export function formatMeldeSlotTimeLabel(
  beginnIso: string,
  endeIso?: string | null
): string {
  const start = new Date(beginnIso);
  if (Number.isNaN(start.getTime())) return "";
  const startPart = formatClockPart(start);
  if (!endeIso) return `${startPart} Uhr`;
  const end = new Date(endeIso);
  if (Number.isNaN(end.getTime())) return `${startPart} Uhr`;
  return `${startPart}–${formatClockPart(end)} Uhr`;
}

/** `auftrag_terminslots` → Mock-MELDE_SLOTS-Tupel. */
export function toMeldeSlotDisplay(src: MeldeSlotSource): MeldeSlotDisplay {
  return [
    formatMeldeSlotDateLabel(src.slot_beginn),
    formatMeldeSlotTimeLabel(src.slot_beginn, src.slot_ende),
  ] as const;
}

export function toMeldeSlotDisplayList(
  slots: MeldeSlotSource[]
): MeldeSlotDisplay[] {
  return slots.map(toMeldeSlotDisplay);
}

/** Einzeilige Anzeige wie Mock-UI: „Do 10.07. · 09–11 Uhr“. */
export function formatMeldeSlotLine(src: MeldeSlotSource): string {
  const [date, time] = toMeldeSlotDisplay(src);
  if (!date && !time) return "";
  if (!date) return time;
  if (!time) return date;
  return `${date} · ${time}`;
}

const TERMINWUNSCH_WINDOWS: Array<{ startH: number; endH: number }> = [
  { startH: 9, endH: 11 },
  { startH: 13, endH: 15 },
  { startH: 8, endH: 10 },
];

/**
 * Nächste Werktag-Fenster im Mock-`MELDE_SLOTS`-Format (keine Hardcodes).
 * Für Funnel-Schritt „Terminwunsch“.
 */
export function buildUpcomingMeldeSlotOptions(
  count = 3,
  from: Date = new Date()
): Array<{ id: string; line: string; beginnIso: string; endeIso: string }> {
  const out: Array<{
    id: string;
    line: string;
    beginnIso: string;
    endeIso: string;
  }> = [];
  const cursor = new Date(from);
  cursor.setHours(12, 0, 0, 0);
  let guard = 0;
  while (out.length < count && guard < 21) {
    guard++;
    cursor.setDate(cursor.getDate() + 1);
    const wd = cursor.getDay();
    if (wd === 0 || wd === 6) continue;
    const win = TERMINWUNSCH_WINDOWS[out.length % TERMINWUNSCH_WINDOWS.length]!;
    const beginn = new Date(cursor);
    beginn.setHours(win.startH, 0, 0, 0);
    const ende = new Date(cursor);
    ende.setHours(win.endH, 0, 0, 0);
    const src = {
      slot_beginn: beginn.toISOString(),
      slot_ende: ende.toISOString(),
    };
    const line = formatMeldeSlotLine(src);
    out.push({
      id: `slot_${beginn.toISOString()}`,
      line,
      beginnIso: src.slot_beginn,
      endeIso: src.slot_ende,
    });
  }
  return out;
}

/** Qualitative Terminwünsche (A7) + Flexibel. */
export const MELDE_TERMIN_QUALITATIV = [
  { id: "sofort", de: "So bald wie möglich", en: "As soon as possible" },
  { id: "diese_woche", de: "Diese Woche", en: "This week" },
  { id: "flexibel", de: "Flexibel / noch offen", en: "Flexible / open" },
] as const;
