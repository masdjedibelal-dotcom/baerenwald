"use client";

import { useMemo, useState } from "react";

import type {
  ObjektAnlagePortal,
  ObjektHistorieRowPortal,
} from "@/lib/org/objektakte/types";
import { summeObjektVorgangKosten } from "@/lib/org/objektakte/resolve-objekt-vorgang-kosten";
import { PortalDetailCard } from "@/components/shared/PortalDetailCard";
import { PortalInboxEmpty } from "@/components/shared/PortalEmptyState";

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
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (anlageId && r.anlageId !== anlageId) return false;
      const d = r.datum.slice(0, 10);
      if (von && d < von) return false;
      if (bis && d > bis) return false;
      return true;
    });
  }, [rows, anlageId, von, bis]);

  const { summe, ohneAngabe } = useMemo(
    () => summeObjektVorgangKosten(filtered),
    [filtered]
  );

  return (
    <PortalDetailCard title="Historie" chrome="card" bodyClassName="space-y-0">
      <div className="grid grid-cols-3 gap-2 pb-4 sm:gap-3">
        <label className="block min-w-0">
          <span className="portal-text-label mb-1.5 block text-text-secondary">
            Von
          </span>
          <input
            type="date"
            className="portal-field w-full min-w-0"
            value={von}
            onChange={(e) => setVon(e.target.value)}
          />
        </label>
        <label className="block min-w-0">
          <span className="portal-text-label mb-1.5 block text-text-secondary">
            Bis
          </span>
          <input
            type="date"
            className="portal-field w-full min-w-0"
            value={bis}
            onChange={(e) => setBis(e.target.value)}
          />
        </label>
        <label className="block min-w-0">
          <span className="portal-text-label mb-1.5 block text-text-secondary">
            Anlage
          </span>
          <select
            className="portal-field w-full min-w-0"
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
      </div>

      {filtered.length === 0 ? (
        <div className="border-t border-border-light pt-4">
          <PortalInboxEmpty
            title="Keine Einträge"
            description={
              rows.length === 0
                ? "Noch keine Vorgänge an diesem Objekt."
                : "Filter anpassen oder zurücksetzen."
            }
            compact
          />
        </div>
      ) : (
        <div className="border-t border-border-light">
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border-light text-text-tertiary">
                  <th className="px-0 py-2.5 pr-3 font-medium">Datum</th>
                  <th className="px-3 py-2.5 font-medium">Titel</th>
                  <th className="px-3 py-2.5 font-medium">Einheit</th>
                  <th className="px-3 py-2.5 font-medium">Anlage</th>
                  <th className="px-3 py-2.5 font-medium">Gewerk</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="py-2.5 pl-3 text-right font-medium">Kosten</th>
                </tr>
              </thead>
              <tbody className="portal-text-meta">
                {filtered.map((r) => (
                  <tr
                    key={r.leadId}
                    className="border-b border-border-light last:border-b-0 hover:bg-[#fafafa]"
                  >
                    <td className="py-3 pr-3 text-text-secondary">
                      {fmtDatum(r.datum)}
                    </td>
                    <td className="px-3 py-3">
                      {onOpenVorgang ? (
                        <button
                          type="button"
                          onClick={() => onOpenVorgang(r.leadId)}
                          className="portal-text-body text-left font-semibold text-primary hover:underline"
                        >
                          {r.titel}
                        </button>
                      ) : (
                        <span className="portal-text-body font-semibold">
                          {r.titel}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-text-secondary">
                      {dash(r.einheitLabel)}
                    </td>
                    <td className="px-3 py-3 text-text-secondary">
                      {dash(r.anlageLabel)}
                    </td>
                    <td className="px-3 py-3 text-text-secondary">
                      {dash(r.gewerkLabel)}
                    </td>
                    <td className="px-3 py-3 text-text-secondary">
                      {r.statusLabel}
                    </td>
                    <td
                      className={`py-3 pl-3 text-right ${r.kostenEuro == null ? "text-text-tertiary" : "text-text-secondary"}`}
                    >
                      {r.kostenLabel}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} className="py-2.5 text-text-tertiary">
                    Summe (nur mit Kostenangabe)
                    {ohneAngabe > 0
                      ? ` · ${ohneAngabe} ohne Kostenangabe`
                      : ""}
                  </td>
                  <td className="py-2.5 pl-3 text-right font-semibold">
                    {summe > 0 ? `${summe.toLocaleString("de-DE")} €` : "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="divide-y divide-border-light sm:hidden">
            {filtered.map((r) => (
              <button
                key={r.leadId}
                type="button"
                onClick={() => onOpenVorgang?.(r.leadId)}
                className="w-full space-y-1 py-3 text-left first:pt-0"
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
    </PortalDetailCard>
  );
}
