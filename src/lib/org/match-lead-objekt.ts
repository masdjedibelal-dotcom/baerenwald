/**
 * Lead ↔ Objekt: UUID-Zuordnung oder Adress-Match (ohne Objekt-ID).
 */

export type AddressFields = {
  strasse?: string | null;
  hausnummer?: string | null;
  plz?: string | null;
  ort?: string | null;
};

export function normalizeAddressToken(raw: string | null | undefined): string {
  return String(raw ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/strasse\b/g, "str")
    .replace(/straße\b/g, "str")
    .replace(/[^a-z0-9]/g, "");
}

export function normalizePlz(raw: string | null | undefined): string {
  return String(raw ?? "").replace(/\D/g, "").slice(0, 5);
}

export function normalizeHausnummer(raw: string | null | undefined): string {
  return normalizeAddressToken(raw);
}

/** Straße + Hausnummer + PLZ (Ort optional) müssen zusammenpassen. */
export function addressesMatch(a: AddressFields, b: AddressFields): boolean {
  const plzA = normalizePlz(a.plz);
  const plzB = normalizePlz(b.plz);
  if (plzA.length >= 4 && plzB.length >= 4 && plzA !== plzB) return false;

  const hnA = normalizeHausnummer(a.hausnummer);
  const hnB = normalizeHausnummer(b.hausnummer);
  if (!hnA || !hnB || hnA !== hnB) return false;

  const stA = normalizeAddressToken(a.strasse);
  const stB = normalizeAddressToken(b.strasse);
  if (stA.length < 3 || stB.length < 3) return false;

  return stA === stB || stA.includes(stB) || stB.includes(stA);
}

export function leadAddressFromFunnel(
  lead: AddressFields & { funnel_daten?: unknown }
): AddressFields {
  const fd =
    lead.funnel_daten &&
    typeof lead.funnel_daten === "object" &&
    !Array.isArray(lead.funnel_daten)
      ? (lead.funnel_daten as Record<string, unknown>)
      : null;
  const ortFromFunnel =
    typeof fd?.ort === "string" && fd.ort.trim() ? fd.ort.trim() : null;
  return {
    strasse: lead.strasse,
    hausnummer: lead.hausnummer,
    plz: lead.plz,
    ort: ortFromFunnel,
  };
}

/**
 * Explizite `kunde_objekt_id` hat Vorrang.
 * Ohne ID: Adress-Match gegen die Objektliste (erster Treffer).
 */
export function resolveLeadObjektId<
  T extends AddressFields & {
    kunde_objekt_id?: string | null;
    funnel_daten?: unknown;
  },
>(
  lead: T,
  objekte: Array<AddressFields & { id: string }>
): string | null {
  const linked = lead.kunde_objekt_id?.trim();
  if (linked) return linked;

  const addr = leadAddressFromFunnel(lead);
  if (
    !normalizeAddressToken(addr.strasse) ||
    !normalizeHausnummer(addr.hausnummer)
  ) {
    return null;
  }

  const hit = objekte.find((o) => addressesMatch(addr, o));
  return hit?.id ?? null;
}

export function leadBelongsToObjekt<
  T extends AddressFields & {
    id?: string;
    kunde_objekt_id?: string | null;
    funnel_daten?: unknown;
  },
>(
  lead: T,
  objekt: AddressFields & { id: string }
): boolean {
  return resolveLeadObjektId(lead, [objekt]) === objekt.id;
}
