import type { PortalAbnahmeCheckliste } from "@/lib/portal/portal-detail-item";

/** Aus auftrag_abnahmeprotokolle.punkte / .maengel → HV/Kunde-Abschlussansicht. */
export function buildPortalAbnahmeCheckliste(
  protokolle: Array<{
    punkte?: unknown;
    maengel?: unknown;
    freigabe_status?: string | null;
  }>
): PortalAbnahmeCheckliste | null {
  if (!protokolle.length) return null;

  const leistungen: PortalAbnahmeCheckliste["leistungen"] = [];
  const maengel: PortalAbnahmeCheckliste["maengel"] = [];
  const seenLeistungen = new Set<string>();

  for (const proto of protokolle) {
    const freigabe = String(proto.freigabe_status ?? "").toLowerCase();
    // Entwürfe ohne Freigabe-Pfad: trotzdem anzeigen wenn punkte da
    void freigabe;

    const punkte = Array.isArray(proto.punkte) ? proto.punkte : [];
    for (const raw of punkte) {
      const p = raw as Record<string, unknown>;
      const name =
        String(p.leistung_name ?? "").trim() ||
        String(p.beschreibung ?? "").trim() ||
        String(p.gewerk ?? "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seenLeistungen.has(key)) continue;
      seenLeistungen.add(key);
      const status = String(p.status ?? "ok").toLowerCase();
      leistungen.push({
        name,
        ok: status === "ok" || status === "erledigt",
      });
    }

    const mangelRows = Array.isArray(proto.maengel) ? proto.maengel : [];
    for (const raw of mangelRows) {
      const m = raw as Record<string, unknown>;
      const titel =
        String(m.titel ?? "").trim() ||
        String(m.beschreibung ?? "").trim() ||
        "Mangel";
      const status = String(m.status ?? "offen").toLowerCase();
      if (status === "behoben" || status === "abgenommen") continue;
      maengel.push({ titel, status });
    }
  }

  if (!leistungen.length && !maengel.length) return null;
  return { leistungen, maengel };
}
