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

/**
 * Delegation (hm_begutachten): Objekt-HM muss zugewiesen und Portal-Konto aktiv sein.
 */
export function assertHausmeisterDelegierbar(
  hm: HausmeisterKontakt | null | undefined
):
  | { ok: true; hm: HausmeisterKontakt }
  | { ok: false; error: string } {
  if (!hm) {
    return {
      ok: false,
      error:
        "Am Objekt ist kein Hausmeister zugewiesen. Bitte unter Objekt → Hausmeister zuweisen.",
    };
  }
  if (!hausmeisterPortalIstAktiv(hm)) {
    return {
      ok: false,
      error: hm.portalZugang
        ? "Hausmeister-Portal ist noch nicht aktiviert. Bitte Einladung abschließen, bevor Sie delegieren."
        : "Hausmeister hat keinen aktiven Portal-Zugang. Bitte unter Objekt → Hausmeister Portal aktivieren.",
    };
  }
  return { ok: true, hm };
}

export function hausmeisterKannDelegiertWerden(
  hm: HausmeisterKontakt | null | undefined
): boolean {
  return assertHausmeisterDelegierbar(hm).ok;
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
