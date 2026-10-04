
export type PortalTerminSlot = {
  id: string;
  slot_beginn: string;
  slot_ende?: string | null;
  status: string;
  bestaetigt_am?: string | null;
};

export function hasOffeneTerminvorschlaege(slots: PortalTerminSlot[]): boolean {
  return slots.some((s) => s.status === "vorgeschlagen");
}
