"use client";

import { useMemo, useState } from "react";

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
import type { OrgPartnerBefundEntry } from "@/lib/org/load-partner-befund";
import type {
  OrganisationKunde,
  OrganisationLead,
  OrganisationObjekt,
} from "@/lib/org/types";

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
};

function buildAngebotFreigaben(
  leads: OrganisationLead[],
  angebote: OrgFreigabeAngebotRow[]
): AngebotFreigabe[] {
  const freigabeLeadIds = new Set(
    leads
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
}: Props) {
  const [selectedAngebotId, setSelectedAngebotId] = useState<string | null>(null);
  const angebotFreigaben = buildAngebotFreigaben(leads, angebote);

  const auftragByLeadId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of auftraege) {
      const leadId = (a as { lead_id?: string | null }).lead_id;
      if (leadId) map[String(leadId)] = String((a as { id: string }).id);
    }
    return map;
  }, [auftraege]);

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
          eingang={eingang}
          objekte={objekte}
          initialSelectedId={initialSelectedId}
          onRefresh={onRefresh}
          partnerBefundByLeadId={partnerBefundByLeadId}
          auftragByLeadId={auftragByLeadId}
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
