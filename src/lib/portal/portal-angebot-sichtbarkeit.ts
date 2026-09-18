/**
 * Portal-Sichtbarkeit für Angebote: Entwürfe bleiben CRM-intern.
 * Erst nach Senden (status gesendet / Zeitstempel / Angebotsnummer) dürfen
 * HV/Kunde sie sehen und annehmen/ablehnen — PDF allein reicht nicht.
 */

function normalizeStatus(s?: string | null): string {
  return (s ?? "").toLowerCase().replace(/[\s-]+/g, "_");
}

export type PortalAngebotSichtbarkeitInput = {
  status?: string | null;
  status_einfach?: string | null;
  pdf_url?: string | null;
  angebotsnr?: string | null;
  gesendet_am?: string | null;
  gesendet_kunde_at?: string | null;
};

export function isAngebotEntwurf(
  a: Pick<PortalAngebotSichtbarkeitInput, "status" | "status_einfach">
): boolean {
  const st = normalizeStatus(a.status_einfach ?? a.status);
  return !st || st === "entwurf";
}

function hasGesendetTimestamp(a: PortalAngebotSichtbarkeitInput): boolean {
  return Boolean(
    String(a.gesendet_am ?? "").trim() ||
      String(a.gesendet_kunde_at ?? "").trim()
  );
}

/** Wurde das Angebot an den Kunden/HV gesendet? */
export function isAngebotGesendet(a: PortalAngebotSichtbarkeitInput): boolean {
  if (hasGesendetTimestamp(a)) return true;
  if (String(a.angebotsnr ?? "").trim()) return true;
  const st = normalizeStatus(a.status_einfach ?? a.status);
  return (
    st === "gesendet" ||
    st === "gesendet_kunde" ||
    st.includes("gesendet")
  );
}

/** Im Kunden-/HV-Portal listen / als Vorgangs-Angebot anzeigen. */
export function isAngebotPortalSichtbar(
  a: PortalAngebotSichtbarkeitInput
): boolean {
  const st = normalizeStatus(a.status_einfach ?? a.status);
  if (st === "ersetzt") return false;
  if (isAngebotEntwurf(a)) return false;
  return isAngebotGesendet(a);
}

/** Annehmen/Ablehnen im Portal erlaubt. */
export function isAngebotPortalAnnehmbar(
  a: PortalAngebotSichtbarkeitInput
): boolean {
  if (!isAngebotPortalSichtbar(a)) return false;
  if (!String(a.pdf_url ?? "").trim()) return false;
  const st = normalizeStatus(a.status_einfach ?? a.status);
  if (
    st === "abgelehnt" ||
    st === "ersetzt" ||
    st === "abgelaufen" ||
    st === "angenommen" ||
    st === "kunde_akzeptiert" ||
    st === "beauftragt"
  ) {
    return false;
  }
  return (
    st === "gesendet" ||
    st === "gesendet_kunde" ||
    st.includes("gesendet") ||
    hasGesendetTimestamp(a)
  );
}
