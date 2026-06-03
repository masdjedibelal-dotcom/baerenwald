"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Mail,
  MessageCircle,
  MessagesSquare,
  Phone,
} from "lucide-react";

import { PartnerAnfrageDetail } from "@/components/partner/PartnerAnfrageDetail";
import { PartnerAngebotDetail } from "@/components/partner/PartnerAngebotDetail";
import { PartnerAuftragDetail } from "@/components/partner/PartnerAuftragDetail";
import { PortalBaerenwaldGpt } from "@/components/portal/PortalBaerenwaldGpt";
import { SITE_CONFIG } from "@/lib/config";
import type {
  PartnerAnfrageItem,
  PartnerAuftragItem,
} from "@/lib/partner/get-partner-data";
import {
  isPartnerAnfrageOffen,
  partnerAnfrageStatusLabel,
} from "@/lib/partner/partner-anfrage-status";
import { cn } from "@/lib/utils";

type PartnerSection = "uebersicht" | "anfragen" | "angebote" | "auftraege" | "gpt";
type OverviewTabId = "anfragen" | "angebote" | "auftraege";

type OverviewRow = {
  id: string;
  date?: string;
  title: string;
  status: string;
};

const MENU_ITEMS: Array<{
  id: PartnerSection;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: "uebersicht", label: "Übersicht", icon: LayoutDashboard },
  { id: "anfragen", label: "Anfragen", icon: ClipboardList },
  { id: "angebote", label: "Angebote", icon: FileText },
  { id: "auftraege", label: "Aufträge", icon: Briefcase },
  { id: "gpt", label: "BärenwaldGPT", icon: MessagesSquare },
];

function fmtDate(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-DE");
}

function statusPillClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "akzeptiert" || s === "eingereicht" || s === "abgeschlossen") {
    return "tag bg-emerald-100 text-emerald-700";
  }
  if (s === "abgelehnt" || s === "storniert") return "tag bg-red-100 text-red-700";
  if (s === "in_arbeit") return "tag bg-blue-100 text-blue-800";
  return "tag bg-amber-100 text-amber-700";
}

function isAuftragAktiv(a: PartnerAuftragItem): boolean {
  const s = a.status.toLowerCase();
  return s !== "abgeschlossen" && s !== "storniert";
}

function sortAnfragen(items: PartnerAnfrageItem[]): PartnerAnfrageItem[] {
  return [...items].sort((a, b) => {
    const aOffen = isPartnerAnfrageOffen(a) ? 1 : 0;
    const bOffen = isPartnerAnfrageOffen(b) ? 1 : 0;
    if (aOffen !== bOffen) return bOffen - aOffen;
    return (
      new Date(b.gesendet_at || 0).getTime() - new Date(a.gesendet_at || 0).getTime()
    );
  });
}

function firstAnfrageId(items: PartnerAnfrageItem[]): string | null {
  const sorted = sortAnfragen(items);
  return sorted[0]?.id ?? null;
}

function emptyLabelForTab(tab: OverviewTabId): string {
  if (tab === "anfragen") return "Noch keine Anfragen";
  if (tab === "angebote") return "Noch keine Angebote";
  return "Noch keine Aufträge";
}

