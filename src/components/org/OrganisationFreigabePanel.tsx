"use client";

import { useMemo, useState } from "react";

import type { OrgFreigabeAngebot } from "@/components/org/OrgAngebotFreigabeInhalt";
import { OrganisationEingangPanel } from "@/components/org/OrganisationEingangPanel";
import { OrgFreigabeBanner } from "@/components/org/OrgFreigabeBanner";
import { PortalListCard } from "@/components/shared/PortalListCard";
import { buildKundeVorgaenge } from "@/lib/portal/build-kunde-vorgaenge";
import { PortalVorgangDetail } from "@/components/portal/PortalVorgangDetail";
import {
  plattformStatusLabel,
  plattformStatusPillClass,
  resolvePlattformStatus,
} from "@/lib/vorgang/plattform-status";
import type {
  OrganisationKunde,
  OrganisationLead,
  OrganisationObjekt,
} from "@/lib/org/types";
import type { OrgPartnerBefundEntry } from "@/lib/org/load-partner-befund";
import {
  buildAuftragByLeadId,
  isInOrgFreigabeQueue,
} from "@/lib/org/org-vorgang-filter";

type AngebotFreigabe = {
  id: string;
  titel: string;
  leadId: string;
  objektTitel?: string;
  status?: string | null;
};

type OrgFreigabeAngebotRow = {
  id: string;
  titel?: string | null;
  lead_id?: string | null;
  status?: string | null;
  status_einfach?: string | null;
  objekt?: { name?: string | null; titel?: string | null } | null;
};

type BautagebuchEntry = {
  id?: string;
  datum?: string;
  created_at?: string;
  titel?: string;
  notiz?: string;
  fotos_urls?: string[];
};

type Props = {
  kunde: OrganisationKunde;
  eingang: OrganisationLead[];
  objekte: OrganisationObjekt[];
  leads: OrganisationLead[];
  angebote: OrgFreigabeAngebotRow[];
  auftraege?: Parameters<typeof buildKundeVorgaenge>[0]["auftraege"];
  initialSelectedId?: string | null;
  onRefresh: () => void;
  embedded?: boolean;
  partnerBefundByLeadId?: Record<string, OrgPartnerBefundEntry[]>;
  bautagebuchByLeadId?: Record<string, BautagebuchEntry[]>;
  hwErledigtByLeadId?: Record<string, boolean>;
  feedbackBereitByLeadId?: Record<string, boolean>;
  hvFeedbackByLeadId?: Record<
    string,
    {
      bewertung?: { sterne: number; freitext?: string | null } | null;
      maengel?: Array<{ freitext?: string | null; created_at?: string }>;
    }
  >;
  auftragKontextByLeadId?: Record<
    string,
    import("@/lib/portal/vorgang-erledigt").PortalAuftragKontext
  >;
  dokumenteByLeadId?: Record<
    string,
    Array<{
      id: string;
      name: string;
      subtitle?: string;
      datum?: string;
      href: string;
    }>
  >;
};

function buildAngebotFreigaben(
  leads: OrganisationLead[],
  angebote: OrgFreigabeAngebotRow[],
  auftragByLeadId: Record<string, string>
): AngebotFreigabe[] {
  const freigabeLeadIds = new Set(
    leads
      .filter((l) => isInOrgFreigabeQueue(l, auftragByLeadId))
      .filter((l) => l.org_freigabe_status === "ausstehend")
      .map((l) => l.id)
  );

  return angebote
    .filter((a) => a.lead_id && freigabeLeadIds.has(a.lead_id))
    .map((a) => ({
      id: a.id,
      titel: a.titel?.trim() || `Angebot ${a.id.slice(0, 6)}`,
      leadId: String(a.lead_id),
      objektTitel:
        a.objekt?.titel?.trim() ||
        a.objekt?.name?.trim() ||
        undefined,
      status: a.status_einfach ?? a.status,
    }));
}

