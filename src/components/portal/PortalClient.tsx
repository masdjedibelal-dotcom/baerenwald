"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Mail,
  MessageCircle,
  Phone,
} from "lucide-react";

import { SITE_CONFIG } from "@/lib/config";
import { cn } from "@/lib/utils";

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
  status?: string;
  fortschritt?: number;
  budget?: number;
  start_datum?: string;
  end_datum?: string;
  created_at?: string;
  naechster_schritt?: string;
  phasen?: PortalPhase[];
  positionen?: PortalPosition[];
  bautagebuch?: PortalBautagebuchEntry[];
  anhaenge?: string[];
};
type PortalAngebot = {
  id: string;
  titel?: string;
  status_einfach?: string;
  status?: string;
  lead_id?: string;
  leistungsumfang?: string;
  notizen?: string;
  betrag?: number;
  gueltig_bis?: string;
  gesendet_am?: string;
  created_at?: string;
  auftrag_titel?: string;
  anhaenge?: string[];
};
type PortalLead = {
  id: string;
  situation?: string;
  bereiche?: string[];
  created_at?: string;
  status?: string;
  plz?: string;
  preis_min?: number;
  preis_max?: number;
  budget_ca?: number;
  anhaenge?: string[];
};

type PortalClientProps = {
  kunde: PortalKunde;
  auftraege: PortalAuftrag[];
  angebote: PortalAngebot[];
  leads: PortalLead[];
};

type SectionId = "uebersicht" | "anfragen" | "angebote" | "auftraege";
type OverviewTabId = "anfragen" | "angebote" | "auftraege";
type SortKey = "date" | "title" | "status";
type SortDir = "asc" | "desc";
type DetailItem = {
  id: string;
  date?: string;
  title: string;
  status?: string;
  subtitle?: string;
  description?: string;
  facts?: Array<{ label: string; value: string }>;
  chips?: string[];
  bullets?: string[];
  updates?: Array<{ id?: string; date?: string; title: string; note?: string }>;
  attachments?: string[];
};

const MENU_ITEMS: Array<{
  id: SectionId;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: "uebersicht", label: "Übersicht", icon: LayoutDashboard },
  { id: "anfragen", label: "Anfragen", icon: ClipboardList },
  { id: "angebote", label: "Angebote", icon: FileText },
  { id: "auftraege", label: "Aufträge", icon: Briefcase },
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

function compactText(v?: string, max = 140): string | undefined {
  if (!v) return undefined;
  const oneLine = v.replace(/\s+/g, " ").trim();
  if (!oneLine) return undefined;
  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
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

function dedupe(values: Array<string | undefined | null>): string[] {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v && v.trim()))));
}

function normalizeAttachmentUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function detailFact(label: string, value?: string): { label: string; value: string } | null {
  if (!value || value === "—") return null;
  return { label, value };
}

