import type { FunnelState } from "@/lib/types";

/** JSON-taugliche Darstellung ohne File-Blobs (Fotos nur Metadaten). */
export function serializeFunnelStateForApi(
  state: FunnelState
): Record<string, unknown> {
  const { photos, selectedSlot, ...rest } = state;
  return {
    ...rest,
    selectedSlot: selectedSlot
      ? JSON.stringify(selectedSlot)
      : null,
    photos: photos.map((p) => ({
      name: p.name,
      size: p.size,
      type: p.type,
    })),
  };
}
