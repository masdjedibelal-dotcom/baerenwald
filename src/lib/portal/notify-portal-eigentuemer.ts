/** Eigentümer: keine Portal-Notifications (Produktentscheidung). */

export type EigentuemerNotifKind = "neu" | "update" | "abgeschlossen";

/**
 * Fan-out an Eigentümer — bewusst no-op.
 */
export async function notifyPortalEigentuemer(_input: {
  leadId: string;
  kind: EigentuemerNotifKind;
  titel: string;
  text: string;
  deepLinkTab?: string | null;
  kundeObjektId?: string | null;
}): Promise<{ ok: boolean; notified: number; error?: string }> {
  return { ok: true, notified: 0 };
}