export function PartnerClient({
  handwerker,
  anfragen,
  auftraege,
}: {
  handwerker: { name: string; firma?: string | null };
  anfragen: PartnerAnfrageItem[];
  auftraege: PartnerAuftragItem[];
}) {
  const searchParams = useSearchParams();
  const [section, setSection] = useState<PartnerSection>("uebersicht");
  const [overviewTab, setOverviewTab] = useState<OverviewTabId>("anfragen");
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    firstAnfrageId(anfragen.filter((a) => isPartnerAnfrageOffen(a)))
  );
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [gptOpen, setGptOpen] = useState(false);

  const displayName = handwerker.firma?.trim() || handwerker.name;
  const vorname = (handwerker.name || "Partner").split(" ")[0] || "Partner";

  const angebote = useMemo(
    () => anfragen.filter((a) => a.status.toLowerCase() === "akzeptiert"),
    [anfragen]
  );

  const offeneAnfragenCount = anfragen.filter((a) => isPartnerAnfrageOffen(a)).length;

  const anfragenSorted = useMemo(() => sortAnfragen(anfragen), [anfragen]);

  const anfragenOffenListe = useMemo(
    () => anfragenSorted.filter((a) => isPartnerAnfrageOffen(a)),
    [anfragenSorted]
  );

  const angeboteSorted = useMemo(() => {
    return [...angebote].sort((a, b) => {
      const aOffen = !a.hw_eingereicht_at ? 1 : 0;
      const bOffen = !b.hw_eingereicht_at ? 1 : 0;
      if (aOffen !== bOffen) return bOffen - aOffen;
      return (
        new Date(b.antwort_at || b.gesendet_at || 0).getTime() -
        new Date(a.antwort_at || a.gesendet_at || 0).getTime()
      );
    });
  }, [angebote]);

  const offeneAngeboteCount = angebote.filter((a) => !a.hw_eingereicht_at).length;

  const aktiveAuftraegeCount = auftraege.filter(isAuftragAktiv).length;

  const overviewAnfragenRows = useMemo((): OverviewRow[] => {
    return anfragenOffenListe.map((a) => ({
      id: a.id,
      date: a.gesendet_at ?? undefined,
      title: a.gewerk_name,
      status: partnerAnfrageStatusLabel(a),
    }));
  }, [anfragenOffenListe]);

  const overviewAngeboteRows = useMemo((): OverviewRow[] => {
    return angeboteSorted.map((a) => ({
        id: a.id,
        date: (a.antwort_at ?? a.gesendet_at) ?? undefined,
        title: a.gewerk_name,
      status: a.hw_eingereicht_at ? "eingereicht" : "offen",
    }));
  }, [angeboteSorted]);

  const overviewAuftraegeRows = useMemo((): OverviewRow[] => {
    return [...auftraege]
      .sort(
        (a, b) =>
          new Date(b.start_datum || 0).getTime() -
          new Date(a.start_datum || 0).getTime()
      )
      .map((a) => ({
        id: a.id,
        date: a.start_datum ?? undefined,
        title: a.titel,
        status: a.status,
      }));
  }, [auftraege]);

  const listItems = useMemo(() => {
    if (section === "angebote") return angeboteSorted;
    if (section === "auftraege") return auftraege;
    if (section === "anfragen") return anfragenOffenListe;
    return [];
  }, [section, anfragenOffenListe, angeboteSorted, auftraege]);

  const selectedAnfrage = useMemo(
    () =>
      anfragenOffenListe.find((a) => a.id === selectedId) ?? anfragenOffenListe[0],
    [anfragenOffenListe, selectedId]
  );

  const selectedAngebot = useMemo(
    () => angeboteSorted.find((a) => a.id === selectedId) ?? angeboteSorted[0],
    [angeboteSorted, selectedId]
  );

  const selectedAuftrag = useMemo(
    () => auftraege.find((a) => a.id === selectedId) ?? auftraege[0],
    [auftraege, selectedId]
  );

  useEffect(() => {
    const s = searchParams.get("section");
    const itemId = searchParams.get("auftrag")?.trim() || searchParams.get("id")?.trim();
    if (s === "auftraege" && itemId) {
      setSection("auftraege");
      if (auftraege.some((a) => a.id === itemId)) {
        setSelectedId(itemId);
        setMobileDetailOpen(true);
      }
    } else if (s === "angebote" && itemId) {
      setSection("angebote");
      const match = angebote.find((a) => a.id === itemId);
      if (match) {
        setSelectedId(match.id);
        setMobileDetailOpen(true);
      }
    } else if (s === "anfragen" && itemId) {
      setSection("anfragen");
      if (anfragen.some((a) => a.id === itemId)) {
        setSelectedId(itemId);
        setMobileDetailOpen(true);
      }
    }
  }, [searchParams, auftraege, anfragen, angebote]);

  function switchSection(id: PartnerSection) {
    setSection(id);
    setMobileDetailOpen(false);
    if (id !== "gpt") setGptOpen(false);
    if (id === "uebersicht" || id === "gpt") return;
    if (id === "anfragen") setSelectedId(firstAnfrageId(anfragenOffenListe));
    else if (id === "angebote") setSelectedId(angeboteSorted[0]?.id ?? null);
    else if (id === "auftraege") setSelectedId(auftraege[0]?.id ?? null);
  }

  function openFromOverview(tab: OverviewTabId, id: string) {
    setSelectedId(id);
    setSection(tab);
    setMobileDetailOpen(true);
  }

  function selectRow(id: string) {
    setSelectedId(id);
    setMobileDetailOpen(true);
  }

  const waNumber = SITE_CONFIG.phoneMobil.replace(/\D/g, "");
  const waHref = `https://wa.me/${waNumber}?text=${encodeURIComponent(
    "Hallo Bärenwald, ich habe eine Frage zum Partner-Portal."
  )}`;

  const emptyMessage =
    section === "anfragen"
      ? "Keine Anfragen — du wirst per E-Mail benachrichtigt, sobald Bärenwald dich einbindet."
      : section === "angebote"
        ? "Keine angenommenen Anfragen — nach Annahme erscheinen sie hier zur Angebotseinreichung."
        : section === "auftraege"
          ? "Keine Aufträge — sie erscheinen, sobald ein Projekt für dich angelegt ist."
          : "";

  const detailPanel = (() => {
    if (section === "anfragen" && selectedAnfrage) {
      return <PartnerAnfrageDetail item={selectedAnfrage} />;
    }
    if (section === "angebote" && selectedAngebot) {
      return <PartnerAngebotDetail item={selectedAngebot} />;
    }
    if (section === "auftraege" && selectedAuftrag) {
      return <PartnerAuftragDetail item={selectedAuftrag} />;
    }
    return <p className="text-sm text-text-secondary">Nichts ausgewählt.</p>;
  })();

  const overviewRows =
    overviewTab === "anfragen"
      ? overviewAnfragenRows
      : overviewTab === "angebote"
        ? overviewAngeboteRows
        : overviewAuftraegeRows;

  return (
    <div className="min-h-screen bg-surface-page">
      <header className="sticky top-0 z-50 border-b border-border-default bg-surface-card/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[68px] max-w-[1200px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Image src="/logo-mark-green.png" alt="Bärenwald" width={28} height={28} />
            <div>
              <p className="text-sm font-semibold leading-none text-text-primary">
                Bärenwald <span className="text-accent">Partner</span>
              </p>
              <p className="mt-0.5 text-xs text-text-tertiary">{displayName}</p>
            </div>
          </div>
          <form action="/partner/auth/signout" method="post">
            <button
              type="submit"
              className="btn-pill-outline !px-2.5 !py-2 !text-[11px] sm:!px-3 sm:!text-[12px]"
            >
              Abmelden
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1200px] grid-cols-1 gap-4 px-4 pb-36 pt-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-6 lg:pb-10">
        <aside className="hidden lg:block">
          <div className="sticky top-[92px] space-y-3">
            <nav className="card-bordered space-y-1 p-2">
              {MENU_ITEMS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => switchSection(id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold",
                    section === id
                      ? "bg-accent-light text-accent"
                      : "text-text-secondary hover:bg-muted"
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {label}
                  </span>
                  <span className="text-xs text-text-tertiary">
                    {id === "anfragen"
                      ? offeneAnfragenCount || anfragen.length
                      : id === "angebote"
                        ? angebote.length
                        : id === "auftraege"
                          ? auftraege.length
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
                <p className="text-sm text-text-secondary">
                  Willkommen im Partner-Portal
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

          {section === "uebersicht" ? (
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
                    Angebote offen
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold sm:mt-2 sm:text-4xl">
                    {offeneAngeboteCount}
                  </p>
                </article>
                <article className="card-bordered p-4">
                  <p className="text-[10px] uppercase tracking-wider text-text-tertiary sm:text-xs">
                    Aktive Aufträge
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold sm:mt-2 sm:text-4xl">
                    {aktiveAuftraegeCount}
                  </p>
                </article>
              </div>

              <article className="card-bordered p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex gap-2">
                    {(
                      [
                        ["anfragen", "Anfragen"],
                        ["angebote", "Angebote"],
                        ["auftraege", "Aufträge"],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setOverviewTab(id)}
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
                    type="button"
                    className="text-sm font-semibold text-accent"
                    onClick={() => switchSection(overviewTab)}
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
                          {overviewTab === "auftraege" ? "Projekt" : "Gewerk"}
                        </th>
                        <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {overviewRows.length === 0 ? (
                        <tr className="border-t border-border-light">
                          <td
                            colSpan={3}
                            className="px-3 py-6 text-center text-sm text-text-secondary"
                          >
                            {emptyLabelForTab(overviewTab)}
                          </td>
                        </tr>
                      ) : (
                        overviewRows.slice(0, 5).map((row) => (
                          <tr
                            key={row.id}
                            className="cursor-pointer border-t border-border-light hover:bg-muted/70"
                            onClick={() => openFromOverview(overviewTab, row.id)}
                          >
                            <td className="px-3 py-2 text-sm text-text-secondary">
                              {fmtDate(row.date)}
                            </td>
                            <td className="px-3 py-2 text-sm font-semibold text-text-primary">
                              <span className="block max-w-[200px] truncate sm:max-w-none">
                                {row.title}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-sm">
                              <span className={statusPillClass(row.status)}>
                                {overviewTab === "angebote" && row.status === "offen"
                                  ? "Offen"
                                  : overviewTab === "angebote" && row.status === "eingereicht"
                                    ? "Eingereicht"
                                    : row.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </article>

              <section className="border-t border-border-default pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-text-tertiary">
                      Kontakt
                    </p>
                    <p className="text-sm text-text-secondary">
                      Fragen zu Anfragen, Aufträgen oder dem Portal? Bärenwald ist für dich
                      erreichbar.
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
                        "Frage Partner-Portal"
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
          ) : null}

          {section !== "uebersicht" && section !== "gpt" ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <article className="card-bordered overflow-hidden p-0">
                <table className="w-full bg-surface-card text-left">
                  <thead className="bg-muted/70">
                    <tr>
                      <th className="px-3 py-2 text-xs font-semibold uppercase text-text-tertiary">
                        {section === "auftraege" ? "Start" : "Datum"}
                      </th>
                      <th className="px-3 py-2 text-xs font-semibold uppercase text-text-tertiary">
                        {section === "auftraege" ? "Projekt" : "Gewerk"}
                      </th>
                      <th className="px-3 py-2 text-xs font-semibold uppercase text-text-tertiary">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {listItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-8 text-center text-sm text-text-secondary"
                        >
                          {emptyMessage}
                        </td>
                      </tr>
                    ) : section === "auftraege" ? (
                      auftraege.map((item) => (
                        <tr
                          key={item.id}
                          onClick={() => selectRow(item.id)}
                          className={cn(
                            "cursor-pointer border-t border-border-light",
                            selectedAuftrag?.id === item.id
                              ? "bg-accent-light"
                              : "hover:bg-muted/70"
                          )}
                        >
                          <td className="px-3 py-2 text-sm text-text-secondary">
                            {fmtDate(item.start_datum ?? undefined)}
                          </td>
                          <td className="px-3 py-2 text-sm font-semibold text-text-primary">
                            {item.titel}
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <span className={statusPillClass(item.status)}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      (listItems as PartnerAnfrageItem[]).map((item) => (
                        <tr
                          key={item.id}
                          onClick={() => selectRow(item.id)}
                          className={cn(
                            "cursor-pointer border-t border-border-light",
                            selectedId === item.id
                              ? "bg-accent-light"
                              : "hover:bg-muted/70"
                          )}
                        >
                          <td className="px-3 py-2 text-sm text-text-secondary">
                            {fmtDate(
                              section === "angebote"
                                ? item.antwort_at ?? item.gesendet_at
                                : item.gesendet_at
                            )}
                          </td>
                          <td className="px-3 py-2 text-sm font-semibold text-text-primary">
                            {item.gewerk_name}
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <span
                              className={statusPillClass(
                                section === "angebote"
                                  ? item.hw_eingereicht_at
                                    ? "eingereicht"
                                    : "offen"
                                  : section === "anfragen"
                                    ? isPartnerAnfrageOffen(item)
                                      ? "antwort ausstehend"
                                      : item.status
                                    : item.status
                              )}
                            >
                              {section === "angebote"
                                ? item.hw_eingereicht_at
                                  ? "Eingereicht"
                                  : "Offen"
                                : section === "anfragen"
                                  ? partnerAnfrageStatusLabel(item)
                                  : item.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </article>

              <aside className="hidden lg:block">
                <article className="card-bordered sticky top-[92px] max-h-[calc(100vh-110px)] overflow-y-auto p-4">
                  {detailPanel}
                </article>
              </aside>
            </div>
          ) : null}
        </section>
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-[90] border-t border-border-default bg-surface-card/95 backdrop-blur-sm lg:hidden"
        aria-label="Partner Navigation"
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
                  "rounded-lg px-0.5 py-2 text-[10px] font-medium",
                  section === id ? "text-accent" : "text-text-tertiary"
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
              onClick={() => {
                setGptOpen(true);
                setSection("gpt");
              }}
              aria-label="BärenwaldGPT öffnen"
              aria-pressed={gptOpen || section === "gpt"}
              className={cn(
                "-mt-8 flex min-h-[64px] w-[72px] flex-col items-center justify-center gap-1 rounded-full border-[3px] border-white/30 bg-gradient-to-br from-[#143D28] via-[#2E7D52] to-[#4BA3A3] px-1 py-2 text-white shadow-[0_10px_28px_rgba(30,90,60,0.45)] ring-[5px] ring-surface-card transition-transform active:scale-95",
                (gptOpen || section === "gpt") &&
                  "ring-[#2E7D52] shadow-[0_12px_32px_rgba(46,125,82,0.55)]"
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
                onClick={() => switchSection(id)}
                className={cn(
                  "rounded-lg px-0.5 py-2 text-[10px] font-medium",
                  section === id ? "text-accent" : "text-text-tertiary"
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

      {mobileDetailOpen &&
      section !== "uebersicht" &&
      section !== "gpt" &&
      listItems.length > 0 ? (
        <div className="fixed inset-0 z-[120] bg-black/40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => setMobileDetailOpen(false)}
            aria-label="Schließen"
          />
          <article className="absolute inset-x-0 bottom-0 flex max-h-[min(88vh,720px)] flex-col rounded-t-2xl border border-border-default bg-surface-card shadow-xl">
            <div className="shrink-0 px-4 pb-2 pt-3">
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border-default" />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">{detailPanel}</div>
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
        onClose={() => {
          setGptOpen(false);
          if (section === "gpt") setSection("uebersicht");
        }}
      />
    </div>
  );
}
