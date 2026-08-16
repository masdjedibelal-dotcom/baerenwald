import {
  loadHausmeisterForObjekt,
  type HausmeisterAmObjekt,
} from "@/lib/org/org-hausmeister";

export type HausmeisterKontakt = {
  id: string;
  name: string;
  email: string | null;
  telefon: string | null;
  /** HV will Portal / Einladung — noch kein aktives Konto. */
  portalZugang?: boolean;
  /** Portal-Konto ist nach Registrierung/Redeem verknüpft (= aktiviert). */
  portalKundeId?: string | null;
};

/** Konto wirklich aktiv (Redeem), nicht nur „Portal geplant“. */
export function hausmeisterPortalIstAktiv(hm: {
  portalKundeId?: string | null;
  portal_kunde_id?: string | null;
} | null | undefined): boolean {
  const id =
    hm?.portalKundeId?.trim() ||
    (hm as { portal_kunde_id?: string | null } | null | undefined)
      ?.portal_kunde_id?.trim() ||
    "";
  return Boolean(id);
}

export type HausmeisterPortalStatus = "aktiv" | "eingeladen" | "nicht";

export function resolveHausmeisterPortalStatus(hm: {
  portal_zugang?: boolean | null;
  portalZugang?: boolean | null;
  portal_kunde_id?: string | null;
  portalKundeId?: string | null;
} | null | undefined): HausmeisterPortalStatus {
  if (hausmeisterPortalIstAktiv(hm)) return "aktiv";
  if (hm?.portal_zugang || hm?.portalZugang) return "eingeladen";
  return "nicht";
}

export const HAUSMEISTER_PORTAL_STATUS_LABEL: Record<
  HausmeisterPortalStatus,
  string
> = {
  aktiv: "Aktiviert",
  eingeladen: "Einladung ausstehend",
  nicht: "Nein",
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
