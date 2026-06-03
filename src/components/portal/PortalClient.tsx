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

import { BautagebuchAccordionList } from "@/components/shared/BautagebuchAccordionList";
import {
  DokumenteTabelle,
  portalDokumenteToZeilen,
} from "@/components/shared/DokumenteTabelle";
import { SITE_CONFIG } from "@/lib/config";
import { labelBereich, labelSituation } from "@/lib/lead-funnel-labels";
import {
  fmtPortalStatus,
  sanitizeCustomerText,
  type PortalDetailSection,
} from "@/lib/portal/portal-display";
import {
  isPortalAngebotPhaseStatus,
  isPortalAuftragPhaseStatus,
} from "@/lib/portal/portal-pipeline";
import type { PortalDokument } from "@/lib/portal/portal-dokumente";
import {
  portalObjektKurzlabel,
  prependObjektSection,
  type PortalObjekt,
} from "@/lib/portal/portal-objekt";
import { cn } from "@/lib/utils";
import { PortalBaerenwaldGpt } from "@/components/portal/PortalBaerenwaldGpt";

type PortalKunde = { name?: string };
type PortalPhase = { id: string; name: string; status?: string };
type PortalBautagebuchEntry = {
  id?: string;
  datum?: string;
  created_at?: string;
  titel?: string;
  notiz?: string;
  fotos_urls?: string[];
};
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
  naechster_schritt?: string;
  phasen?: PortalPhase[];
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
type SortKey = "date" | "title" | "status";
type SortDir = "asc" | "desc";
type DetailItem = {
  id: string;
  date?: string;
  title: string;
  status?: string;
  summary?: string;
  anfrageGewerk?: string;
  anfrageVorhaben?: string;
  sections: PortalDetailSection[];
  tags?: string[];
  bautagebuch?: PortalBautagebuchEntry[];
  dokumente?: PortalDokument[];
};

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
  { id: "gpt", label: "BärenwaldGPT", icon: MessagesSquare },
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