export function PortalClient({
  kunde,
  auftraege = [],
  angebote = [],
  leads = [],
}: PortalClientProps) {
  const [section, setSection] = useState<SectionId>("uebersicht");
  const [overviewTab, setOverviewTab] = useState<OverviewTabId>("anfragen");
  const [selectedAnfrageId, setSelectedAnfrageId] = useState<string | null>(
    leads[0]?.id ?? null
  );
  const [selectedAngebotId, setSelectedAngebotId] = useState<string | null>(
    angebote[0]?.id ?? null
  );
  const [selectedAuftragId, setSelectedAuftragId] = useState<string | null>(
    auftraege[0]?.id ?? null
  );
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const vorname = (kunde?.name || "Kunde").split(" ")[0] || "Kunde";
  const offeneAuftraegeCount = auftraege.filter(
    (a) => a.status !== "abgeschlossen"
  ).length;
  const abgeschlosseneAuftraegeCount = auftraege.filter(
    (a) => a.status === "abgeschlossen"
  ).length;
  const offeneAnfragenCount = leads.filter((lead) => lead.status !== "abgeschlossen").length;
  const leadById = useMemo(
    () => new Map(leads.map((lead) => [lead.id, lead])),
    [leads]
  );

  const anfragenItems = useMemo<DetailItem[]>(
    () =>
      [...leads]
        .sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
        )
        .map((lead) => ({
          id: lead.id,
          date: lead.created_at,
          title: lead.situation || "Unbekannte Anfrage",
          status: lead.status || "neu",
          subtitle:
            lead.bereiche && lead.bereiche.length > 0
              ? lead.bereiche.join(", ")
              : "Bereiche werden abgestimmt",
          description: [
            lead.plz ? `Ort: ${lead.plz}` : null,
            typeof lead.budget_ca === "number"
              ? `Preisrahmen: ${fmtMoney(lead.budget_ca)}`
              : typeof lead.preis_min === "number" || typeof lead.preis_max === "number"
                ? `Preisrahmen: ${fmtMoney(lead.preis_min)} - ${fmtMoney(lead.preis_max)}`
                : "Preisrahmen wird im Gespräch abgestimmt",
          ]
            .filter(Boolean)
            .join(" · "),
          facts: [
            detailFact("Anfragedatum", fmtDate(lead.created_at)),
            detailFact("Objektbereich", lead.plz),
            detailFact(
              "Preisrahmen",
              typeof lead.budget_ca === "number"
                ? fmtMoney(lead.budget_ca)
                : typeof lead.preis_min === "number" || typeof lead.preis_max === "number"
                  ? `${fmtMoney(lead.preis_min)} - ${fmtMoney(lead.preis_max)}`
                  : undefined
            ),
            detailFact("Gewerke", lead.bereiche?.join(", ")),
          ].filter((v): v is { label: string; value: string } => Boolean(v)),
          bullets: [
            lead.bereiche?.length
              ? `Leistungsumfang: ${lead.bereiche.join(", ")}`
              : "Leistungsumfang wird gemeinsam definiert",
            "Unsere Einsatzplanung meldet sich mit den nächsten Schritten.",
          ],
          attachments: dedupe(lead.anhaenge ?? []),
        })),
    [leads]
  );

  const angeboteItems = useMemo<DetailItem[]>(
    () =>
      [...angebote]
        .sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
        )
        .map((a) => ({
          id: a.id,
          date: a.created_at,
          title: a.titel || a.leistungsumfang || "Angebot",
          status: a.status_einfach || a.status || "offen",
          subtitle: (() => {
            const lead = a.lead_id ? leadById.get(a.lead_id) : undefined;
            return [
              lead?.plz ? `Objekt: ${lead.plz}` : null,
              fmtMoney(a.betrag) !== "—" ? `Preis: ${fmtMoney(a.betrag)}` : null,
              lead?.bereiche?.length ? `Gewerke: ${lead.bereiche.join(", ")}` : null,
            ]
              .filter(Boolean)
              .join(" · ");
          })(),
          description: (() => {
            const lead = a.lead_id ? leadById.get(a.lead_id) : undefined;
            return [
              a.leistungsumfang
                ? `Leistungen: ${compactText(a.leistungsumfang, 180)}`
                : null,
              a.notizen ? `Kurzüberblick: ${compactText(a.notizen, 180)}` : null,
              lead?.situation ? `Bezug: ${lead.situation}` : null,
              a.gueltig_bis ? `Gültig bis: ${fmtDate(a.gueltig_bis)}` : null,
              a.gesendet_am ? `Versendet am: ${fmtDate(a.gesendet_am)}` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Details folgen nach Abstimmung";
          })(),
          facts: (() => {
            const lead = a.lead_id ? leadById.get(a.lead_id) : undefined;
            return [
              detailFact("Objektbereich", lead?.plz),
              detailFact("Preis", fmtMoney(a.betrag)),
              detailFact("Gültig bis", fmtDate(a.gueltig_bis)),
              detailFact("Versendet am", fmtDate(a.gesendet_am || a.created_at)),
            ].filter((v): v is { label: string; value: string } => Boolean(v));
          })(),
          bullets: [
            a.leistungsumfang
              ? `Leistungen: ${compactText(a.leistungsumfang, 180)}`
              : "Leistungsumfang wird final abgestimmt",
            a.notizen ? `Hinweise: ${compactText(a.notizen, 180)}` : null,
          ].filter((v): v is string => Boolean(v)),
          attachments: dedupe(a.anhaenge ?? []),
        })),
    [angebote, leadById]
  );

  const auftraegeItems = useMemo<DetailItem[]>(
    () =>
      [...auftraege]
        .sort((a, b) => (b.fortschritt ?? 0) - (a.fortschritt ?? 0))
        .map((a) => ({
          id: a.id,
          date: a.start_datum || a.created_at,
          title: a.titel,
          status: a.status || "planung",
          subtitle: [
            `${a.fortschritt ?? 0}% abgeschlossen`,
            a.start_datum ? `Start: ${fmtDate(a.start_datum)}` : null,
            a.end_datum ? `vsl. Ende: ${fmtDate(a.end_datum)}` : null,
          ]
            .filter(Boolean)
            .join(" · "),
          description: compactText(
            [
              a.naechster_schritt ? `Nächster Schritt: ${a.naechster_schritt}` : null,
              a.bautagebuch?.[0]?.titel
                ? `Letztes Update: ${a.bautagebuch[0].titel}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Projektplanung läuft",
            220
          ),
          chips: dedupe([
            ...(a.positionen?.map((p) => p.gewerk_name || p.titel) ?? []),
            ...(a.phasen?.map((p) => p.name) ?? []),
          ]).slice(0, 8),
          bullets: [
            typeof a.budget === "number" ? `Budget: ${fmtMoney(a.budget)}` : null,
            a.positionen?.length ? `${a.positionen.length} Leistungen geplant` : null,
            a.naechster_schritt ? `Nächster Schritt: ${a.naechster_schritt}` : null,
            a.start_datum || a.end_datum
              ? `Zeitraum: ${fmtDate(a.start_datum)} - ${fmtDate(a.end_datum)}`
              : null,
          ]
            .filter((v): v is string => Boolean(v)),
          facts: [
            detailFact("Projektstatus", a.status || "planung"),
            detailFact("Fortschritt", `${a.fortschritt ?? 0}%`),
            detailFact("Start", fmtDate(a.start_datum || a.created_at)),
            detailFact("Vsl. Ende", fmtDate(a.end_datum)),
          ].filter((v): v is { label: string; value: string } => Boolean(v)),
          updates: (a.bautagebuch ?? [])
            .slice(0, 6)
            .map((u) => ({
              id: u.id,
              date: u.datum || u.created_at,
              title: u.titel || "Update",
              note: compactText(u.notiz, 160),
            })),
          attachments: dedupe([
            ...(a.anhaenge ?? []),
            ...(a.bautagebuch?.flatMap((u) => u.fotos_urls ?? []) ?? []),
          ]),
        })),
    [auftraege]
  );

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
              <p className="text-[11px] uppercase tracking-wider text-text-tertiary">
                Kundenportal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/rechner"
              className="btn-pill-primary !px-4 !py-2 !text-[12px]"
            >
              Neue Anfrage
            </Link>
            <div className="text-right">
              <p className="text-sm font-semibold text-text-primary">{kunde?.name || "Kunde"}</p>
              <p className="text-xs text-text-tertiary">Kundenbereich</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1200px] grid-cols-1 gap-4 px-4 pb-28 pt-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-6 lg:pb-10">
        <aside className="hidden lg:block">
          <nav className="card-bordered sticky top-[92px] p-2">
            {MENU_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSection(id)}
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
        </aside>

        <section className="space-y-4">
          <header className="card-bordered flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm text-text-secondary">Kundenportal</p>
              <p className="text-lg font-semibold text-text-primary">
                Hallo {vorname}
              </p>
            </div>
          </header>

          {section === "uebersicht" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <article className="card-bordered p-4">
                  <p className="text-xs uppercase tracking-wider text-text-tertiary">Offene Aufträge</p>
                  <p className="mt-2 font-display text-4xl font-semibold">{offeneAuftraegeCount}</p>
                </article>
                <article className="card-bordered p-4">
                  <p className="text-xs uppercase tracking-wider text-text-tertiary">Abgeschlossene Aufträge</p>
                  <p className="mt-2 font-display text-4xl font-semibold">{abgeschlosseneAuftraegeCount}</p>
                </article>
                <article className="card-bordered p-4">
                  <p className="text-xs uppercase tracking-wider text-text-tertiary">Offene Anfragen</p>
                  <p className="mt-2 font-display text-4xl font-semibold">{offeneAnfragenCount}</p>
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
                          <tr key={item.id} className="border-t border-border-light">
                            <td className="px-3 py-2 text-sm text-text-secondary">
                              {fmtDate(item.date)}
                            </td>
                            <td className="px-3 py-2 text-sm font-semibold text-text-primary">
                              {item.title}
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

          {section !== "uebersicht" && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <article className="card-bordered overflow-x-auto p-0">
                <table className="min-w-full bg-surface-card text-left">
                  <thead className="bg-muted/70">
                    <tr>
                      <th className="w-[130px] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                        <button
                          onClick={() => handleSort("date")}
                          className="inline-flex items-center gap-1 hover:text-text-primary"
                        >
                          Datum
                          <span>{sortKey === "date" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                        </button>
                      </th>
                      <th className="max-w-[420px] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                        <button
                          onClick={() => handleSort("title")}
                          className="inline-flex items-center gap-1 hover:text-text-primary"
                        >
                          Titel
                          <span>{sortKey === "title" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                        </button>
                      </th>
                      <th className="w-[140px] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                        <button
                          onClick={() => handleSort("status")}
                          className="inline-flex items-center gap-1 hover:text-text-primary"
                        >
                          Status
                          <span>{sortKey === "status" ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
                        </button>
                      </th>
                      <th className="min-w-[220px] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                        Info
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
                          <td className="px-4 py-3 text-sm text-text-secondary">
                            {fmtDate(item.date)}
                          </td>
                          <td className="max-w-[420px] truncate px-4 py-3 text-sm font-semibold text-text-primary">
                            <span className="block truncate">{item.title}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-text-secondary">
                            <span className={statusPillClass(item.status)}>
                              {item.status || "offen"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-text-secondary">
                            <span className="block truncate">{item.subtitle || "—"}</span>
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
                <article className="card-bordered sticky top-[92px] p-4">
                  {selectedDetail ? (
                    <div className="space-y-2">
                      <p className="text-xs text-text-tertiary">{fmtDate(selectedDetail.date)}</p>
                      <h3 className="font-display text-2xl font-semibold">{selectedDetail.title}</h3>
                      <p className="tag tag-accent inline-block">{selectedDetail.status || "offen"}</p>
                      <p className="text-sm text-text-secondary">{selectedDetail.subtitle}</p>
                      <p className="text-sm text-text-primary">{selectedDetail.description}</p>
                      {selectedDetail.facts && selectedDetail.facts.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {selectedDetail.facts.map((fact) => (
                            <div key={`${fact.label}-${fact.value}`} className="rounded-lg border border-border-light bg-muted/30 p-2">
                              <p className="text-[11px] uppercase tracking-wider text-text-tertiary">{fact.label}</p>
                              <p className="text-sm font-semibold text-text-primary">{fact.value}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {selectedDetail.chips && selectedDetail.chips.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {selectedDetail.chips.map((chip) => (
                            <span key={chip} className="tag tag-neutral">
                              {chip}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {selectedDetail.bullets && selectedDetail.bullets.length > 0 ? (
                        <div className="pt-2">
                          {selectedDetail.bullets.map((line) => (
                            <p key={line} className="text-sm text-text-primary">
                              • {line}
                            </p>
                          ))}
                        </div>
                      ) : null}
                      {selectedDetail.updates && selectedDetail.updates.length > 0 ? (
                        <div className="space-y-2 border-t border-border-light pt-3">
                          <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                            Letzte Bautagebuch-Updates
                          </p>
                          {selectedDetail.updates.map((u) => (
                            <div key={u.id || `${u.title}-${u.date}`} className="rounded-lg bg-muted/40 p-2">
                              <p className="text-xs text-text-tertiary">{fmtDate(u.date)}</p>
                              <p className="text-sm font-semibold text-text-primary">{u.title}</p>
                              {u.note ? <p className="text-sm text-text-secondary">{u.note}</p> : null}
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {selectedDetail.attachments && selectedDetail.attachments.length > 0 ? (
                        <div className="space-y-2 border-t border-border-light pt-3">
                          <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                            Anhänge
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {selectedDetail.attachments.slice(0, 8).map((url, idx) => (
                              <a
                                key={`${url}-${idx}`}
                                href={normalizeAttachmentUrl(url)}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-pill-outline !px-3 !py-1.5 !text-[12px]"
                              >
                                Anhang {idx + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-text-secondary">Kein Eintrag ausgewählt.</p>
                  )}
                </article>
              </aside>
            </div>
          )}
        </section>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-[90] border-t border-border-default bg-surface-card/95 px-2 py-2 backdrop-blur-sm lg:hidden">
        <div className="grid grid-cols-4 gap-1">
          {MENU_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={cn(
                "rounded-lg px-2 py-2 text-[12px] font-semibold",
                section === id
                  ? "bg-accent-light text-accent"
                  : "text-text-secondary"
              )}
            >
              <span className="flex flex-col items-center gap-1">
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </span>
            </button>
          ))}
        </div>
      </nav>

      {mobileDetailOpen && section !== "uebersicht" && selectedDetail ? (
        <div className="fixed inset-0 z-[120] bg-black/40 lg:hidden">
          <button
            className="absolute inset-0"
            onClick={() => setMobileDetailOpen(false)}
            aria-label="Sheet schließen"
          />
          <article className="absolute inset-x-0 bottom-0 rounded-t-2xl border border-border-default bg-surface-card p-4 shadow-xl">
            <div className="mb-3 h-1.5 w-12 rounded-full bg-border-default" />
            <p className="text-xs text-text-tertiary">{fmtDate(selectedDetail.date)}</p>
            <h3 className="mt-1 font-display text-2xl font-semibold">{selectedDetail.title}</h3>
            <p className="tag tag-accent mt-2 inline-block">{selectedDetail.status || "offen"}</p>
            <p className="mt-3 text-sm text-text-secondary">{selectedDetail.subtitle}</p>
            <p className="mt-1 text-sm text-text-primary">{selectedDetail.description}</p>
            {selectedDetail.facts && selectedDetail.facts.length > 0 ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {selectedDetail.facts.map((fact) => (
                  <div key={`${fact.label}-${fact.value}`} className="rounded-lg border border-border-light bg-muted/30 p-2">
                    <p className="text-[11px] uppercase tracking-wider text-text-tertiary">{fact.label}</p>
                    <p className="text-sm font-semibold text-text-primary">{fact.value}</p>
                  </div>
                ))}
              </div>
            ) : null}
            {selectedDetail.chips && selectedDetail.chips.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedDetail.chips.map((chip) => (
                  <span key={chip} className="tag tag-neutral">
                    {chip}
                  </span>
                ))}
              </div>
            ) : null}
            {selectedDetail.bullets && selectedDetail.bullets.length > 0 ? (
              <div className="mt-2 space-y-1">
                {selectedDetail.bullets.map((line) => (
                  <p key={line} className="text-sm text-text-primary">
                    • {line}
                  </p>
                ))}
              </div>
            ) : null}
            {selectedDetail.updates && selectedDetail.updates.length > 0 ? (
              <div className="mt-3 space-y-2 border-t border-border-light pt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Letzte Bautagebuch-Updates
                </p>
                {selectedDetail.updates.map((u) => (
                  <div key={u.id || `${u.title}-${u.date}`} className="rounded-lg bg-muted/40 p-2">
                    <p className="text-xs text-text-tertiary">{fmtDate(u.date)}</p>
                    <p className="text-sm font-semibold text-text-primary">{u.title}</p>
                    {u.note ? <p className="text-sm text-text-secondary">{u.note}</p> : null}
                  </div>
                ))}
              </div>
            ) : null}
            {selectedDetail.attachments && selectedDetail.attachments.length > 0 ? (
              <div className="mt-3 space-y-2 border-t border-border-light pt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Anhänge
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedDetail.attachments.slice(0, 8).map((url, idx) => (
                    <a
                      key={`${url}-${idx}`}
                      href={normalizeAttachmentUrl(url)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-pill-outline !px-3 !py-1.5 !text-[12px]"
                    >
                      Anhang {idx + 1}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
            <button
              className="btn-pill-primary mt-4 !px-4 !py-2 !text-[13px]"
              onClick={() => setMobileDetailOpen(false)}
            >
              Schließen
            </button>
          </article>
        </div>
      ) : null}
    </div>
  );
}
