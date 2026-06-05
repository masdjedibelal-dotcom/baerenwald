"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Mail,
  MessageCircle,
  Phone,
  MessagesSquare,
} from "lucide-react";

import { PortalDetailPanel } from "@/components/portal/PortalDetailPanel";
import { PortalMobileBottomSheet } from "@/components/shared/PortalMobileBottomSheet";
import { PortalListCard } from "@/components/shared/PortalListCard";
import {
  PORTAL_LIST_PAGE_SIZE,
  PortalListPagination,
} from "@/components/shared/PortalListPagination";
import { SITE_CONFIG } from "@/lib/config";
import { labelBereich, labelSituation } from "@/lib/lead-funnel-labels";
import {
  fmtPortalStatus,
  sanitizeCustomerText,
} from "@/lib/portal/portal-display";
import {
  isPortalAngebotPhaseStatus,
  isPortalAuftragPhaseStatus,
} from "@/lib/portal/portal-pipeline";
import type { PortalDokument } from "@/lib/portal/portal-dokumente";
import {
  type KundePortalDetailItem,
  type PortalBautagebuchEntry,
  objektPlzOrt,
} from "@/lib/portal/portal-detail-item";
import { buildKundeCardRows, type PortalCardRow } from "@/lib/portal/portal-list-mappers";
import {
  portalObjektKurzlabel,
  prependObjektSection,
  type PortalObjekt,
} from "@/lib/portal/portal-objekt";
import { portalDetailStatusPillClass } from "@/lib/shared/portal-detail-format";
import { cn } from "@/lib/utils";
import { PortalBaerenwaldGpt } from "@/components/portal/PortalBaerenwaldGpt";

type PortalKunde = { name?: string };
type PortalPosition = {
  id: string;
  titel: string;
  beschreibung?: string;
  status?: string;
  gewerk_name?: string;
  datum?: string;
  fotos_urls?: string[];
  bautagebuch?: PortalBautagebuchEntry[];
};
type PortalAuftrag = {
  id: string;
  titel: string;
  lead_id?: string;
  angebot_id?: string;
  objekt?: PortalObjekt | null;
  status?: string;
  fortschritt?: number;
  budget?: number;
  start_datum?: string;
  end_datum?: string;
  abnahme_datum?: string;
  created_at?: string;
  milestones?: Array<{ id: string; titel: string; erledigt: boolean }>;
  positionen?: PortalPosition[];
  bautagebuch?: PortalBautagebuchEntry[];
  dokumente?: PortalDokument[];
};
type PortalAngebot = {
  id: string;
  titel?: string;
  objekt?: PortalObjekt | null;
  status_einfach?: string | null;
  status?: string;
  lead_id?: string | null;
  leistungen?: string[];
  hinweise?: string;
  angebotsnr?: string | null;
  betrag?: number;
  gueltig_bis?: string | null;
  gesendet_am?: string | null;
  created_at?: string | null;
  auftrag_titel?: string;
  dokumente?: PortalDokument[];
};
type PortalLead = {
  id: string;
  situation?: string;
  bereiche?: string[];
  created_at?: string;
  status?: string;
  objekt?: PortalObjekt | null;
  plz?: string;
  preis_min?: number;
  preis_max?: number;
  budget_ca?: number;
  dokumente?: PortalDokument[];
};

type PortalClientProps = {
  kunde: PortalKunde;
  auftraege: PortalAuftrag[];
  angebote: PortalAngebot[];
  leads: PortalLead[];
};

type SectionId = "uebersicht" | "anfragen" | "angebote" | "auftraege" | "gpt";
type OverviewTabId = "anfragen" | "angebote" | "auftraege";

function formatAnfrageGewerk(bereiche?: string[]): string | undefined {
  const parts = (bereiche ?? [])
    .map((b) => labelBereich(b.trim()))
    .filter((l) => l && l !== "—");
  if (parts.length === 0) return undefined;
  return parts.join(", ");
}