function statusPillClass(status?: string): string {
  const s = (status || "").toLowerCase();
  if (s.includes("abgeschlossen") || s.includes("fertig")) {
    return "tag bg-emerald-100 text-emerald-700";
  }
  if (s.includes("in_arbeit") || s.includes("arbeit") || s.includes("aktiv")) {
    return "tag bg-blue-100 text-blue-700";
  }
  if (s.includes("angebot") || s.includes("gesendet") || s.includes("entwurf")) {
    return "tag bg-amber-100 text-amber-700";
  }
  return "tag tag-neutral";
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

function PortalDetailPanel({
  item,
  showStatusAtBottom,
}: {
  item: DetailItem;
  showStatusAtBottom: boolean;
}) {
  const isAnfrageDetail = Boolean(item.anfrageGewerk || item.anfrageVorhaben);
  const detailTitle = isAnfrageDetail
    ? anfrageDisplayTitle(item.anfrageVorhaben, item.anfrageGewerk)
    : item.title;

  return (
    <div className="space-y-4">
      <header className="space-y-2 border-b border-border-light pb-4">
        <p className="text-xs text-text-tertiary">{fmtDate(item.date)}</p>
        <h3 className="font-display text-xl font-semibold leading-snug text-text-primary sm:text-2xl">
          {detailTitle}
        </h3>
        {!showStatusAtBottom && item.status ? (
          <span className={statusPillClass(item.status)}>
            {fmtPortalStatus(item.status)}
          </span>
        ) : null}
        {!isAnfrageDetail && item.summary ? (
          <p className="text-sm leading-relaxed text-text-secondary">{item.summary}</p>
        ) : null}
      </header>

      {item.sections
        .filter(
          (section) =>
            (section.rows && section.rows.length > 0) ||
            (section.bullets && section.bullets.length > 0) ||
            Boolean(section.text)
        )
        .filter((section) => {
          const isAnfrageDetail = Boolean(item.anfrageGewerk || item.anfrageVorhaben);
          if (!isAnfrageDetail) return true;
          const duplicateHeadings = new Set([
            "Gewerke",
            "Ihr Vorhaben",
            "Gewerk",
            "Vorhaben",
          ]);
          return !duplicateHeadings.has(section.heading);
        })
        .map((section) => (
        <section key={section.heading} className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
            {section.heading}
          </h4>
          {section.rows && section.rows.length > 0 ? (
            <dl className="overflow-hidden rounded-xl border border-border-light bg-muted/25">
              {section.rows.map((row) => (
                <div
                  key={`${section.heading}-${row.label}`}
                  className="grid grid-cols-1 gap-0.5 border-b border-border-light px-3 py-2.5 last:border-b-0 sm:grid-cols-[38%_1fr] sm:gap-3"
                >
                  <dt className="text-xs font-medium text-text-tertiary">{row.label}</dt>
                  <dd className="text-sm font-semibold text-text-primary">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {section.bullets && section.bullets.length > 0 ? (
            <ul className="space-y-1.5 rounded-xl border border-border-light bg-muted/25 px-3 py-2.5">
              {section.bullets.map((line) => (
                <li key={line} className="flex gap-2 text-sm text-text-primary">
                  <span className="text-accent" aria-hidden>
                    •
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {section.text ? (
            <p className="rounded-xl border border-border-light bg-muted/25 px-3 py-2.5 text-sm leading-relaxed text-text-primary">
              {section.text}
            </p>
          ) : null}
        </section>
      ))}

      {!isAnfrageDetail && item.tags && item.tags.length > 0 ? (
        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
            Gewerke & Phasen
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <span key={tag} className="tag tag-neutral">
                {tag}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <DokumenteTabelle
        dokumente={portalDokumenteToZeilen(item.dokumente ?? [])}
        heading="Dokumente"
        emptyText="Noch keine Dokumente."
      />

      {item.bautagebuch !== undefined ? (
        <BautagebuchAccordionList
          eintraege={(item.bautagebuch ?? []).map((e) => ({
            id: e.id ?? `${e.titel}-${e.datum}`,
            datum: e.datum ?? e.created_at,
            titel: e.titel ?? "Update",
            beschreibung: e.notiz,
            fotos: e.fotos_urls,
          }))}
          emptyText="Noch keine Einträge im Bautagebuch."
        />
      ) : null}

      {showStatusAtBottom && item.status ? (
        <footer className="border-t border-border-light pt-4">
          <span className={statusPillClass(item.status)}>
            {fmtPortalStatus(item.status)}
          </span>
        </footer>
      ) : null}
    </div>
  );
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

function shortLabel(value?: string, max = 52): string {
  if (!value) return "—";
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
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
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const vorname = (kunde?.name || "Kunde").split(" ")[0] || "Kunde";
  const offeneAuftraegeCount = auftraege.filter(
    (a) => !isStorniertStatus(a.status) && !isAuftragAbgeschlossen(a)
  ).length;
  const abgeschlosseneAuftraegeCount = auftraege.filter((a) =>
    isAuftragAbgeschlossen(a)
  ).length;
  const offeneAnfragenCount = leadsAnfragePhase.length;

  const anfragenItems = useMemo<DetailItem[]>(
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
          return {
            id: lead.id,
            date: lead.created_at,
            title,
            anfrageGewerk,
            anfrageVorhaben,
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

  const angeboteItems = useMemo<DetailItem[]>(() => {
    const fromAngebote = [...angeboteTab]
      .sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      )
      .map((a) => {
        const sections = prependObjektSection(
          [
            {
              heading: "Überblick",
              rows: detailRows([
                { label: "Gültig bis", value: fmtDate(a.gueltig_bis ?? undefined) },
                {
                  label: "Versendet am",
                  value: fmtDate(a.gesendet_am ?? a.created_at ?? undefined),
                },
                {
                  label: "Preis (Brutto)",
                  value:
                    fmtMoney(a.betrag) !== "—" ? fmtMoney(a.betrag) : undefined,
                },
              ]),
            },
          ],
          a.objekt
        );
        const st = a.status_einfach || a.status || "angebot";
        return {
          id: a.id,
          date: a.created_at ?? undefined,
          title:
            sanitizeCustomerText(a.titel, 200) ||
            (a.angebotsnr ? `Angebot ${a.angebotsnr}` : "Angebot"),
          status: fmtPortalStatus(st),
          summary: a.objekt ? portalObjektKurzlabel(a.objekt) : undefined,
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
        return {
          id: `lead-${lead.id}`,
          date: lead.created_at,
          title,
          anfrageVorhaben,
          anfrageGewerk,
          status: fmtPortalStatus(lead.status || "angebot"),
          summary: lead.objekt
            ? portalObjektKurzlabel(lead.objekt)
            : lead.plz
              ? `PLZ ${lead.plz}`
              : undefined,
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

  const auftraegeItems = useMemo<DetailItem[]>(() => {
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
          const naechster = sanitizeCustomerText(a.naechster_schritt, 300);
          if (naechster) {
            sections.push({ heading: "Nächster Schritt", text: naechster });
          }
          const leistungen = dedupe(
            (a.positionen ?? []).map((p) => p.titel || p.gewerk_name || "")
          ).filter(Boolean);
          if (leistungen.length > 0) {
            sections.push({ heading: "Leistungen", bullets: leistungen });
          }
          const tags = dedupe(a.phasen?.map((p) => p.name) ?? []).slice(0, 6);
          return {
            id: a.id,
            date: a.start_datum || a.created_at,
            title: a.titel,
            status: fmtPortalStatus(
              isAuftragAbgeschlossen(a)
                ? "abgeschlossen"
                : a.status || "auftrag"
            ),
            summary: [
              a.objekt ? portalObjektKurzlabel(a.objekt) : null,
              `${a.fortschritt ?? 0} %`,
              a.start_datum ? `Start ${fmtDate(a.start_datum)}` : null,
            ]
              .filter(Boolean)
              .join(" · "),
            sections,
            tags: tags.length > 0 ? tags : undefined,
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
        return {
          id: `lead-${lead.id}`,
          date: lead.created_at,
          title,
          anfrageVorhaben,
          anfrageGewerk,
          status: fmtPortalStatus(
            abgeschlossen ? "abgeschlossen" : lead.status || "auftrag"
          ),
          summary: lead.objekt
            ? portalObjektKurzlabel(lead.objekt)
            : lead.plz
              ? `PLZ ${lead.plz}`
              : undefined,
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

  const currentList = useMemo(
    () =>
      section === "anfragen"
        ? anfragenItems
        : section === "angebote"
          ? angeboteItems
          : section === "auftraege"
            ? auftraegeItems
            : [],
    [section, anfragenItems, angeboteItems, auftraegeItems]
  );

  useEffect(() => {
    setCurrentPage(1);
    setSortKey("date");
    setSortDir("desc");
  }, [section]);

  const sortedList = useMemo(() => {
    const list = [...currentList];
    const direction = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      if (sortKey === "date") {
        const ta = new Date(a.date || 0).getTime();
        const tb = new Date(b.date || 0).getTime();
        return (ta - tb) * direction;
      }
      if (sortKey === "status") {
        return (a.status || "").localeCompare(b.status || "", "de") * direction;
      }
      return a.title.localeCompare(b.title, "de") * direction;
    });
    return list;
  }, [currentList, sortDir, sortKey]);

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(sortedList.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedList = sortedList.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const waNumber = SITE_CONFIG.phoneMobil.replace(/\D/g, "");
  const waHref = `https://wa.me/${waNumber}?text=${encodeURIComponent(
    "Hallo Bärenwald, ich habe eine Frage"
  )}`;

  function handleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(nextKey);
      setSortDir(nextKey === "date" ? "desc" : "asc");
    }
    setCurrentPage(1);
  }

  return (
    <div className="min-h-screen bg-surface-page">
      <header className="sticky top-0 z-50 border-b border-border-default bg-surface-card/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[68px] max-w-[1200px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Image src="/logo-mark-green.png" alt="Bärenwald" width={28} height={28} />
            <div>
              <p className="text-sm font-semibold leading-none text-text-primary">
                <span className="font-display text-[15px] italic bg-gradient-to-r from-[#1A3D2B] via-[#2E7D52] to-[#5AA7A7] bg-clip-text text-transparent">
                  Mein
                </span>
                <span className="ml-0.5">Bärenwald</span>
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/rechner"
              className="btn-pill-primary inline-flex !px-3 !py-2 !text-[11px] sm:!px-4 sm:!text-[12px]"
            >
              <span className="sm:hidden">Anfrage</span>
              <span className="hidden sm:inline">Neue Anfrage</span>
            </Link>
            <form action="/portal/auth/signout" method="post">
              <button
                type="submit"
                className="btn-pill-outline !px-2.5 !py-2 !text-[11px] sm:!px-3 sm:!text-[12px]"
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
                  onClick={() => {
                    setSection(id);
                    if (id !== "gpt") setGptOpen(false);
                  }}
                  className={cn(
                    "mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold",
                    section === id
                      ? "bg-accent-light text-accent"
                      : "text-text-secondary hover:bg-muted"
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </span>
                  <span className="text-xs text-text-tertiary">
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
          {section === "uebersicht" ? (
            <header className="card-bordered sticky top-[76px] z-40 flex items-center justify-between gap-3 bg-surface-page/95 p-4 backdrop-blur-sm">
              <div>
                <p className="text-lg font-semibold text-text-primary">
                  Hallo {vorname}
                </p>
              </div>
            </header>
          ) : null}

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
              <div className="grid grid-cols-3 gap-2">
                <article className="card-bordered p-4">
                  <p className="text-[10px] uppercase tracking-wider text-text-tertiary sm:text-xs">
                    Offene Anfragen
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold sm:mt-2 sm:text-4xl">
                    {offeneAnfragenCount}
                  </p>
                </article>
                <article className="card-bordered p-4">
                  <p className="text-[10px] uppercase tracking-wider text-text-tertiary sm:text-xs">
                    Offene Aufträge
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold sm:mt-2 sm:text-4xl">
                    {offeneAuftraegeCount}
                  </p>
                </article>
                <article className="card-bordered p-4">
                  <p className="text-[10px] uppercase tracking-wider text-text-tertiary sm:text-xs">
                    Abgeschlossen
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold sm:mt-2 sm:text-4xl">
                    {abgeschlosseneAuftraegeCount}
                  </p>
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
                          "rounded-full px-3 py-1.5 text-xs font-semibold",
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
                    className="text-sm font-semibold text-accent"
                    onClick={() => setSection(overviewTab)}
                  >
                    Alle anzeigen →
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-border-default">
                  <table className="min-w-full bg-surface-card text-left">
                    <thead className="bg-muted/70">
                      <tr>
                        <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                          Datum
                        </th>
                        <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                          Titel
                        </th>
                        <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const rows = (
                          overviewTab === "anfragen"
                            ? anfragenItems
                            : overviewTab === "angebote"
                              ? angeboteItems
                              : auftraegeItems
                        ).slice(0, 5);

                        if (rows.length === 0) {
                          return (
                            <tr className="border-t border-border-light">
                              <td
                                colSpan={3}
                                className="px-3 py-6 text-center text-sm text-text-secondary"
                              >
                                {emptyLabelForSection(overviewTab)}
                              </td>
                            </tr>
                          );
                        }

                        return rows.map((item) => (
                          <tr
                            key={item.id}
                            className="cursor-pointer border-t border-border-light hover:bg-muted/70"
                            onClick={() => {
                              if (overviewTab === "anfragen") {
                                setSelectedAnfrageId(item.id);
                                setSection("anfragen");
                              } else if (overviewTab === "angebote") {
                                setSelectedAngebotId(item.id);
                                setSection("angebote");
                              } else {
                                setSelectedAuftragId(item.id);
                                setSection("auftraege");
                              }
                              setMobileDetailOpen(true);
                            }}
                          >
                            <td className="px-3 py-2 text-sm text-text-secondary">
                              {fmtDate(item.date)}
                            </td>
                            <td className="px-3 py-2 text-sm font-semibold text-text-primary">
                              <span className="block max-w-[200px] truncate sm:max-w-none">
                                {item.title}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-sm text-text-secondary">
                              <span className={statusPillClass(item.status)}>
                                {item.status || "offen"}
                              </span>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </article>

              <section className="border-t border-border-default pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-text-tertiary">Kontakt</p>
                    <p className="text-sm text-text-secondary">
                      Fragen zu deinem Projekt? Wir sind direkt erreichbar.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={SITE_CONFIG.phoneHref}
                      className="btn-pill-primary !justify-center !px-4 !py-2.5 !text-[13px]"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      Jetzt anrufen
                    </a>
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-pill-outline !justify-center !px-4 !py-2.5 !text-[13px]"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </a>
                    <a
                      href={`mailto:${SITE_CONFIG.email}?subject=${encodeURIComponent(
                        "Frage an Bärenwald"
                      )}`}
                      className="btn-pill-outline !justify-center !px-4 !py-2.5 !text-[13px]"
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
                <table className="w-full table-fixed bg-surface-card text-left">
                  <thead className="bg-muted/70">
                    <tr>
                      <th className="w-[84px] px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary sm:w-[130px] sm:px-4 sm:py-3 sm:text-xs">
                        <button
                          onClick={() => handleSort("date")}
                          className="inline-flex items-center gap-1 hover:text-text-primary"
                        >
                          Datum
                          <span>{sortKey === "date" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                        </button>
                      </th>
                      <th className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary sm:max-w-[420px] sm:px-4 sm:py-3 sm:text-xs">
                        <button
                          onClick={() => handleSort("title")}
                          className="inline-flex items-center gap-1 hover:text-text-primary"
                        >
                          Titel
                          <span>{sortKey === "title" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                        </button>
                      </th>
                      <th className="hidden min-w-[220px] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary md:table-cell">
                        Info
                      </th>
                      <th className="w-[92px] px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary sm:w-[140px] sm:px-4 sm:py-3 sm:text-xs">
                        <button
                          onClick={() => handleSort("status")}
                          className="inline-flex items-center gap-1 hover:text-text-primary"
                        >
                          Status
                          <span>{sortKey === "status" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedList.length === 0 ? (
                      <tr className="border-t border-border-light">
                        <td
                          colSpan={4}
                          className="px-4 py-8 text-center text-sm text-text-secondary"
                        >
                          {emptyLabelForSection(section)}
                        </td>
                      </tr>
                    ) : (
                      paginatedList.map((item) => {
                      const active =
                        section === "anfragen"
                          ? selectedAnfrageId === item.id
                          : section === "angebote"
                            ? selectedAngebotId === item.id
                            : selectedAuftragId === item.id;
                      return (
                        <tr
                          key={item.id}
                          onClick={() => {
                            if (section === "anfragen") setSelectedAnfrageId(item.id);
                            if (section === "angebote") setSelectedAngebotId(item.id);
                            if (section === "auftraege") setSelectedAuftragId(item.id);
                            setMobileDetailOpen(true);
                          }}
                          className={cn(
                            "cursor-pointer border-t border-border-light",
                            active ? "bg-accent-light" : "hover:bg-muted/70"
                          )}
                        >
                          <td className="px-2 py-2 text-[12px] text-text-secondary sm:px-4 sm:py-3 sm:text-sm">
                            {fmtDate(item.date)}
                          </td>
                          <td className="px-2 py-2 text-text-primary sm:max-w-[420px] sm:px-4 sm:py-3 sm:text-sm">
                            <span className="block text-[13px] font-semibold leading-tight">
                              {shortLabel(item.title, 40)}
                            </span>
                            <button
                              type="button"
                              className="mt-1 text-[11px] font-medium text-accent sm:hidden"
                            >
                              Mehr
                            </button>
                          </td>
                          <td className="hidden px-4 py-3 text-sm text-text-secondary md:table-cell">
                            <span className="block truncate">
                              {item.summary || "—"}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-[12px] text-text-secondary sm:px-4 sm:py-3 sm:text-sm">
                            <span className={statusPillClass(item.status)}>
                              {shortLabel(item.status || "offen", 14)}
                            </span>
                          </td>
                        </tr>
                      );
                      })
                    )}
                  </tbody>
                </table>
                <div className="flex items-center justify-center border-t border-border-light px-4 py-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-border-default bg-surface-card px-2 py-1 text-xs">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safePage <= 1}
                      className="grid h-6 w-6 place-items-center rounded-full text-text-secondary transition hover:bg-muted hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Vorherige Seite"
                    >
                      <span aria-hidden>←</span>
                    </button>
                    <span className="min-w-[84px] text-center text-[11px] font-medium text-text-secondary">
                      {safePage} / {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={safePage >= totalPages}
                      className="grid h-6 w-6 place-items-center rounded-full text-text-secondary transition hover:bg-muted hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Nächste Seite"
                    >
                      <span aria-hidden>→</span>
                    </button>
                  </div>
                </div>
              </article>

              <aside className="hidden lg:block">
                <article className="card-bordered sticky top-[92px] max-h-[calc(100vh-110px)] overflow-y-auto p-4">
                  {selectedDetail ? (
                    <PortalDetailPanel
                      item={selectedDetail}
                      showStatusAtBottom={false}
                    />
                  ) : (
                    <p className="text-sm text-text-secondary">Kein Eintrag ausgewählt.</p>
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
                onClick={() => setSection(id)}
                className={cn(
                  "rounded-lg px-0.5 py-2 text-[10px] font-medium",
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
              aria-label="BärenwaldGPT öffnen"
              aria-pressed={gptOpen}
              className={cn(
                "-mt-8 flex min-h-[64px] w-[72px] flex-col items-center justify-center gap-1 rounded-full border-[3px] border-white/30 bg-gradient-to-br from-[#143D28] via-[#2E7D52] to-[#4BA3A3] px-1 py-2 text-white shadow-[0_10px_28px_rgba(30,90,60,0.45)] ring-[5px] ring-surface-card transition-transform active:scale-95",
                gptOpen && "ring-[#2E7D52] shadow-[0_12px_32px_rgba(46,125,82,0.55)]"
              )}
            >
              <MessagesSquare className="h-7 w-7 shrink-0 stroke-[1.75]" aria-hidden />
              <span className="max-w-[68px] text-center text-[9px] font-extrabold leading-tight tracking-tight text-white">
                BärenwaldGPT
              </span>
            </button>
          </div>

          {(["angebote", "auftraege"] as const).map((id) => {
            const { label, icon: Icon } = MENU_ITEMS.find((m) => m.id === id)!;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                className={cn(
                  "rounded-lg px-0.5 py-2 text-[10px] font-medium",
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

      {mobileDetailOpen && section !== "uebersicht" && section !== "gpt" && selectedDetail ? (
        <div className="fixed inset-0 z-[120] bg-black/40 lg:hidden">
          <button
            className="absolute inset-0"
            onClick={() => setMobileDetailOpen(false)}
            aria-label="Sheet schließen"
          />
          <article className="absolute inset-x-0 bottom-0 flex max-h-[min(88vh,720px)] flex-col rounded-t-2xl border border-border-default bg-surface-card shadow-xl">
            <div className="shrink-0 px-4 pb-2 pt-3">
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border-default" />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
              <PortalDetailPanel
                item={selectedDetail}
                showStatusAtBottom={false}
              />
            </div>
            <div className="shrink-0 border-t border-border-light p-4">
              <button
                type="button"
                className="btn-pill-primary w-full !py-2.5 !text-[13px]"
                onClick={() => setMobileDetailOpen(false)}
              >
                Schließen
              </button>
            </div>
          </article>
        </div>
      ) : null}

      <PortalBaerenwaldGpt
        variant="overlay"
        open={gptOpen}
        onClose={() => setGptOpen(false)}
      />
    </div>
  );
}
