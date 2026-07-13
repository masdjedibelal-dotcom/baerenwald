export type PortalTerminSlot = {
  id: string;
  slot_beginn: string;
  slot_ende?: string | null;
  status: string;
  bestaetigt_am?: string | null;
};

export function fmtPortalTerminSlot(iso: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function splitMieterTerminSlots(slots: PortalTerminSlot[]): {
  vorgeschlagen: PortalTerminSlot[];
  bestaetigt: PortalTerminSlot | null;
} {
  const relevant = slots.filter(
    (s) => s.status === "vorgeschlagen" || s.status === "bestaetigt"
  );
  const bestaetigt = relevant.find((s) => s.status === "bestaetigt") ?? null;
  const vorgeschlagen = relevant.filter((s) => s.status === "vorgeschlagen");
  return { vorgeschlagen, bestaetigt };
}

/** Termin-Phase: Handwerker hat Slot vorgeschlagen oder Mieter hat bestätigt. */
export function hasMieterTerminPhase(slots: PortalTerminSlot[]): boolean {
  return slots.some(
    (s) => s.status === "vorgeschlagen" || s.status === "bestaetigt"
  );
}

export function hasOffeneTerminvorschlaege(slots: PortalTerminSlot[]): boolean {
  return slots.some((s) => s.status === "vorgeschlagen");
}
