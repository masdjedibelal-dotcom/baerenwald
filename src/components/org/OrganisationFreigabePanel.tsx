"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
import { HvAngebotListActions } from "@/components/org/HvAngebotListActions";
import {
  HV_ANGEBOT_BANNER,
  HV_SECTION_ANGEBOTE,
  HV_SECTION_EMPTY,
  HV_SECTION_MELDUNGEN,
} from "@/lib/portal2/hv-liste";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
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
  auftragIdByLeadId?: Record<string, string>;
  hvAbnahmeByLeadId?: Record<
    string,
    {
      art: "ohne_vorbehalt" | "mit_anmerkung" | "zurueckgewiesen";
      anmerkung?: string | null;
      signiert_name: string;
      signiert_am: string;
    }
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
  hvAbnahmeByLeadId = {},
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlDetailId = searchParams.get("id")?.trim() || null;
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
    hvPortalMode: true,
  });
  const selectedAngebotItem = selectedAngebotId
    ? vorgaengeItems.find(
        (v) =>
          v.id === selectedAngebotId ||
          (v as { angebotId?: string }).angebotId === selectedAngebotId
      )
    : null;

  const eingangDetailProps = {
    kunde,
    eingang: freigabeEingang,
    objekte,
    angebote: freigabeAngebote,
    initialSelectedId: initialSelectedId ?? urlDetailId,
    onRefresh,
    partnerBefundByLeadId,
    auftragByLeadId,
    auftragKontextByLeadId,
    bautagebuchByLeadId,
    hwErledigtByLeadId,
    feedbackBereitByLeadId,
    hvFeedbackByLeadId,
    dokumenteByLeadId,
    hvAbnahmeByLeadId,
    listActions: true as const,
  };

  /** Mock: Detail ist eigener Screen — kein Split / Inline-Expand. */
  if (selectedAngebotItem) {
    const leadId =
      (selectedAngebotItem as { leadId?: string }).leadId ??
      selectedAngebotItem.id;
    const schwelleEur = Number(kunde.freigabe_schwelle_eur ?? 500);
    const betrag = Number(selectedAngebotItem.gesamtBrutto ?? 0);
    const unterSchwelle = betrag > 0 && betrag <= schwelleEur;
    const schwelleLabel = new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(schwelleEur);
    return (
      <div className="-mx-4 -mt-2 min-w-0 lg:-mx-6">
        <OrgFreigabeBanner
          leadId={leadId}
          status={unterSchwelle ? "nicht_noetig" : "ausstehend"}
          unterSchwelle={unterSchwelle}
          schwelleLabel={schwelleLabel}
          onUpdated={onRefresh}
        />
        <PortalVorgangDetail
          item={selectedAngebotItem}
          onAccepted={onRefresh}
          showHvAbnahme
          showAnlassBadge
          orgFreigabeStatus={unterSchwelle ? "nicht_noetig" : "ausstehend"}
          schwelleEur={schwelleEur}
          onBack={() => {
            setSelectedAngebotId(null);
            router.replace(`/portal?section=vorgaenge&filter=offen`, {
              scroll: false,
            });
          }}
        />
      </div>
    );
  }

  if (urlDetailId) {
    return <OrganisationEingangPanel {...eingangDetailProps} />;
  }

  return (
    <div className="space-y-6">
      {!embedded ? (
        <div>
          <h2 className="text-lg font-semibold">Zur Freigabe</h2>
          <p className="text-sm text-text-secondary">
            Meldungen bearbeiten und Angebote freigeben.
          </p>
        </div>
      ) : null}

      <section className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <h3
            className="text-sm font-bold"
            style={{
              color: PORTAL_VAR.ink,
              fontFamily: "var(--p2-font-head, " + PORTAL_VAR.head + ")",
            }}
          >
            {HV_SECTION_MELDUNGEN}
          </h3>
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-bold"
            style={{ color: PORTAL_VAR.faint, background: "#eceef0" }}
          >
            {freigabeEingang.length}
          </span>
        </div>
        {freigabeEingang.length === 0 ? (
          <p
            className="rounded-xl border bg-white py-7 text-center text-[12.5px]"
            style={{ color: PORTAL_VAR.faint, borderColor: PORTAL_VAR.line }}
          >
            {HV_SECTION_EMPTY}
          </p>
        ) : (
          <OrganisationEingangPanel {...eingangDetailProps} />
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <h3
            className="text-sm font-bold"
            style={{
              color: PORTAL_VAR.ink,
              fontFamily: "var(--p2-font-head, " + PORTAL_VAR.head + ")",
            }}
          >
            {HV_SECTION_ANGEBOTE}
          </h3>
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-bold"
            style={{ color: PORTAL_VAR.faint, background: "#eceef0" }}
          >
            {angebotFreigaben.length}
          </span>
        </div>
        {angebotFreigaben.length > 0 ? (
          <div
            className="mx-0 mb-2.5 flex items-center gap-2 rounded-[9px] px-3.5 py-2.5 text-[12.5px] font-semibold"
            style={{ background: "#FBF1D6", color: "#8A5A06" }}
          >
            <span aria-hidden>●</span>
            {HV_ANGEBOT_BANNER}
          </div>
        ) : null}
        {angebotFreigaben.length === 0 ? (
          <p
            className="rounded-xl border bg-white py-7 text-center text-[12.5px]"
            style={{ color: PORTAL_VAR.faint, borderColor: PORTAL_VAR.line }}
          >
            {HV_SECTION_EMPTY}
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {angebotFreigaben.map((a) => {
              const lead = leads.find((l) => l.id === a.leadId);
              const adresse = [
                lead?.strasse,
                lead?.hausnummer,
              ]
                .filter(Boolean)
                .join(" ");
              const we = lead?.melder_einheit?.trim()
                ? /^(WE|Whg)/i.test(lead.melder_einheit.trim())
                  ? lead.melder_einheit.trim()
                  : `WE ${lead.melder_einheit.trim()}`
                : undefined;
              const person = lead?.melder_name?.trim() || undefined;
              const subtitle = [
                adresse || a.objektTitel || "Objekt",
                we,
                person,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <div key={a.id} className="space-y-2">
                  <PortalListCard
                    variant="responsive"
                    accent="angebot"
                    showChevron
                    title={a.titel}
                    subtitle={subtitle}
                    statusLabel={plattformStatusLabel(
                      resolvePlattformStatus(lead ?? {})
                    )}
                    statusPillClass={plattformStatusPillClass(
                      resolvePlattformStatus(lead ?? {})
                    )}
                    meta={[]}
                    onClick={() => {
                      setSelectedAngebotId(a.id);
                      router.replace(
                        `/portal?section=vorgaenge&filter=offen&id=${encodeURIComponent(a.leadId)}`,
                        { scroll: false }
                      );
                    }}
                  />
                  <div className="px-1">
                    <HvAngebotListActions
                      leadId={a.leadId}
                      onUpdated={onRefresh}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