/** Listen- und Detail-Titel: Vorhaben + Gewerk, z. B. „Erneuern · Bad“. */
function anfrageDisplayTitle(vorhaben?: string, gewerk?: string): string {
  const v = vorhaben?.trim();
  const g = gewerk?.trim();
  if (v && g) return `${v} · ${g}`;
  return v || g || "Anfrage";
}

function anfrageTitleFromLead(lead: Pick<PortalLead, "situation" | "bereiche">): {
  title: string;
  anfrageVorhaben?: string;
  anfrageGewerk?: string;
} {
  const vorhabenLabel = labelSituation(lead.situation);
  const gewerk = formatAnfrageGewerk(lead.bereiche);
  const vorhaben =
    vorhabenLabel !== "—" ? vorhabenLabel : undefined;
  return {
    title: anfrageDisplayTitle(vorhaben, gewerk),
    anfrageVorhaben: vorhaben,
    anfrageGewerk: gewerk,
  };
}

const MENU_ITEMS: Array<{
  id: SectionId;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: "uebersicht", label: "Übersicht", icon: LayoutDashboard },
  { id: "anfragen", label: "Anfragen", icon: ClipboardList },
  { id: "angebote", label: "Angebote", icon: FileText },
  { id: "auftraege", label: "Aufträge", icon: Briefcase },
  { id: "gpt", label: "GPT", icon: MessagesSquare },
];

function fmtDate(v?: string): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-DE");
}

function fmtMoney(v?: number): string {
  if (typeof v !== "number") return "—";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
}

function emptyLabelForSection(section: OverviewTabId | SectionId): string {
  if (section === "anfragen") return "Noch keine Anfragen";
  if (section === "angebote") return "Noch keine Angebote";
  if (section === "auftraege") return "Noch keine Aufträge";
  return "Noch keine Einträge";
}

function isCompletedStatus(status?: string): boolean {
  const normalized = (status || "").toLowerCase().replace(/[\s-]+/g, "_");
  return (
    normalized === "abgeschlossen" ||
    normalized.includes("abgeschlossen") ||
    normalized.includes("fertig") ||
    normalized.includes("completed") ||
    normalized.includes("done")
  );
}

function isStorniertStatus(status?: string): boolean {
  return (status || "").toLowerCase().includes("storniert");
}

function isAuftragAbgeschlossen(auftrag: PortalAuftrag): boolean {
  if (isStorniertStatus(auftrag.status)) return false;
  if (isCompletedStatus(auftrag.status)) return true;
  if (typeof auftrag.fortschritt === "number" && auftrag.fortschritt >= 100) {
    return true;
  }
  return false;
}

function dedupe(values: Array<string | undefined | null>): string[] {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v && v.trim()))));
}

function detailRows(
  rows: Array<{ label: string; value?: string | null }>
): Array<{ label: string; value: string }> {
  return rows
    .map((r) => ({
      label: r.label,
      value: r.value?.trim(),
    }))
    .filter(
      (r): r is { label: string; value: string } =>
        Boolean(r.value && r.value !== "—")
    );
}

function listItemLabel(section: SectionId): string {
  if (section === "anfragen") return "Anfragen";
  if (section === "angebote") return "Angebote";
  if (section === "auftraege") return "Aufträge";
  return "Einträge";
}

