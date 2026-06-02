"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  Briefcase,
  ClipboardList,
  FileText,
} from "lucide-react";

import { PartnerAnfrageDetail } from "@/components/partner/PartnerAnfrageDetail";
import { PartnerAngebotDetail } from "@/components/partner/PartnerAngebotDetail";
import { PartnerAuftragDetail } from "@/components/partner/PartnerAuftragDetail";
import type {
  PartnerAnfrageItem,
  PartnerAuftragItem,
} from "@/lib/partner/get-partner-data";
import { cn } from "@/lib/utils";

type PartnerSection = "anfragen" | "angebote" | "auftraege";

const MENU_ITEMS: Array<{
  id: PartnerSection;
  label: string;
  icon: typeof ClipboardList;
}> = [
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

function statusPillClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "akzeptiert" || s === "eingereicht" || s === "abgeschlossen") {
    return "tag bg-emerald-100 text-emerald-700";
  }
  if (s === "abgelehnt" || s === "storniert") return "tag bg-red-100 text-red-700";
  return "tag bg-amber-100 text-amber-700";
}

function hwStatusLabel(item: PartnerAnfrageItem): string {
  if (item.hw_eingereicht_at) return "Eingereicht";
  return "Offen";
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
  const [section, setSection] = useState<PartnerSection>("anfragen");
  const [selectedId, setSelectedId] = useState<string | null>(
    anfragen[0]?.id ?? null
  );
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const displayName = handwerker.firma?.trim() || handwerker.name;

  const angebote = useMemo(
    () => anfragen.filter((a) => a.status.toLowerCase() === "akzeptiert"),
    [anfragen]
  );

  const offeneAnfragen = anfragen.filter(
    (a) =>
      !a.antwort_at &&
      ["angefragt", "ausstehend", "zugewiesen"].includes(a.status.toLowerCase())
  ).length;

  const offeneAngebote = angebote.filter((a) => !a.hw_eingereicht_at).length;

  const listItems = useMemo(() => {
    if (section === "angebote") return angebote;
    if (section === "auftraege") return auftraege;
    return anfragen;
  }, [section, anfragen, angebote, auftraege]);

  const selectedAnfrage = useMemo(
    () => anfragen.find((a) => a.id === selectedId) ?? anfragen[0],
    [anfragen, selectedId]
  );

  const selectedAngebot = useMemo(
    () => angebote.find((a) => a.id === selectedId) ?? angebote[0],
    [angebote, selectedId]
  );

  const selectedAuftrag = useMemo(
    () => auftraege.find((a) => a.id === selectedId) ?? auftraege[0],
    [auftraege, selectedId]
  );

  function switchSection(id: PartnerSection) {
    setSection(id);
    setMobileDetailOpen(false);
    if (id === "anfragen") setSelectedId(anfragen[0]?.id ?? null);
    else if (id === "angebote") setSelectedId(angebote[0]?.id ?? null);
    else setSelectedId(auftraege[0]?.id ?? null);
  }

  function selectRow(id: string) {
    setSelectedId(id);
    setMobileDetailOpen(true);
  }

  const emptyMessage =
    section === "anfragen"
      ? "Keine Anfragen — du wirst per E-Mail benachrichtigt, sobald Bärenwald dich einbindet."
      : section === "angebote"
        ? "Keine angenommenen Anfragen — nach Annahme erscheinen sie hier zur Angebotseinreichung."
        : "Keine Aufträge — sie erscheinen, sobald ein Projekt für dich angelegt ist.";

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
    return (
      <p className="text-sm text-text-secondary">Nichts ausgewählt.</p>
    );
  })();

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

      <main className="mx-auto grid max-w-[1200px] grid-cols-1 gap-4 px-4 pb-24 pt-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:px-6 lg:pb-10">
        <aside className="hidden lg:block">
          <nav className="card-bordered sticky top-[92px] space-y-1 p-2">
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
                {id === "anfragen" || id === "angebote" ? (
                  <span className="text-xs text-text-tertiary">
                    {id === "anfragen" ? offeneAnfragen : offeneAngebote}
                  </span>
                ) : (
                  <span className="text-xs text-text-tertiary">{auftraege.length}</span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        <section className="space-y-4">
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
                                : item.status
                            )}
                          >
                            {section === "angebote"
                              ? hwStatusLabel(item)
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
        </section>
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-[90] border-t border-border-default bg-surface-card/95 backdrop-blur-sm lg:hidden"
        aria-label="Partner Navigation"
      >
        <div className="grid grid-cols-3 px-1 py-2">
          {MENU_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => switchSection(id)}
              className={cn(
                "rounded-lg py-2 text-[10px] font-medium",
                section === id ? "text-accent" : "text-text-tertiary"
              )}
            >
              <span className="flex flex-col items-center gap-0.5">
                <Icon className="h-[18px] w-[18px]" />
                {label}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {mobileDetailOpen && listItems.length > 0 ? (
        <div className="fixed inset-0 z-[120] bg-black/40 lg:hidden">
          <button
            className="absolute inset-0"
            onClick={() => setMobileDetailOpen(false)}
            aria-label="Schließen"
          />
          <article className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-2xl border border-border-default bg-surface-card shadow-xl">
            <div className="min-h-0 flex-1 overflow-y-auto p-4">{detailPanel}</div>
            <div className="border-t border-border-light p-4">
              <button
                type="button"
                className="btn-pill-primary w-full !py-2.5"
                onClick={() => setMobileDetailOpen(false)}
              >
                Schließen
              </button>
            </div>
          </article>
        </div>
      ) : null}
    </div>
  );
}
