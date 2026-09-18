"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { DokumenteTabelle } from "@/components/shared/DokumenteTabelle";
import { PortalInboxEmpty } from "@/components/shared/PortalEmptyState";
import {
  PORTAL_LIST_PAGE_SIZE,
  PortalListPagination,
} from "@/components/shared/PortalListPagination";
import { meldeKategorieLabel } from "@/lib/org/melde-kategorien";
import { meldeKategorieFromLead } from "@/lib/org/org-eingang-utils";
import type { OrganisationLead, OrganisationObjekt } from "@/lib/org/types";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { cn } from "@/lib/utils";

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
  const [openId, setOpenId] = useState<string | null>(null);

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

  const pageKey = pageGruppen.map((g) => g.leadId).join(",");

  useEffect(() => {
    if (pageGruppen.length === 0) {
      setOpenId(null);
      return;
    }
    setOpenId((prev) =>
      prev && pageGruppen.some((g) => g.leadId === prev)
        ? prev
        : pageGruppen[0].leadId
    );
    // pageKey stabilisiert die Seiten-Gruppe; pageGruppen absichtlich nicht als Dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pageKey
  }, [pageKey]);

  if (gruppen.length === 0) {
    return <PortalInboxEmpty title="Noch keine Daten" compact />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold text-text-primary">
          Dokumente
        </p>
        <p className="text-xs text-text-tertiary">
          {totalDocs} {totalDocs === 1 ? "Datei" : "Dateien"} · {gruppen.length}{" "}
          {gruppen.length === 1 ? "Vorgang" : "Vorgänge"}
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {pageGruppen.map((g) => {
          const open = openId === g.leadId;
          return (
            <section
              key={g.leadId}
              className="overflow-hidden rounded-xl border border-border-default bg-white shadow-[0_1px_0_rgba(0,0,0,0.03)]"
            >
              <div className="flex items-stretch gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setOpenId((prev) => (prev === g.leadId ? null : g.leadId))
                  }
                  className="flex min-w-0 flex-1 items-center gap-2 px-3.5 py-3.5 text-left"
                  aria-expanded={open}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-text-primary">
                      {g.title}
                    </p>
                    <p
                      className="mt-0.5 truncate text-[12.5px]"
                      style={{ color: PORTAL_VAR.sub }}
                    >
                      {g.subtitle}
                      {" · "}
                      {g.dokumente.length}{" "}
                      {g.dokumente.length === 1 ? "Datei" : "Dateien"}
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 text-text-tertiary transition-transform",
                      open && "rotate-180"
                    )}
                    aria-hidden
                  />
                </button>
                {onOpenVorgang ? (
                  <button
                    type="button"
                    onClick={() => onOpenVorgang(g.leadId)}
                    className="shrink-0 self-center px-3 text-[12px] font-semibold text-accent hover:underline"
                  >
                    Vorgang
                  </button>
                ) : null}
              </div>
              {open ? (
                <div className="border-t border-border-light px-3.5 pb-3.5 pt-3 sm:px-4">
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
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      {gruppen.length > PORTAL_LIST_PAGE_SIZE ? (
        <PortalListPagination
          totalItems={gruppen.length}
          itemLabel={gruppen.length === 1 ? "Vorgang" : "Vorgänge"}
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setListPage}
        />
      ) : null}
    </div>
  );
}
