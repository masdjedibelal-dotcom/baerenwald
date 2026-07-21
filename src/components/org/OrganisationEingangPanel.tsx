"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Filter, Mail, Phone, X } from "lucide-react";

import { OrgFreigabeBanner } from "@/components/org/OrgFreigabeBanner";
import { OrgMeldungAktionBanner } from "@/components/org/OrgMeldungAktionBanner";
import { HvMeldungListActions } from "@/components/org/HvMeldungListActions";
import { BautagebuchAccordionList } from "@/components/shared/BautagebuchAccordionList";
import { orgPortalToast } from "@/lib/shared/portal-toast";
import type { OrgPartnerBefundEntry } from "@/lib/org/load-partner-befund";
import { PortalListCard } from "@/components/shared/PortalListCard";
import { formatPreisspanneDisplay } from "@/lib/org/hv-meldung-workflow";
import { meldeKategorieLabel } from "@/lib/org/melde-kategorien";
import {
  isMeldeNotfall,
  meldeFotosFromLead,
  meldeKategorieFromLead,
} from "@/lib/org/org-eingang-utils";
import { leadBelongsToObjekt } from "@/lib/org/match-lead-objekt";
import type {
  OrganisationKunde,
  OrganisationLead,
  OrganisationObjekt,
} from "@/lib/org/types";
import {
  plattformStatusLabel,
  plattformStatusPillClass,
  resolvePlattformStatus,
} from "@/lib/vorgang/plattform-status";
import { cn } from "@/lib/utils";
import { OrgVorgangFeedbackSection } from "@/components/org/OrgVorgangFeedbackSection";
import { OrganisationVorgangNotizenPanel } from "@/components/org/OrganisationObjektNotizenPanel";
import {
  OrgAngebotFreigabeInhalt,
  orgAngebotPdfZeilen,
  type OrgFreigabeAngebot,
} from "@/components/org/OrgAngebotFreigabeInhalt";
import { DokumenteTabelle } from "@/components/shared/DokumenteTabelle";
import { VersicherungsakteButton } from "@/components/org/VersicherungsakteButton";
import { VorgangKommentareThread } from "@/components/org/VorgangKommentareThread";
import { VorgangStornoDialog } from "@/components/org/VorgangStornoDialog";
import { KostentraegerSelector } from "@/components/org/KostentraegerSelector";

