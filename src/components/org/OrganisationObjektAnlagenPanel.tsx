"use client";

import type { ObjektAnlagePortal } from "@/lib/org/objektakte/types";
import { PortalInboxEmpty } from "@/components/shared/PortalEmptyState";
import { PORTAL_VAR } from "@/lib/portal2/tokens";

const STATUS_LABEL: Record<string, string> = {
  aktiv: "Aktiv",
  wartung: "In Wartung",
  stillgelegt: "Stillgelegt",
};

function dash(v: string | null | undefined) {
  return v?.trim() || "—";
}

function fmtGarantie(iso: string | null | undefined): string | null {
  const raw = iso?.trim()?.slice(0, 10);
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return `Garantie bis ${d.toLocaleDateString("de-DE", { month: "2-digit", year: "numeric" })}`;
}

export function OrganisationObjektAnlagenPanel({
  anlagen,
}: {
  anlagen: ObjektAnlagePortal[];
}) {
  if (!anlagen.length) {
    return (
      <PortalInboxEmpty
        title="Noch keine Anlagen"
        description="Das Anlagen-Register wird in der Objektakte gepflegt — hier sehen Sie den Stand read-only."
        compact
      />
    );
  }

  return (
    <div className="space-y-2.5">
      <p className="portal-text-section px-0.5">
        Anlagen & Teile ({anlagen.length})
      </p>
      <div
        className="overflow-hidden rounded-[12px] border bg-white"
        style={{ borderColor: PORTAL_VAR.line }}
      >
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b bg-[#fafafa] text-text-tertiary">
                <th className="px-4 py-2.5 font-medium">Bezeichnung</th>
                <th className="px-4 py-2.5 font-medium">Gewerk</th>
                <th className="px-4 py-2.5 font-medium">Standort</th>
                <th className="px-4 py-2.5 font-medium">Einheit</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 text-right font-medium">Vorgänge</th>
              </tr>
            </thead>
            <tbody>
              {anlagen.map((a) => (
                <tr key={a.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3 font-medium text-text-primary">
                    <div>{dash(a.bezeichnung)}</div>
                    {fmtGarantie(a.garantieBis) ? (
                      <div className="portal-text-meta mt-0.5 text-text-tertiary">
                        {fmtGarantie(a.garantieBis)}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {dash(a.gewerkName)}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {dash(a.standort)}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {dash(a.einheitLabel)}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {STATUS_LABEL[a.status] ?? dash(a.status)}
                  </td>
                  <td className="px-4 py-3 text-right text-text-secondary">
                    {a.vorgangCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y sm:hidden">
          {anlagen.map((a) => (
            <div key={a.id} className="space-y-1 px-4 py-3">
              <p className="portal-text-card-title">{dash(a.bezeichnung)}</p>
              <p className="portal-text-meta text-text-secondary">
                {[dash(a.gewerkName), dash(a.standort), dash(a.einheitLabel)]
                  .filter((x) => x !== "—")
                  .join(" · ") || "—"}
              </p>
              <p className="portal-text-meta text-text-tertiary">
                {STATUS_LABEL[a.status] ?? dash(a.status)} · {a.vorgangCount}{" "}
                Vorgänge
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