export function OrganisationFreigabePanel({
  kunde,
  eingang,
  objekte,
  leads,
  angebote,
  auftraege = [],
  initialSelectedId,
  onRefresh,
  embedded = false,
  partnerBefundByLeadId = {},
  bautagebuchByLeadId = {},
  hwErledigtByLeadId = {},
  feedbackBereitByLeadId = {},
  hvFeedbackByLeadId = {},
  auftragKontextByLeadId = {},
  dokumenteByLeadId = {},
}: Props) {
  const [selectedAngebotId, setSelectedAngebotId] = useState<string | null>(null);
  const auftragByLeadId = useMemo(
    () => buildAuftragByLeadId(auftraege as Array<{ id: string; lead_id?: string | null }>),
    [auftraege]
  );
  const freigabeEingang = useMemo(
    () => eingang.filter((l) => isInOrgFreigabeQueue(l, auftragByLeadId)),
    [eingang, auftragByLeadId]
  );
  const angebotFreigaben = buildAngebotFreigaben(leads, angebote, auftragByLeadId);

  const freigabeAngebote = useMemo((): OrgFreigabeAngebot[] => {
    const freigabeLeadIds = new Set(
      leads
        .filter((l) => isInOrgFreigabeQueue(l, auftragByLeadId))
        .filter((l) => l.org_freigabe_status === "ausstehend")
        .map((l) => l.id)
    );
    return angebote
      .filter((a) => a.lead_id && freigabeLeadIds.has(String(a.lead_id)))
      .map((a) => ({
        id: String(a.id),
        lead_id: a.lead_id != null ? String(a.lead_id) : null,
        angebotsnr: (a as { angebotsnr?: string | null }).angebotsnr ?? null,
        gueltig_bis: (a as { gueltig_bis?: string | null }).gueltig_bis ?? null,
        leistungsumfang:
          (a as { leistungsumfang?: string | null }).leistungsumfang ?? null,
        notizen: (a as { notizen?: string | null }).notizen ?? null,
        pdf_url: (a as { pdf_url?: string | null }).pdf_url ?? null,
        gesendet_am: (a as { gesendet_am?: string | null }).gesendet_am ?? null,
        positionenDisplay: (a as { positionenDisplay?: OrgFreigabeAngebot["positionenDisplay"] })
          .positionenDisplay,
        gesamtBrutto: (a as { gesamtBrutto?: number }).gesamtBrutto,
        dokumente: (a as { dokumente?: OrgFreigabeAngebot["dokumente"] }).dokumente,
      }));
  }, [angebote, leads, auftragByLeadId]);

  const vorgaengeItems = buildKundeVorgaenge({
    leads: leads as Parameters<typeof buildKundeVorgaenge>[0]["leads"],
    angebote: angebote as Parameters<typeof buildKundeVorgaenge>[0]["angebote"],
    auftraege,
  });
  const selectedAngebotItem = selectedAngebotId
    ? vorgaengeItems.find(
        (v) =>
          v.id === selectedAngebotId ||
          (v as { angebotId?: string }).angebotId === selectedAngebotId
      )
    : null;

  return (
    <div className="space-y-8">
      {!embedded ? (
        <div>
          <h2 className="text-lg font-semibold">Zur Freigabe</h2>
          <p className="text-sm text-text-secondary">
            Meldungen bearbeiten und Angebote freigeben.
          </p>
        </div>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-text-primary">Meldungen</h3>
        <OrganisationEingangPanel
          kunde={kunde}
          eingang={freigabeEingang}
          objekte={objekte}
          angebote={freigabeAngebote}
          initialSelectedId={initialSelectedId}
          onRefresh={onRefresh}
          partnerBefundByLeadId={partnerBefundByLeadId}
          auftragByLeadId={auftragByLeadId}
          auftragKontextByLeadId={auftragKontextByLeadId}
          bautagebuchByLeadId={bautagebuchByLeadId}
          hwErledigtByLeadId={hwErledigtByLeadId}
          feedbackBereitByLeadId={feedbackBereitByLeadId}
          hvFeedbackByLeadId={hvFeedbackByLeadId}
          dokumenteByLeadId={dokumenteByLeadId}
        />
      </section>

      {angebotFreigaben.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-text-primary">
            Angebote zur Freigabe
          </h3>
          <ul className="space-y-2">
            {angebotFreigaben.map((a) => (
              <li key={a.id} className="card-bordered p-4 space-y-3">
                <PortalListCard
                  accent="angebot"
                  showLeftAccent={false}
                  title={a.titel}
                  subtitle={a.objektTitel ?? "Objekt"}
                  statusLabel={plattformStatusLabel(resolvePlattformStatus(
                    leads.find((l) => l.id === a.leadId) ?? {}
                  ))}
                  statusPillClass={plattformStatusPillClass(resolvePlattformStatus(
                    leads.find((l) => l.id === a.leadId) ?? {}
                  ))}
                  meta={[]}
                  onClick={() => setSelectedAngebotId(a.id)}
                />
                {selectedAngebotId === a.id && selectedAngebotItem ? (
                  <div className="rounded-xl border border-border-default p-3">
                    <PortalVorgangDetail
                      item={selectedAngebotItem}
                      onAccepted={onRefresh}
                    />
                  </div>
                ) : null}
                <OrgFreigabeBanner
                  leadId={a.leadId}
                  status="ausstehend"
                  onUpdated={onRefresh}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