type Props = {
  kunde: OrganisationKunde;
  eingang: OrganisationLead[];
  objekte: OrganisationObjekt[];
  angebote?: OrgFreigabeAngebot[];
  initialSelectedId?: string | null;
  onRefresh: () => void;
  /** Mock D2: Aktionen unter jeder Listenzeile */
  listActions?: boolean;
  partnerBefundByLeadId?: Record<string, OrgPartnerBefundEntry[]>;
  auftragByLeadId?: Record<string, string>;
  auftragKontextByLeadId?: Record<
    string,
    import("@/lib/portal/vorgang-erledigt").PortalAuftragKontext
  >;
  bautagebuchByLeadId?: Record<
    string,
    Array<{
      id?: string;
      datum?: string;
      created_at?: string;
      titel?: string;
      notiz?: string;
      fotos_urls?: string[];
    }>
  >;
  hwErledigtByLeadId?: Record<string, boolean>;
  feedbackBereitByLeadId?: Record<string, boolean>;
  dokumenteByLeadId?: Record<
    string,
    Array<{
      id: string;
      name: string;
      subtitle?: string;
      datum?: string;
      href: string;
      art?: string;
    }>
  >;
  hvFeedbackByLeadId?: Record<
    string,
    {
      bewertung?: { sterne: number; freitext?: string | null } | null;
      maengel?: Array<{ freitext?: string | null; created_at?: string }>;
    }
  >;
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

type StatusFilter = "alle" | "neu" | "wartet_melder" | "in_bearbeitung";

function MeldungDetail({
  lead,
  kunde,
  angebot,
  onRefresh,
  onClose,
  showClose,
  partnerBefunde,
  auftragId,
  bautagebuchEintraege,
  hwErledigt,
  feedbackBereit,
  hvFeedback,
  hvAbnahme: _hvAbnahme,
  vorgangUnterlagen,
}: {
  lead: OrganisationLead;
  kunde: OrganisationKunde;
  angebot?: OrgFreigabeAngebot | null;
  onRefresh: () => void;
  onClose?: () => void;
  showClose?: boolean;
  partnerBefunde?: OrgPartnerBefundEntry[];
  auftragId?: string;
  bautagebuchEintraege?: Array<{
    id?: string;
    datum?: string;
    created_at?: string;
    titel?: string;
    notiz?: string;
    fotos_urls?: string[];
  }>;
  hwErledigt?: boolean;
  feedbackBereit?: boolean;
  hvFeedback?: {
    bewertung?: { sterne: number; freitext?: string | null } | null;
    maengel?: Array<{ freitext?: string | null; created_at?: string }>;
  };
  hvAbnahme?: {
    art: "ohne_vorbehalt" | "mit_anmerkung" | "zurueckgewiesen";
    anmerkung?: string | null;
    signiert_name: string;
    signiert_am: string;
  } | null;
  vorgangUnterlagen?: Array<{
    id: string;
    name: string;
    subtitle?: string;
    datum?: string;
    href: string;
  }>;
}) {
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  const fotos = meldeFotosFromLead(lead);
  const kategorie = meldeKategorieFromLead(lead);

  const resendEinladung = async () => {
    setResendBusy(true);
    setResendMsg(null);
    try {
      const res = await fetch("/api/org/meldung-einladung-erneut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      });
      const json = (await res.json()) as { error?: string; link?: string };
      if (!res.ok) {
        setResendMsg(json.error ?? "Fehler.");
        return;
      }
      if (json.link) {
        const url = json.link.startsWith("http")
          ? json.link
          : `${window.location.origin}${json.link.startsWith("/") ? json.link : `/${json.link}`}`;
        await navigator.clipboard.writeText(url);
        orgPortalToast.linkKopiert();
        setResendMsg("Einladungs-Link kopiert — bitte an Mieter weitergeben.");
      }
    } finally {
      setResendBusy(false);
    }
  };

  const wartetOrgFreigabe = lead.org_freigabe_status === "ausstehend";
  const hatAngebotsdaten = Boolean(
    angebot &&
      ((angebot.positionenDisplay?.length ?? 0) > 0 ||
        (typeof angebot.gesamtBrutto === "number" && angebot.gesamtBrutto > 0) ||
        angebot.pdf_url?.trim() ||
        angebot.dokumente?.some((d) => d.href?.trim()))
  );
  const angebotPdfZeilen =
    wartetOrgFreigabe && angebot ? orgAngebotPdfZeilen(angebot) : [];

  return (
    <>
      {showClose && onClose ? (
        <div className="flex justify-end lg:hidden mb-2">
          <button
            type="button"
            className="p-2 rounded-full hover:bg-muted"
            aria-label="Schließen"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : null}

      {!wartetOrgFreigabe ? (
        <OrgMeldungAktionBanner lead={lead} kunde={kunde} onUpdated={onRefresh} />
      ) : null}

      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">
            {meldeKategorieLabel(kategorie ?? undefined)}
          </p>
          <p className="text-sm text-text-secondary">
            {lead.objekt?.titel ?? "Objekt"}
          </p>
          {lead.objekt?.adresseZeile ? (
            <p className="text-xs text-text-tertiary mt-0.5">
              {lead.objekt.adresseZeile}
              {lead.objekt.plzOrt ? ` · ${lead.objekt.plzOrt}` : ""}
            </p>
          ) : null}
        </div>
        {kategorie === "notfall" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
            <AlertTriangle className="h-3 w-3" />
            Notfall
          </span>
        ) : null}
      </div>

      {wartetOrgFreigabe && angebot ? (
        <OrgAngebotFreigabeInhalt angebot={angebot} />
      ) : null}

      {lead.kontakt_nachricht ? (
        <div>
          <p className="text-xs font-medium text-text-tertiary mb-1">
            Beschreibung
          </p>
          <p className="text-sm whitespace-pre-wrap">{lead.kontakt_nachricht}</p>
        </div>
      ) : null}

      {(lead.melder_name ||
        lead.melder_einheit ||
        lead.melder_email ||
        lead.melder_telefon) && (
        <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
          <p className="text-xs font-medium text-text-tertiary">Melder</p>
          {lead.melder_name ? (
            <p>
              <strong>{lead.melder_name}</strong>
              {lead.melder_einheit ? ` · ${lead.melder_einheit}` : ""}
            </p>
          ) : null}
          {lead.melder_email ? (
            <p className="inline-flex items-center gap-1 text-text-secondary">
              <Mail className="h-3.5 w-3.5" />
              {lead.melder_email}
            </p>
          ) : null}
          {lead.melder_telefon ? (
            <p className="inline-flex items-center gap-1 text-text-secondary">
              <Phone className="h-3.5 w-3.5" />
              {lead.melder_telefon}
            </p>
          ) : null}
        </div>
      )}

      {lead.einladung_status === "offen" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <p>Wartet auf Ergänzung durch Melder.</p>
          {lead.melder_email ? (
            <button
              type="button"
              className={cn(
                "btn-pill-outline mt-2 text-xs",
                resendBusy && "opacity-60"
              )}
              disabled={resendBusy}
              onClick={resendEinladung}
            >
              Einladung erneut senden
            </button>
          ) : null}
          {resendMsg ? (
            <p className="text-xs mt-2 text-text-secondary">{resendMsg}</p>
          ) : null}
        </div>
      ) : null}

      {fotos.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-text-tertiary mb-2">
            Fotos ({fotos.length})
          </p>
          <div className="grid grid-cols-3 gap-2">
            {fotos.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative aspect-square overflow-hidden rounded-lg border border-border-default"
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {angebotPdfZeilen.length > 0 ? (
        <DokumenteTabelle
          heading="Angebot (PDF)"
          dokumente={angebotPdfZeilen}
          emptyText="Noch kein Angebots-PDF verfügbar."
        />
      ) : null}

      {!wartetOrgFreigabe || !hatAngebotsdaten ? (
        <div className="rounded-lg bg-muted/40 p-3 text-sm">
          <p className="text-xs font-medium text-text-tertiary mb-1">
            {wartetOrgFreigabe ? "Vorläufige Einschätzung" : "Geschätzte Preisspanne"}
          </p>
          <p>
            {formatPreisspanneDisplay(
              lead.preis_min,
              lead.preis_max,
              lead.preis_unsicher
            )}
          </p>
        </div>
      ) : null}

      {wartetOrgFreigabe ? (
        <OrgFreigabeBanner
          leadId={lead.id}
          status={lead.org_freigabe_status ?? ""}
          onUpdated={onRefresh}
        />
      ) : null}

      {partnerBefunde && partnerBefunde.length > 0 ? (
        <div data-testid="hv-partner-befund">
          <BautagebuchAccordionList
            heading="Partner-Befund (nur Ansicht)"
            className="!border-t-0 !pt-0"
            eintraege={partnerBefunde.map((b) => ({
              id: b.id,
              datum: b.datum,
              titel: b.titel,
              beschreibung: [
                b.handwerkerName ? `Partner: ${b.handwerkerName}` : null,
                b.beschreibung,
              ]
                .filter(Boolean)
                .join("\n\n"),
              fotos: b.fotos,
            }))}
          />
        </div>
      ) : null}

      {bautagebuchEintraege && bautagebuchEintraege.length > 0 ? (
        <BautagebuchAccordionList
          heading="Bautagebuch"
          className="!border-t-0 !pt-0"
          eintraege={bautagebuchEintraege.map((b) => ({
            id: b.id ?? `${b.datum}-${b.titel}`,
            datum: b.datum ?? b.created_at,
            titel: b.titel ?? "Eintrag",
            beschreibung: b.notiz,
            fotos: b.fotos_urls,
          }))}
        />
      ) : null}

      {vorgangUnterlagen && vorgangUnterlagen.length > 0 ? (
        <DokumenteTabelle
          heading="Anhänge"
          dokumente={vorgangUnterlagen.map((d) => ({
            id: d.id,
            name: d.subtitle ? `${d.name} — ${d.subtitle}` : d.name,
            datum: d.datum,
            href: d.href,
          }))}
        />
      ) : null}

      <OrgVorgangFeedbackSection
        leadId={lead.id}
        feedbackBereit={feedbackBereit}
        handwerkerErledigt={hwErledigt}
        hvFeedback={hvFeedback}
        onSubmitted={onRefresh}
      />

      <KostentraegerSelector
        leadId={lead.id}
        value={lead.kostentraeger}
        vorgeschlagen={lead.kostentraeger_vorgeschlagen ?? false}
        versicherungsNr={lead.versicherungs_nr}
        onSaved={onRefresh}
      />

      {auftragId &&
      (lead.kostentraeger === "versicherung" ||
        lead.kostentraeger === "versicherung_wasserschaden") ? (
        <VersicherungsakteButton auftragId={auftragId} />
      ) : null}

      <VorgangKommentareThread leadId={lead.id} />

      <OrganisationVorgangNotizenPanel leadId={lead.id} />

      <div className="flex flex-wrap gap-2 pt-2">
        <VorgangStornoDialog
          leadId={lead.id}
          inAusfuehrung={
            lead.hv_meldung_status === "notmassnahme" ||
            lead.vorgang_phase === "beauftragt" ||
            lead.vorgang_phase === "in_bearbeitung"
          }
          onDone={onRefresh}
        />
      </div>

      {lead.created_at ? (
        <p className="text-xs text-text-tertiary">
          Eingegangen: {new Date(lead.created_at).toLocaleString("de-DE")}
        </p>
      ) : null}
    </>
  );
}

export function OrganisationEingangPanel({
  kunde,
  eingang,
  objekte,
  angebote = [],
  initialSelectedId,
  onRefresh,
  listActions = false,
  partnerBefundByLeadId = {},
  auftragByLeadId = {},
  auftragKontextByLeadId = {},
  bautagebuchByLeadId = {},
  hwErledigtByLeadId = {},
  feedbackBereitByLeadId = {},
  hvFeedbackByLeadId = {},
  dokumenteByLeadId = {},
  hvAbnahmeByLeadId = {},
}: Props) {
  const angebotByLeadId = useMemo(() => {
    const map = new Map<string, OrgFreigabeAngebot>();
    for (const a of angebote) {
      const leadId = a.lead_id?.trim();
      if (leadId) map.set(leadId, a);
    }
    return map;
  }, [angebote]);

  const [objektFilter, setObjektFilter] = useState<string>("alle");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("alle");
  const [onlyNotfall, setOnlyNotfall] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId ?? null
  );
  const [_mobileDetailOpen, setMobileDetailOpen] = useState(false);

  useEffect(() => {
    if (initialSelectedId) {
      setSelectedId(initialSelectedId);
      setMobileDetailOpen(true);
    }
  }, [initialSelectedId]);

  const filtered = useMemo(() => {
    return eingang.filter((lead) => {
      if (objektFilter !== "alle") {
        const obj = objekte.find((o) => o.id === objektFilter);
        if (!obj || !leadBelongsToObjekt(lead, obj)) return false;
      }
      if (onlyNotfall && !isMeldeNotfall(lead)) return false;
      const hv = lead.hv_meldung_status ?? "neu";
      if (statusFilter === "neu") return hv === "neu";
      if (statusFilter === "wartet_melder") {
        return lead.einladung_status === "offen";
      }
      if (statusFilter === "in_bearbeitung") {
        return hv !== "neu" && hv !== "abgelehnt" && hv !== "abgeschlossen";
      }
      return true;
    });
  }, [eingang, objektFilter, objekte, onlyNotfall, statusFilter]);

  const selected =
    filtered.find((l) => l.id === selectedId) ??
    eingang.find((l) => l.id === selectedId) ??
    null;

  const router = useRouter();

  const openDetail = (id: string) => {
    setSelectedId(id);
    setMobileDetailOpen(true);
    router.replace(
      `/portal?section=vorgaenge&filter=offen&id=${encodeURIComponent(id)}`,
      { scroll: false }
    );
  };

  const closeDetail = () => {
    setSelectedId(null);
    setMobileDetailOpen(false);
    router.replace(`/portal?section=vorgaenge&filter=offen`, { scroll: false });
  };

  if (selected) {
    return (
      <div className="-mx-4 -mt-2 min-w-0 space-y-3 lg:-mx-6">
        <button
          type="button"
          onClick={closeDetail}
          className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-white"
          style={{ background: "rgba(0,0,0,.42)" }}
        >
          ‹ Zurück
        </button>
        <MeldungDetail
          lead={selected}
          kunde={kunde}
          angebot={angebotByLeadId.get(selected.id) ?? null}
          onRefresh={onRefresh}
          partnerBefunde={partnerBefundByLeadId[selected.id]}
          auftragId={auftragByLeadId[selected.id]}
          bautagebuchEintraege={bautagebuchByLeadId[selected.id]}
          hwErledigt={hwErledigtByLeadId[selected.id]}
          feedbackBereit={feedbackBereitByLeadId[selected.id]}
          hvFeedback={hvFeedbackByLeadId[selected.id]}
          hvAbnahme={hvAbnahmeByLeadId[selected.id] ?? null}
          vorgangUnterlagen={
            hwErledigtByLeadId[selected.id] ||
            feedbackBereitByLeadId[selected.id]
              ? dokumenteByLeadId[selected.id]
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!listActions ? (
        <>
          <div>
            <h2 className="text-lg font-semibold">Meldungen</h2>
            <p className="text-sm text-text-secondary">
              Mieter-Meldungen und Direkterfassungen — Aktionen für neue Vorgänge.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border-default bg-surface-card p-3">
            <span className="inline-flex items-center gap-1 text-xs text-text-tertiary">
              <Filter className="h-3.5 w-3.5" />
              Filter
            </span>
            <select
              className="rounded-lg border border-border-default px-2 py-1.5 text-sm"
              value={objektFilter}
              onChange={(e) => setObjektFilter(e.target.value)}
            >
              <option value="alle">Alle Objekte</option>
              {objekte.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.titel}
                </option>
              ))}
            </select>
            <select
              className="rounded-lg border border-border-default px-2 py-1.5 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="alle">Alle Status</option>
              <option value="neu">Neu</option>
              <option value="wartet_melder">Wartet auf Melder</option>
              <option value="in_bearbeitung">In Bearbeitung</option>
            </select>
            <label className="inline-flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={onlyNotfall}
                onChange={(e) => setOnlyNotfall(e.target.checked)}
              />
              Nur Notfall
            </label>
          </div>
        </>
      ) : null}

      <div className="flex flex-col gap-2.5">
        {filtered.length === 0 ? (
          <p className="portal-text-body rounded-[12px] border border-border-default bg-white px-4 py-8 text-center text-text-secondary">
            Keine Meldungen für die gewählten Filter.
          </p>
        ) : (
          filtered.map((lead) => {
            const kat = meldeKategorieLabel(
              meldeKategorieFromLead(lead) ?? undefined
            );
            const notfall = isMeldeNotfall(lead);
            const adresse = [
              lead.strasse,
              lead.hausnummer,
            ]
              .filter(Boolean)
              .join(" ");
            const we = lead.melder_einheit?.trim()
              ? /^(WE|Whg)/i.test(lead.melder_einheit.trim())
                ? lead.melder_einheit.trim()
                : `WE ${lead.melder_einheit.trim()}`
              : undefined;
            const person = lead.melder_name?.trim() || undefined;
            const subtitle = [
              adresse || lead.objekt?.titel || "Objekt",
              we,
              person,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <div key={lead.id} className="space-y-2">
                <PortalListCard
                  variant="card"
                  selected={false}
                  onClick={() => openDetail(lead.id)}
                  title={kat}
                  subtitle={subtitle}
                  statusLabel={plattformStatusLabel(
                    resolvePlattformStatus(lead, auftragKontextByLeadId[lead.id])
                  )}
                  statusPillClass={plattformStatusPillClass(
                    resolvePlattformStatus(lead, auftragKontextByLeadId[lead.id])
                  )}
                  accent="anfrage"
                  meta={
                    notfall
                      ? [{ icon: AlertTriangle, text: "Notfall" }]
                      : []
                  }
                  showChevron
                />
                {listActions ? (
                  <div className="px-1">
                    <HvMeldungListActions
                      lead={lead}
                      kunde={kunde}
                      onUpdated={onRefresh}
                    />
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
