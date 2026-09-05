"use client";

import type { ObjektAnlagePortal } from "@/lib/org/objektakte/types";
import { PortalDetailCard } from "@/components/shared/PortalDetailCard";
import { PortalEntityList } from "@/components/shared/PortalEntityList";
import { PortalInboxEmpty } from "@/components/shared/PortalEmptyState";

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
  return `Garantie bis ${d.toLocaleDateString("de-DE", {
    month: "2-digit",
    year: "numeric",
  })}`;
}

export function OrganisationObjektAnlagenPanel({
  anlagen,
}: {
  anlagen: ObjektAnlagePortal[];
}) {
  if (!anlagen.length) {
    return (
      <PortalDetailCard title="Anlagen & Teile">
        <PortalInboxEmpty title="Noch keine Anlagen" compact />
      </PortalDetailCard>
    );
  }

  return (
    <PortalDetailCard title={`Anlagen & Teile · ${anlagen.length}`}>
      <PortalEntityList
        ariaLabel="Anlagen"
        columns={[
          { key: "name", label: "Bezeichnung", width: "minmax(0, 1.4fr)" },
          { key: "gewerk", label: "Gewerk", width: "minmax(0, 0.8fr)" },
          { key: "standort", label: "Standort", width: "minmax(0, 0.8fr)" },
          { key: "status", label: "Status", width: "minmax(0, 0.7fr)" },
          {
            key: "vorgaenge",
            label: "Vorgänge",
            width: "minmax(56px, 0.5fr)",
            align: "right",
          },
        ]}
        rows={anlagen.map((a) => {
          const garantie = fmtGarantie(a.garantieBis);
          const status = STATUS_LABEL[a.status] ?? dash(a.status);
          const metaLine = [
            dash(a.gewerkName) !== "—" ? dash(a.gewerkName) : null,
            dash(a.standort) !== "—" ? dash(a.standort) : null,
            dash(a.einheitLabel) !== "—" ? dash(a.einheitLabel) : null,
          ]
            .filter(Boolean)
            .join(" · ");
          return {
            id: a.id,
            title: dash(a.bezeichnung),
            meta: (
              <div className="space-y-0.5">
                <p>{metaLine || "—"}</p>
                <p className="text-text-tertiary">
                  {status} · {a.vorgangCount} Vorgänge
                  {garantie ? ` · ${garantie}` : ""}
                </p>
              </div>
            ),
            cells: [
              <>
                {dash(a.bezeichnung)}
                {garantie ? (
                  <span className="mt-0.5 block text-[12px] font-normal text-text-tertiary">
                    {garantie}
                  </span>
                ) : null}
              </>,
              dash(a.gewerkName),
              dash(a.standort),
              status,
              a.vorgangCount,
            ],
          };
        })}
      />
    </PortalDetailCard>
  );
}
