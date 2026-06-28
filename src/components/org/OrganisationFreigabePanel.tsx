"use client";

import { OrganisationEingangPanel } from "@/components/org/OrganisationEingangPanel";
import { OrgFreigabeBanner } from "@/components/org/OrgFreigabeBanner";
import { PortalListCard } from "@/components/shared/PortalListCard";
import { fmtPortalStatus } from "@/lib/portal/portal-display";
import { portalDetailStatusPillClass } from "@/lib/shared/portal-detail-format";
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
  initialSelectedId?: string | null;
  onRefresh: () => void;
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
  initialSelectedId,
  onRefresh,
}: Props) {
  const angebotFreigaben = buildAngebotFreigaben(leads, angebote);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Zur Freigabe</h2>
        <p className="text-sm text-text-secondary">
          Meldungen bearbeiten und Angebote freigeben — danach unter Aufträge
          verfolgen.
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-text-primary">Meldungen</h3>
        <OrganisationEingangPanel
          kunde={kunde}
          eingang={eingang}
          objekte={objekte}
          initialSelectedId={initialSelectedId}
          onRefresh={onRefresh}
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
                  statusLabel={fmtPortalStatus(a.status ?? "ausstehend")}
                  statusPillClass={portalDetailStatusPillClass("wartet")}
                  meta={[]}
                  onClick={() => {}}
                />
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
