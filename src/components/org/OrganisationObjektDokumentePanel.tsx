"use client";

import { useMemo, useState } from "react";

import { DokumenteTabelle } from "@/components/shared/DokumenteTabelle";
import {
  PORTAL_LIST_PAGE_SIZE,
  PortalListPagination,
} from "@/components/shared/PortalListPagination";
import { meldeKategorieLabel } from "@/lib/org/melde-kategorien";
import { meldeKategorieFromLead } from "@/lib/org/org-eingang-utils";
import type { OrganisationLead, OrganisationObjekt } from "@/lib/org/types";
import { PORTAL_VAR } from "@/lib/portal2/tokens";

export type ObjektDokumentEintrag = {
  id: string;
  name: string;
  subtitle?: string;
  datum?: string;
  href: string;
};

type VorgangDokGruppe = {
  leadId: string;
  title: string;
  subtitle: string;
  dokumente: ObjektDokumentEintrag[];
};

type Props = {
  objekt: OrganisationObjekt;
  leads: OrganisationLead[];
  dokumenteByLeadId?: Record<string, ObjektDokumentEintrag[]>;
  onOpenVorgang?: (leadId: string) => void;
};

function buildSubtitle(lead: OrganisationLead, objektTitel: string): string {
  const adresse = [lead.strasse, lead.hausnummer].filter(Boolean).join(" ");
  const we = lead.melder_einheit?.trim()
    ? /^(WE|Whg)/i.test(lead.melder_einheit.trim())
      ? lead.melder_einheit.trim()
      : `WE ${lead.melder_einheit.trim()}`
    : undefined;
  const person = lead.melder_name?.trim() || undefined;
  return [adresse || objektTitel || "Objekt", we, person]
    .filter(Boolean)
    .join(" · ");
}

export function OrganisationObjektDokumentePanel({
  objekt,
  leads,
  dokumenteByLeadId = {},
  onOpenVorgang,
}: Props) {
  const [listPage, setListPage] = useState(1);

  const gruppen = useMemo((): VorgangDokGruppe[] => {
    const rows: VorgangDokGruppe[] = [];
    for (const lead of leads) {
      const docs = dokumenteByLeadId[lead.id] ?? [];
      if (docs.length === 0) continue;
      const kat = meldeKategorieLabel(
        meldeKategorieFromLead(lead) ?? undefined
      );
      rows.push({
        leadId: lead.id,
        title: kat,
        subtitle: buildSubtitle(lead, objekt.titel),
        dokumente: docs,
      });
    }
    rows.sort((a, b) => {
      const da = a.dokumente[0]?.datum ?? "";
      const db = b.dokumente[0]?.datum ?? "";
      return db.localeCompare(da);
    });
    return rows;
  }, [leads, dokumenteByLeadId, objekt.titel]);

  const totalDocs = useMemo(
    () => gruppen.reduce((n, g) => n + g.dokumente.length, 0),
    [gruppen]
  );

  const totalPages = Math.max(
    1,
    Math.ceil(gruppen.length / PORTAL_LIST_PAGE_SIZE)
  );
  const safePage = Math.min(listPage, totalPages);
  const pageGruppen = gruppen.slice(
    (safePage - 1) * PORTAL_LIST_PAGE_SIZE,
    safePage * PORTAL_LIST_PAGE_SIZE
  );

  if (gruppen.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border-light bg-muted/20 px-4 py-10 text-center">
        <p className="portal-text-body text-text-secondary">
          Noch keine Dokumente zu Vorgängen an diesem Objekt.
        </p>
        <p
          className="mt-1.5 text-[12.5px] leading-snug"
          style={{ color: PORTAL_VAR.sub }}
        >
          Angebote, Protokolle und Unterlagen erscheinen hier, sobald sie im
          Vorgang vorliegen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0 overflow-hidden rounded-xl border border-border-default bg-white">
      <div className="flex items-baseline justify-between gap-2 border-b border-border-light px-3.5 py-3 sm:px-4">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold text-text-primary">
          Dokumente
        </p>
        <p className="text-xs text-text-tertiary">
          {totalDocs} {totalDocs === 1 ? "Datei" : "Dateien"} · {gruppen.length}{" "}
          {gruppen.length === 1 ? "Vorgang" : "Vorgänge"}
        </p>
      </div>

      <div className="flex flex-col gap-0 divide-y divide-border-light">
        {pageGruppen.map((g) => (
          <section key={g.leadId} className="px-3.5 py-4 sm:px-4">
            <div className="mb-2.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold text-text-primary">
                  {g.title}
                </p>
                <p
                  className="mt-0.5 truncate text-[12.5px]"
                  style={{ color: PORTAL_VAR.sub }}
                >
                  {g.subtitle}
                </p>
              </div>
              {onOpenVorgang ? (
                <button
                  type="button"
                  onClick={() => onOpenVorgang(g.leadId)}
                  className="shrink-0 rounded-full border border-border-default px-2.5 py-1 text-[12px] font-semibold text-accent hover:bg-accent/5"
                >
                  Vorgang ›
                </button>
              ) : null}
            </div>
            <DokumenteTabelle
              heading=""
              className="!border-0 !pt-0"
              emptyText="Keine Dokumente."
              dokumente={g.dokumente.map((d) => ({
                id: d.id,
                name: d.subtitle ? `${d.name} — ${d.subtitle}` : d.name,
                datum: d.datum,
                href: d.href,
              }))}
            />
          </section>
        ))}
      </div>

      {gruppen.length > PORTAL_LIST_PAGE_SIZE ? (
        <PortalListPagination
          totalItems={gruppen.length}
          itemLabel={gruppen.length === 1 ? "Vorgang" : "Vorgänge"}
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setListPage}
        />
      ) : (
        <div className="border-t border-border-light px-3 py-2.5 sm:px-4">
          <p className="portal-text-meta text-text-secondary">
            <span className="font-medium text-text-primary">
              {gruppen.length}
            </span>{" "}
            {gruppen.length === 1 ? "Vorgang" : "Vorgänge"}
          </p>
        </div>
      )}
    </div>
  );
}
