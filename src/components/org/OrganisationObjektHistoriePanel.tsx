"use client";

import { useMemo, useState } from "react";

import type {
  ObjektAnlagePortal,
  ObjektHistorieRowPortal,
} from "@/lib/org/objektakte/types";
import { summeObjektVorgangKosten } from "@/lib/org/objektakte/resolve-objekt-vorgang-kosten";
import { PortalInboxEmpty } from "@/components/shared/PortalEmptyState";
import { PORTAL_VAR } from "@/lib/portal2/tokens";

function fmtDatum(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10) || "—";
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function dash(v: string | null | undefined) {
  return v?.trim() || "—";
}

export function OrganisationObjektHistoriePanel({
  rows,
  anlagen = [],
  onOpenVorgang,
  initialAnlageId,
}: {
  rows: ObjektHistorieRowPortal[];
  anlagen?: ObjektAnlagePortal[];
  onOpenVorgang?: (leadId: string) => void;
  initialAnlageId?: string | null;
}) {
  const [anlageId, setAnlageId] = useState(initialAnlageId?.trim() || "");
  const [gewerk, setGewerk] = useState("");
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");

  const gewerke = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const g = r.gewerkLabel?.trim();
      if (g) set.add(g);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "de"));
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (anlageId && r.anlageId !== anlageId) return false;
      if (gewerk && r.gewerkLabel?.trim() !== gewerk) return false;
      const d = r.datum.slice(0, 10);
      if (von && d < von) return false;
      if (bis && d > bis) return false;
      return true;
    });
  }, [rows, anlageId, gewerk, von, bis]);

  const { summe, ohneAngabe } = useMemo(
    () => summeObjektVorgangKosten(filtered),
    [filtered]
  );

  return (
    <div className="space-y-4">
      <div
        className="space-y-3 rounded-[12px] border bg-white p-4"
        style={{ borderColor: PORTAL_VAR.line }}
      >
        <div>
          <p className="portal-text-section">Historie</p>
          <p className="portal-text-meta mt-0.5 text-text-tertiary">
            Chronologische Maßnahmen — fehlende Zuordnungen als „—".
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {anlagen.length ? (
            <label className="block">
              <span className="portal-text-label mb-1.5 block text-text-secondary">
                Anlage
              </span>
              <select
                className="portal-field w-full"
                value={anlageId}
                onChange={(e) => setAnlageId(e.target.value)}
              >
                <option value="">Alle</option>
                {anlagen.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.bezeichnung}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {gewerke.length ? (
            <label className="block">
              <span className="portal-text-label mb-1.5 block text-text-secondary">
                Gewerk
              </span>
              <select
                className="portal-field w-full"
                value={gewerk}
                onChange={(e) => setGewerk(e.target.value)}
              >
                <option value="">Alle</option>
                {gewerke.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="block">
            <span className="portal-text-label mb-1.5 block text-text-secondary">
              Von
            </span>
            <input
              type="date"
              className="portal-field w-full"
              value={von}
              onChange={(e) => setVon(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="portal-text-label mb-1.5 block text-text-secondary">
              Bis
            </span>
            <input
              type="date"
              className="portal-field w-full"
              value={bis}
              onChange={(e) => setBis(e.target.value)}
            />
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <PortalInboxEmpty
          title="Keine Einträge"
          description={
            rows.length === 0
              ? "Noch keine Vorgänge an diesem Objekt."
              : "Filter anpassen oder zurücksetzen."
          }
          compact
        />
      ) : (
        <div
          className="overflow-hidden rounded-[12px] border bg-white"
          style={{ borderColor: PORTAL_VAR.line }}
        >
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b bg-white text-text-tertiary">
                  <th className="px-4 py-2.5 font-medium">Datum</th>
                  <th className="px-4 py-2.5 font-medium">Titel</th>
                  <th className="px-4 py-2.5 font-medium">Einheit</th>
                  <th className="px-4 py-2.5 font-medium">Anlage</th>
                  <th className="px-4 py-2.5 font-medium">Gewerk</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Kosten</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.leadId}
                    className="border-b last:border-b-0 hover:bg-[#fafafa]"
                  >
                    <td className="px-4 py-3 text-text-secondary">
                      {fmtDatum(r.datum)}
                    </td>
                    <td className="px-4 py-3">
                      {onOpenVorgang ? (
                        <button
                          type="button"
                          onClick={() => onOpenVorgang(r.leadId)}
                          className="text-left font-medium text-primary hover:underline"
                        >
                          {r.titel}
                        </button>
                      ) : (
                        <span className="font-medium">{r.titel}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {dash(r.einheitLabel)}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {dash(r.anlageLabel)}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {dash(r.gewerkLabel)}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {r.statusLabel}
                    </td>
                    <td
                      className={`px-4 py-3 text-right ${r.kostenEuro == null ? "text-text-tertiary" : "text-text-secondary"}`}
                    >
                      {r.kostenLabel}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-white">
                  <td
                    colSpan={6}
                    className="px-4 py-2.5 text-text-tertiary"
                  >
                    Summe (nur mit Kostenangabe)
                    {ohneAngabe > 0
                      ? ` · ${ohneAngabe} ohne Kostenangabe`
                      : ""}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium">
                    {summe > 0 ? `${summe.toLocaleString("de-DE")} €` : "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="divide-y sm:hidden">
            {filtered.map((r) => (
              <button
                key={r.leadId}
                type="button"
                onClick={() => onOpenVorgang?.(r.leadId)}
                className="w-full space-y-1 px-4 py-3 text-left"
                disabled={!onOpenVorgang}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="portal-text-card-title">{r.titel}</p>
                  <span className="portal-text-meta shrink-0 text-text-tertiary">
                    {fmtDatum(r.datum)}
                  </span>
                </div>
                <p className="portal-text-meta text-text-secondary">
                  {[dash(r.einheitLabel), dash(r.anlageLabel), dash(r.gewerkLabel)]
                    .filter((x) => x !== "—")
                    .join(" · ") || "—"}
                </p>
                <p className="portal-text-meta text-text-tertiary">
                  {r.statusLabel} · {r.kostenLabel}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
