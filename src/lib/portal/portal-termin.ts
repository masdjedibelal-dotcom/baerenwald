import { formatMeldeSlotLine } from "@/lib/portal2/melde-slots";

export type PortalTerminSlot = {
  id: string;
  slot_beginn: string;
  slot_ende?: string | null;
  status: string;
  bestaetigt_am?: string | null;
};

/** @deprecated Prefer {@link formatMeldeSlotLine} (Mock MELDE_SLOTS inkl. Ende). */
export function fmtPortalTerminSlot(iso: string): string {
  return formatMeldeSlotLine({ slot_beginn: iso, slot_ende: null });
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
