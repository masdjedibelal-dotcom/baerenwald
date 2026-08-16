import {
  loadHausmeisterForObjekt,
  type HausmeisterAmObjekt,
} from "@/lib/org/org-hausmeister";

export type HausmeisterKontakt = {
  id: string;
  name: string;
  email: string | null;
  telefon: string | null;
  portalZugang?: boolean;
  portalKundeId?: string | null;
};

/** Erster / zugewiesener Hausmeister am Objekt (org_hausmeister oder Legacy-Kontakt). */
export async function loadObjektHausmeisterKontakt(
  kundeObjektId: string | null | undefined
): Promise<HausmeisterKontakt | null> {
  const hm = await loadHausmeisterForObjekt(kundeObjektId);
  if (!hm) return null;
  return toKontakt(hm);
}

function toKontakt(hm: HausmeisterAmObjekt): HausmeisterKontakt {
  return {
    id: hm.id,
    name: hm.name,
    email: hm.email,
    telefon: null,
    portalZugang: hm.portal_zugang,
    portalKundeId: hm.portal_kunde_id,
  };
}

export async function objektHasHausmeisterKontakt(
  kundeObjektId: string | null | undefined
): Promise<boolean> {
  const k = await loadObjektHausmeisterKontakt(kundeObjektId);
  return k != null;
}
