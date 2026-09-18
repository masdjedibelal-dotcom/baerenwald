/**
 * Client: ob HV an den Objekt-HM delegieren darf (zugewiesen + Portal aktiv).
 */

export type ObjektHmDelegierbar = {
  assigned: boolean;
  portalAktiv: boolean;
  canDelegate: boolean;
};

export async function fetchObjektHmDelegierbar(
  kundeObjektId: string | null | undefined
): Promise<ObjektHmDelegierbar> {
  const oid = String(kundeObjektId ?? "").trim();
  if (!oid) {
    return { assigned: false, portalAktiv: false, canDelegate: false };
  }
  try {
    const res = await fetch(
      `/api/org/hausmeister?objektId=${encodeURIComponent(oid)}`
    );
    if (!res.ok) {
      return { assigned: false, portalAktiv: false, canDelegate: false };
    }
    const json = (await res.json()) as {
      amObjekt?: {
        portal_kunde_id?: string | null;
        portal_zugang?: boolean;
      } | null;
    };
    const assigned = Boolean(json.amObjekt);
    const portalAktiv = Boolean(
      String(json.amObjekt?.portal_kunde_id ?? "").trim()
    );
    return {
      assigned,
      portalAktiv,
      canDelegate: assigned && portalAktiv,
    };
  } catch {
    return { assigned: false, portalAktiv: false, canDelegate: false };
  }
}