export function PortalClient({
  kunde,
  auftraege = [],
  angebote = [],
  leads = [],
}: PortalClientProps) {
  const searchParams = useSearchParams();
  const [section, setSection] = useState<SectionId>("uebersicht");
  const [overviewTab, setOverviewTab] = useState<OverviewTabId>("anfragen");
  /** Vom Server bereits nach splitKundePortalPipeline gefiltert. */
  const leadsAnfragePhase = leads;

  const angeboteTab = angebote;

  const leadsNurAngebotPhase = useMemo(
    () =>
      leads.filter(
        (l) =>
          isPortalAngebotPhaseStatus(l.status) &&
          !angeboteTab.some((a) => a.lead_id === l.id)
      ),
    [leads, angeboteTab]
  );

  const [selectedAnfrageId, setSelectedAnfrageId] = useState<string | null>(
    () => leadsAnfragePhase[0]?.id ?? null
  );
  const [selectedAngebotId, setSelectedAngebotId] = useState<string | null>(
    () => angeboteTab[0]?.id ?? leadsNurAngebotPhase[0]?.id ?? null
  );
  const [selectedAuftragId, setSelectedAuftragId] = useState<string | null>(
    auftraege[0]?.id ?? null
  );
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [gptOpen, setGptOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const vorname = (kunde?.name || "Kunde").split(" ")[0] || "Kunde";
  const offeneAuftraegeCount = auftraege.filter(
    (a) => !isStorniertStatus(a.status) && !isAuftragAbgeschlossen(a)
  ).length;
  const abgeschlosseneAuftraegeCount = auftraege.filter((a) =>
    isAuftragAbgeschlossen(a)
  ).length;
  const offeneAnfragenCount = leadsAnfragePhase.length;

  const anfragenItems = useMemo<KundePortalDetailItem[]>(
    () =>
      [...leadsAnfragePhase]
        .sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
        )
        .map((lead) => {
          const preisrahmen =
            typeof lead.budget_ca === "number"
              ? fmtMoney(lead.budget_ca)
              : typeof lead.preis_min === "number" ||
                  typeof lead.preis_max === "number"
                ? `${fmtMoney(lead.preis_min)} – ${fmtMoney(lead.preis_max)}`
                : undefined;
          const { title, anfrageVorhaben, anfrageGewerk } = anfrageTitleFromLead(lead);
          const sections = prependObjektSection(
            [
              {
                heading: "Überblick",
                rows: detailRows([
                  { label: "Anfragedatum", value: fmtDate(lead.created_at) },
                  { label: "Preisrahmen", value: preisrahmen },
                ]),
              },
            ],
            lead.objekt
          );
          const { plz, ort } = objektPlzOrt(lead.objekt, lead.plz);
          return {
            id: lead.id,
            date: lead.created_at,
            title,
            anfrageGewerk,
            anfrageVorhaben,
            plz,
            ort,
            cardSubtitle: anfrageGewerk,
            infoHint:
              "Deine Anfrage ist bei uns eingegangen. Wir prüfen die Details und melden uns bei dir.",
            status: fmtPortalStatus(lead.status || "neu"),
            summary: lead.objekt
              ? portalObjektKurzlabel(lead.objekt)
              : lead.plz
                ? `PLZ ${lead.plz}`
                : undefined,
            sections,
            dokumente: lead.dokumente ?? [],
          };
        }),
    [leadsAnfragePhase]
  );

  const angeboteItems = useMemo<KundePortalDetailItem[]>(() => {
    const fromAngebote = [...angeboteTab]
      .sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      )
      .map((a) => {
        const overviewRows = detailRows([
          {
            label: "Angebotsnummer",
            value: a.angebotsnr?.trim() ? a.angebotsnr.trim() : undefined,
          },
          { label: "Gültig bis", value: fmtDate(a.gueltig_bis ?? undefined) },
          {
            label: "Versendet am",
            value: fmtDate(a.gesendet_am ?? a.created_at ?? undefined),
          },
          {
            label: "Preis (Brutto)",
            value: fmtMoney(a.betrag) !== "—" ? fmtMoney(a.betrag) : undefined,
          },
        ]);
        const sections = prependObjektSection(
          [{ heading: "Überblick", rows: overviewRows }],
          a.objekt
        );
        if (a.leistungen && a.leistungen.length > 0) {
          sections.push({ heading: "Leistungen", bullets: a.leistungen });
        }
        const st = a.status_einfach || a.status || "angebot";
        const { plz, ort } = objektPlzOrt(a.objekt);
        const hasObjekt = Boolean(a.objekt);
        return {
          id: a.id,
          date: a.created_at ?? undefined,
          title:
            sanitizeCustomerText(a.titel, 200) ||
            (a.angebotsnr ? `Angebot ${a.angebotsnr}` : "Angebot"),
          plz,
          ort,
          cardSubtitle: hasObjekt ? portalObjektKurzlabel(a.objekt!) : undefined,
          suppressLocationInHero: hasObjekt,
          status: fmtPortalStatus(st),
          summary: undefined,
          sections,
          dokumente: a.dokumente ?? [],
        };
      });

    const fromLeads = [...leadsNurAngebotPhase]
      .sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      )
      .map((lead) => {
        const { title, anfrageVorhaben, anfrageGewerk } = anfrageTitleFromLead(lead);
        const { plz, ort } = objektPlzOrt(lead.objekt, lead.plz);
        const hasObjekt = Boolean(lead.objekt);
        return {
          id: `lead-${lead.id}`,
          date: lead.created_at,
          title,
          anfrageVorhaben,
          anfrageGewerk,
          plz,
          ort,
          cardSubtitle: anfrageGewerk,
          suppressLocationInHero: hasObjekt,
          infoHint: "Wir bereiten dein Angebot vor und melden uns, sobald es bereitsteht.",
          status: fmtPortalStatus(lead.status || "angebot"),
          summary: undefined,
          sections: prependObjektSection(
            [
              {
                heading: "Überblick",
                rows: detailRows([
                  { label: "Anfragedatum", value: fmtDate(lead.created_at) },
                ]),
              },
            ],
            lead.objekt
          ),
          dokumente: lead.dokumente ?? [],
        };
      });

    return [...fromAngebote, ...fromLeads];
  }, [angeboteTab, leadsNurAngebotPhase]);

  const leadsNurAuftragPhase = useMemo(
    () =>
      leads.filter(
        (l) =>
          isPortalAuftragPhaseStatus(l.status) &&
          !auftraege.some((a) => a.lead_id === l.id)
      ),
    [leads, auftraege]
  );

  const auftraegeItems = useMemo<KundePortalDetailItem[]>(() => {
    const fromAuftraege = [...auftraege]
      .sort((a, b) => {
        const aDone = isAuftragAbgeschlossen(a) ? 1 : 0;
        const bDone = isAuftragAbgeschlossen(b) ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        return (
          new Date(b.start_datum || b.created_at || 0).getTime() -
          new Date(a.start_datum || a.created_at || 0).getTime()
        );
      })
      .map((a) => {
          const sections = prependObjektSection(
            [
              {
                heading: "Projekt",
                rows: detailRows([
                  {
                    label: "Status",
                    value: fmtPortalStatus(
                      isAuftragAbgeschlossen(a)
                        ? "abgeschlossen"
                        : a.status || "offen"
                    ),
                  },
                  { label: "Fortschritt", value: `${a.fortschritt ?? 0} %` },
                  { label: "Start", value: fmtDate(a.start_datum || a.created_at) },
                  { label: "Vorauss. Ende", value: fmtDate(a.end_datum) },
                  {
                    label: "Budget",
                    value:
                      typeof a.budget === "number" ? fmtMoney(a.budget) : undefined,
                  },
                ]),
              },
            ],
            a.objekt
          );
          const { plz, ort } = objektPlzOrt(a.objekt);
          const leistungen = dedupe(
            (a.positionen ?? []).map((p) => p.titel || p.gewerk_name || "")
          ).filter(Boolean);
          if (leistungen.length > 0) {
            sections.push({ heading: "Leistungen", bullets: leistungen });
          }
          const hasObjekt = Boolean(a.objekt);
          return {
            id: a.id,
            date: a.start_datum || a.created_at,
            title: a.titel,
            plz,
            ort,
            cardSubtitle: `${a.fortschritt ?? 0} % Fortschritt`,
            suppressLocationInHero: hasObjekt,
            status: fmtPortalStatus(
              isAuftragAbgeschlossen(a)
                ? "abgeschlossen"
                : a.status || "auftrag"
            ),
            summary: undefined,
            sections,
            milestones: a.milestones ?? [],
            bautagebuch: a.bautagebuch ?? [],
            dokumente: a.dokumente ?? [],
          };
        });

    const fromLeads = [...leadsNurAuftragPhase]
      .sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      )
      .map((lead) => {
        const { title, anfrageVorhaben, anfrageGewerk } = anfrageTitleFromLead(lead);
        const abgeschlossen = isCompletedStatus(lead.status);
        const { plz, ort } = objektPlzOrt(lead.objekt, lead.plz);
        const hasObjekt = Boolean(lead.objekt);
        return {
          id: `lead-${lead.id}`,
          date: lead.created_at,
          title,
          anfrageVorhaben,
          anfrageGewerk,
          plz,
          ort,
          cardSubtitle: anfrageGewerk,
          suppressLocationInHero: hasObjekt,
          status: fmtPortalStatus(
            abgeschlossen ? "abgeschlossen" : lead.status || "auftrag"
          ),
          summary: undefined,
          sections: prependObjektSection(
            [
              {
                heading: "Projekt",
                rows: detailRows([
                  {
                    label: "Status",
                    value: fmtPortalStatus(
                      abgeschlossen ? "abgeschlossen" : lead.status || "auftrag"
                    ),
                  },
                ]),
              },
            ],
            lead.objekt
          ),
          dokumente: lead.dokumente ?? [],
        };
      });

    return [...fromAuftraege, ...fromLeads];
  }, [auftraege, leadsNurAuftragPhase]);

  useEffect(() => {
    const s = searchParams.get("section");
    const itemId = searchParams.get("id")?.trim();
    if (!s || !itemId) return;

    if (s === "auftraege") {
      if (auftraege.some((a) => a.id === itemId)) {
        setSection("auftraege");
        setSelectedAuftragId(itemId);
        setMobileDetailOpen(true);
        return;
      }
      const leadId = itemId.startsWith("lead-") ? itemId.slice("lead-".length) : null;
      if (leadId && leadsNurAuftragPhase.some((l) => l.id === leadId)) {
        setSection("auftraege");
        setSelectedAuftragId(itemId);
        setMobileDetailOpen(true);
      }
      return;
    }

    if (s === "angebote") {
      if (angebote.some((a) => a.id === itemId)) {
        setSection("angebote");
        setSelectedAngebotId(itemId);
        setMobileDetailOpen(true);
        return;
      }
      const leadId = itemId.startsWith("lead-") ? itemId.slice("lead-".length) : null;
      if (leadId && leadsNurAngebotPhase.some((l) => l.id === leadId)) {
        setSection("angebote");
        setSelectedAngebotId(itemId);
        setMobileDetailOpen(true);
      }
      return;
    }

    if (s === "anfragen" && leads.some((l) => l.id === itemId)) {
      setSection("anfragen");
      setSelectedAnfrageId(itemId);
      setMobileDetailOpen(true);
    }
  }, [
    searchParams,
    auftraege,
    angebote,
    leads,
    leadsNurAngebotPhase,
    leadsNurAuftragPhase,
  ]);

  const selectedAnfrage =
    anfragenItems.find((i) => i.id === selectedAnfrageId) ?? anfragenItems[0];
  const selectedAngebot =
    angeboteItems.find((i) => i.id === selectedAngebotId) ?? angeboteItems[0];
  const selectedAuftrag =
    auftraegeItems.find((i) => i.id === selectedAuftragId) ?? auftraegeItems[0];

  const selectedDetail =
    section === "anfragen"
      ? selectedAnfrage
      : section === "angebote"
        ? selectedAngebot
        : section === "auftraege"
          ? selectedAuftrag
          : null;

  const sectionCardRows = useMemo(() => {
    if (section === "anfragen") return buildKundeCardRows(anfragenItems, "anfrage");
    if (section === "angebote") return buildKundeCardRows(angeboteItems, "angebot");
    if (section === "auftraege") return buildKundeCardRows(auftraegeItems, "auftrag");
    return [];
  }, [section, anfragenItems, angeboteItems, auftraegeItems]);

  useEffect(() => {
    setCurrentPage(1);
  }, [section]);

  const overviewCardRows = useMemo(() => {
    if (overviewTab === "anfragen") return buildKundeCardRows(anfragenItems, "anfrage");
    if (overviewTab === "angebote") return buildKundeCardRows(angeboteItems, "angebot");
    return buildKundeCardRows(auftraegeItems, "auftrag");
  }, [overviewTab, anfragenItems, angeboteItems, auftraegeItems]);

  const PAGE_SIZE = PORTAL_LIST_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(sectionCardRows.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedCardRows = sectionCardRows.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const selectedId =
    section === "anfragen"
      ? selectedAnfrageId
      : section === "angebote"
        ? selectedAngebotId
        : section === "auftraege"
          ? selectedAuftragId
          : null;

  function selectRow(id: string) {
    if (section === "anfragen") setSelectedAnfrageId(id);
    if (section === "angebote") setSelectedAngebotId(id);
    if (section === "auftraege") setSelectedAuftragId(id);
    setMobileDetailOpen(true);
  }

  function renderCard(row: PortalCardRow) {
    return (
      <PortalListCard
        key={row.id}
        accent={row.accent}
        showLeftAccent={false}
        title={row.title}
        subtitle={row.subtitle}
        statusLabel={row.statusLabel}
        statusPillClass={portalDetailStatusPillClass(row.statusPillKey)}
        meta={row.meta}
        selected={selectedId === row.id}
        onClick={() => selectRow(row.id)}
      />
    );
  }

  function renderOverviewCard(row: PortalCardRow, tab: OverviewTabId) {
    return (
      <PortalListCard
        key={row.id}
        accent={row.accent}
        showLeftAccent={false}
        title={row.title}
        subtitle={row.subtitle}
        statusLabel={row.statusLabel}
        statusPillClass={portalDetailStatusPillClass(row.statusPillKey)}
        meta={row.meta}
        onClick={() => {
          if (tab === "anfragen") setSelectedAnfrageId(row.id);
          else if (tab === "angebote") setSelectedAngebotId(row.id);
          else setSelectedAuftragId(row.id);
          setSection(tab);
          setMobileDetailOpen(true);
        }}
      />
    );
  }

  const sectionListEmpty =
    section !== "uebersicht" &&
    section !== "gpt" &&
    (section === "anfragen"
      ? anfragenItems.length === 0
      : section === "angebote"
        ? angeboteItems.length === 0
        : auftraegeItems.length === 0);

  const waNumber = SITE_CONFIG.phoneMobil.replace(/\D/g, "");
  const waHref = `https://wa.me/${waNumber}?text=${encodeURIComponent(
    "Hallo Bärenwald, ich habe eine Frage"
  )}`;

  function switchSection(id: SectionId) {
    setSection(id);
    setMobileDetailOpen(false);
    if (id !== "gpt") setGptOpen(false);
  }

  return (
    <div className="portal-ui min-h-screen bg-surface-page">
      <header className="sticky top-0 z-50 border-b border-border-default bg-surface-card/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[68px] max-w-[1200px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Image src="/logo-mark-green.png" alt="Bärenwald" width={28} height={28} />
            <div>
              <p className="portal-text-body font-semibold leading-none text-text-primary">
                <span className="font-display text-base italic bg-gradient-to-r from-[#1A3D2B] via-[#2E7D52] to-[#5AA7A7] bg-clip-text text-transparent sm:text-[17px]">
                  Mein
                </span>
                <span className="ml-0.5">Bärenwald</span>
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/rechner"
              className="btn-pill-primary portal-btn-compact inline-flex"
            >
              <span className="sm:hidden">Anfrage</span>
              <span className="hidden sm:inline">Neue Anfrage</span>
            </Link>
            <form action="/portal/auth/signout" method="post">
              <button
                type="submit"
                className="btn-pill-outline portal-btn-compact !px-2.5 sm:!px-3"
              >
                Abmelden
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1200px] grid-cols-1 gap-4 px-4 pb-36 pt-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-6 lg:pb-10">
        <aside className="hidden lg:block">
          <div className="sticky top-[92px] space-y-3">
            <nav className="card-bordered p-2">
              {MENU_ITEMS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => switchSection(id)}
                  className={cn(
                    "mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left portal-text-body font-semibold",
                    section === id
                      ? id === "gpt"
                        ? "bg-[#EAF3DE] text-[#2E7D52]"
                        : "bg-accent-light text-accent"
                      : id === "gpt"
                        ? "text-[#2E7D52] hover:bg-[#EAF3DE]/60"
                        : "text-text-secondary hover:bg-muted"
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </span>
                  <span className="portal-text-meta text-text-tertiary">
                    {id === "anfragen"
                      ? anfragenItems.length
                      : id === "angebote"
                        ? angeboteItems.length
                        : id === "auftraege"
                          ? auftraegeItems.length
                          : ""}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <section className="space-y-4">
          {section === "gpt" ? (
            <article className="card-bordered hidden overflow-hidden p-0 lg:block">
              <PortalBaerenwaldGpt
                variant="embedded"
                open
                onClose={() => setSection("uebersicht")}
              />
            </article>
          ) : null}

          {section === "uebersicht" && (
            <div className="space-y-4">
              <div className="space-y-0.5">
                <p className="portal-text-section text-text-primary">
                  Hallo {vorname}
                </p>
              </div>

              <div className="grid min-w-0 grid-cols-3 gap-2">
                <article className="portal-kpi-card">
                  <p className="portal-kpi-label">Offene Anfragen</p>
                  <p className="portal-kpi-value">{offeneAnfragenCount}</p>
                </article>
                <article className="portal-kpi-card">
                  <p className="portal-kpi-label">Offene Aufträge</p>
                  <p className="portal-kpi-value">{offeneAuftraegeCount}</p>
                </article>
                <article className="portal-kpi-card">
                  <p className="portal-kpi-label">Abgeschlossen</p>
                  <p className="portal-kpi-value">{abgeschlosseneAuftraegeCount}</p>
                </article>
              </div>

              <article className="card-bordered p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex gap-2">
                    {[
                      ["anfragen", "Anfragen"],
                      ["angebote", "Angebote"],
                      ["auftraege", "Aufträge"],
                    ].map(([id, label]) => (
                      <button
                        key={id}
                        onClick={() => setOverviewTab(id as OverviewTabId)}
                        className={cn(
                          "rounded-full px-3 py-1.5 portal-text-meta font-semibold",
                          overviewTab === id
                            ? "bg-accent-light text-accent"
                            : "bg-muted text-text-secondary"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <button
                    className="portal-text-body font-semibold text-accent"
                    onClick={() => setSection(overviewTab)}
                  >
                    Alle anzeigen →
                  </button>
                </div>

                <div className="space-y-2">
                  {overviewCardRows.length === 0 ? (
                    <p className="portal-text-body rounded-xl border border-dashed border-border-light bg-muted/20 px-3 py-6 text-center text-text-secondary">
                      {emptyLabelForSection(overviewTab)}
                    </p>
                  ) : (
                    overviewCardRows.slice(0, 5).map((row) => renderOverviewCard(row, overviewTab))
                  )}
                </div>
              </article>

              <section className="border-t border-border-default pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="portal-text-label text-text-tertiary">Kontakt</p>
                    <p className="portal-text-body text-text-secondary">
                      Fragen zu deinem Projekt? Wir sind direkt erreichbar.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={SITE_CONFIG.phoneHref}
                      className="btn-pill-primary portal-btn !justify-center !px-4 !py-3"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Jetzt anrufen
                    </a>
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-pill-outline portal-btn !justify-center !px-4 !py-3"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </a>
                    <a
                      href={`mailto:${SITE_CONFIG.email}?subject=${encodeURIComponent(
                        "Frage an Bärenwald"
                      )}`}
                      className="btn-pill-outline portal-btn !justify-center !px-4 !py-3"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      E-Mail
                    </a>
                  </div>
                </div>
              </section>
            </div>
          )}

          {section !== "uebersicht" && section !== "gpt" && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <article className="card-bordered overflow-hidden p-0">
                <div className="space-y-2 p-3 sm:p-4">
                  {sectionListEmpty ? (
                    <p className="portal-text-body rounded-xl border border-dashed border-border-light bg-muted/20 px-3 py-8 text-center text-text-secondary">
                      {emptyLabelForSection(section)}
                    </p>
                  ) : (
                    paginatedCardRows.map(renderCard)
                  )}
                </div>
                {!sectionListEmpty ? (
                  <PortalListPagination
                    totalItems={sectionCardRows.length}
                    itemLabel={listItemLabel(section)}
                    currentPage={safePage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                ) : null}
              </article>

              <aside className="hidden lg:block">
                <article className="card-bordered sticky top-[92px] max-h-[calc(100vh-110px)] overflow-y-auto p-4">
                  {selectedDetail ? (
                    <PortalDetailPanel item={selectedDetail} />
                  ) : (
                    <p className="portal-text-body text-text-secondary">Kein Eintrag ausgewählt.</p>
                  )}
                </article>
              </aside>
            </div>
          )}
        </section>
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-[90] border-t border-border-default bg-surface-card/95 backdrop-blur-sm lg:hidden"
        aria-label="Portal Navigation"
      >
        <div className="grid grid-cols-5 items-end px-0.5 pb-2 pt-1">
          {(["uebersicht", "anfragen"] as const).map((id) => {
            const { label, icon: Icon } = MENU_ITEMS.find((m) => m.id === id)!;
            return (
              <button
                key={id}
                type="button"
                onClick={() => switchSection(id)}
                className={cn(
                  "portal-text-nav rounded-lg px-0.5 py-2.5",
                  section === id
                    ? "text-accent"
                    : "text-text-tertiary"
                )}
              >
                <span className="flex flex-col items-center gap-0.5">
                  <Icon className="h-[18px] w-[18px] stroke-[1.75]" />
                  <span className="max-w-[58px] truncate">{label}</span>
                </span>
              </button>
            );
          })}

          <div className="flex flex-col items-center justify-end">
            <button
              type="button"
              onClick={() => setGptOpen(true)}
              aria-label="GPT öffnen"
              aria-pressed={gptOpen}
              className={cn(
                "-mt-8 flex min-h-[64px] w-[72px] flex-col items-center justify-center gap-1 rounded-full border-[3px] border-white/30 bg-[#2E7D52] px-1 py-2 text-white shadow-[0_8px_24px_rgba(46,125,82,0.35)] ring-[5px] ring-surface-card transition-transform active:scale-95",
                gptOpen && "ring-[#2E7D52] shadow-[0_10px_28px_rgba(46,125,82,0.45)]"
              )}
            >
              <MessagesSquare className="h-7 w-7 shrink-0 stroke-[1.75]" aria-hidden />
              <span className="portal-text-fab max-w-[72px] text-center text-white">
                GPT
              </span>
            </button>
          </div>

          {(["angebote", "auftraege"] as const).map((id) => {
            const { label, icon: Icon } = MENU_ITEMS.find((m) => m.id === id)!;
            return (
              <button
                key={id}
                type="button"
                onClick={() => switchSection(id)}
                className={cn(
                  "portal-text-nav rounded-lg px-0.5 py-2.5",
                  section === id
                    ? "text-accent"
                    : "text-text-tertiary"
                )}
              >
                <span className="flex flex-col items-center gap-0.5">
                  <Icon className="h-[18px] w-[18px] stroke-[1.75]" />
                  <span className="max-w-[58px] truncate">{label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <PortalMobileBottomSheet
        open={
          mobileDetailOpen &&
          section !== "uebersicht" &&
          section !== "gpt" &&
          !sectionListEmpty &&
          Boolean(selectedDetail)
        }
        onClose={() => setMobileDetailOpen(false)}
        ariaLabel="Details"
      >
        {selectedDetail ? <PortalDetailPanel item={selectedDetail} /> : null}
      </PortalMobileBottomSheet>

      <PortalBaerenwaldGpt
        variant="overlay"
        open={gptOpen}
        onClose={() => setGptOpen(false)}
      />
    </div>
  );
}
