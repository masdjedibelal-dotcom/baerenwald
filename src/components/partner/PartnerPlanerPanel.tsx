"use client";

import { PortalIcon } from "@/components/portal/PortalIcon";
import { useMemo, useState } from "react";
import { PortalButton } from "@/components/portal/PortalButton";

import {
  buildPartnerTerminAuftragCards,
  type PartnerPlanerSection,
  type PartnerTerminAuftragCard,
  type PartnerTerminItem,
} from "@/lib/partner/build-partner-termine";
import {
  groupPartnerAufgaben,
  type PartnerAufgabeItem,
} from "@/lib/partner/build-partner-aufgaben";
import type {
  PartnerAuftragItem,
} from "@/lib/partner/get-partner-data";
import { cn } from "@/lib/utils";

type PlanerTab = "termine" | "aufgaben";

export function PartnerPlanerPanel({
  termine,
  aufgaben,
  auftragAnfragen,
  auftraege,
  onNavigate,
}: {
  termine: PartnerTerminItem[];
  aufgaben: PartnerAufgabeItem[];
  auftragAnfragen: PartnerAuftragItem[];
  auftraege: PartnerAuftragItem[];
  onNavigate: (section: PartnerPlanerSection, selectedId?: string) => void;
}) {
  const [tab, setTab] = useState<PlanerTab>("termine");

  const terminCards = useMemo(
    () => buildPartnerTerminAuftragCards({ auftragAnfragen, auftraege }),
    [auftragAnfragen, auftraege]
  );

  const aufgabenGruppen = useMemo(() => groupPartnerAufgaben(aufgaben), [aufgaben]);

  const terminCount = terminCards.length;
  const aufgabenCount = aufgaben.length;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="portal-text-section text-text-primary">Planer</h2>
        <p className="portal-text-body text-text-secondary">
          Termine je Auftrag und offene Aufgaben — gruppiert nach Projekt.
        </p>
      </div>

      <div className="flex gap-1 rounded-sheet border border-border-light bg-muted/30 p-1">
        <TabButton
          active={tab === "termine"}
          onClick={() => setTab("termine")}
          icon="calendar-event"
          label="Termine"
          count={terminCount || termine.length}
        />
        <TabButton
          active={tab === "aufgaben"}
          onClick={() => setTab("aufgaben")}
          icon="list-todo"
          label="To-dos"
          count={aufgabenCount}
        />
      </div>

      {tab === "termine" ? (
        <div className="space-y-3">
          {terminCards.length === 0 ? (
            <p className="portal-text-body rounded-sheet border border-dashed border-border-light bg-muted/20 px-4 py-10 text-center text-text-secondary">
              Keine Termine — sobald Leistungen mit Start- oder Enddatum zugewiesen sind,
              erscheint hier je Auftrag eine Übersicht.
            </p>
          ) : (
            terminCards.map((card) => (
              <TerminAuftragCard
                key={card.id}
                card={card}
                onNavigate={onNavigate}
              />
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {aufgabenGruppen.length === 0 ? (
            <p className="portal-text-body rounded-sheet border border-dashed border-border-light bg-muted/20 px-4 py-10 text-center text-text-secondary">
              Keine offenen To-dos — alles erledigt.
            </p>
          ) : (
            aufgabenGruppen.map((gruppe) => (
              <section
                key={gruppe.key}
                className={cn(
                  "rounded-sheet border border-border-light bg-surface-card overflow-hidden",
                  gruppe.dringend && "border-warning-border"
                )}
              >
                <PortalButton
                  variant="ghost"
                  type="button"
                  onClick={() => onNavigate(gruppe.section, gruppe.selectedId)}
                  className="flex w-full items-start justify-between gap-3 border-b border-border-light px-4 py-3 text-left hover:bg-muted/30"
                >
                  <span className="min-w-0">
                    <span className="portal-text-body block font-semibold text-text-primary">
                      {gruppe.titel}
                    </span>
                    {gruppe.untertitel ? (
                      <span className="portal-text-meta mt-0.5 block text-text-secondary">
                        {gruppe.untertitel}
                      </span>
                    ) : null}
                  </span>
                  <span className="tag shrink-0 bg-muted text-text-secondary">
                    {gruppe.items.length}
                  </span>
                </PortalButton>
                <ul className="divide-y divide-border-light">
                  {gruppe.items.map((aufgabe) => (
                    <li key={aufgabe.id}>
                      <PortalButton
                        variant="primary"
                        type="button"
                        onClick={() => onNavigate(aufgabe.section, aufgabe.selectedId)}
                        className={cn(
                          "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-accent-light/20",
                          aufgabe.dringend && "bg-warning-bg/30"
                        )}
                      >
                        <AufgabeTypDot typ={aufgabe.typ} dringend={aufgabe.dringend} />
                        <span className="min-w-0 flex-1">
                          <span className="portal-text-body block font-medium text-text-primary">
                            {aufgabe.titel}
                          </span>
                          {aufgabe.untertitel ? (
                            <span className="portal-text-meta mt-0.5 block text-text-secondary">
                              {aufgabe.untertitel}
                            </span>
                          ) : null}
                        </span>
                      </PortalButton>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function TerminAuftragCard({
  card,
  onNavigate,
}: {
  card: PartnerTerminAuftragCard;
  onNavigate: (section: PartnerPlanerSection, selectedId?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const canExpand = card.detailsAufklappbar && card.leistungen.length > 0;

  return (
    <article className="rounded-button border border-border-light bg-surface-card overflow-hidden">
      <PortalButton
        variant="ghost"
        type="button"
        onClick={() => {
          if (canExpand) {
            setOpen((v) => !v);
            return;
          }
          onNavigate(card.section, card.selectedId);
        }}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/20"
      >
        <PortalIcon n="calendar-event" ctx="default" className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="portal-text-body block font-semibold text-text-primary">
            {card.titel}
          </span>
          {card.ort ? (
            <span className="portal-text-meta mt-0.5 block text-text-secondary">
              {card.ort}
            </span>
          ) : null}
          <span className="portal-text-meta mt-1 block font-medium text-accent">
            {card.vonBisLabel}
          </span>
        </span>
        {canExpand ? (
          <PortalIcon n="chevron-down" ctx="default" className={cn(
              "mt-1 h-4 w-4 shrink-0 text-text-tertiary transition-transform",
              open && "rotate-180"
            )} aria-hidden />
        ) : null}
      </PortalButton>

      {canExpand && open ? (
        <div className="border-t border-border-light bg-muted/10 px-4 py-3">
          <p className="portal-text-label mb-2 text-text-tertiary">Leistungen</p>
          <ul className="space-y-2">
            {card.leistungen.map((l) => (
              <li
                key={l.id}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-card bg-surface-card px-3 py-2"
              >
                <span className="portal-text-body text-text-primary">{l.label}</span>
                <span className="portal-text-meta text-text-secondary">{l.vonBisLabel}</span>
              </li>
            ))}
          </ul>
          <PortalButton
            variant="ghost"
            type="button"
            onClick={() => onNavigate(card.section, card.selectedId)}
            className="portal-text-meta mt-3 font-semibold text-accent hover:underline"
          >
            Zum Auftrag →
          </PortalButton>
        </div>
      ) : null}

      {!canExpand && card.leistungen.length === 1 ? (
        <div className="border-t border-border-light px-4 py-2">
          <p className="portal-text-meta text-text-secondary">
            {card.leistungen[0]!.label}
          </p>
        </div>
      ) : null}
    </article>
  );
}

function AufgabeTypDot({
  typ,
  dringend,
}: {
  typ: PartnerAufgabeItem["typ"];
  dringend?: boolean;
}) {
  const color =
    typ === "unterlagen_hochladen" || typ === "dokument_hochladen"
      ? "bg-p2-primary"
      : typ === "bestaetigen" || typ === "auftrag_annehmen"
        ? "bg-p2-primary"
        : dringend
          ? "bg-warning-bg"
          : "bg-text-tertiary";

  return (
    <span
      className={cn("mt-2 h-2 w-2 shrink-0 rounded-pill", color)}
      aria-hidden
    />
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: "calendar-event" | "list-todo";
  label: string;
  count: number;
}) {
  return (
    <PortalButton
      variant="primary"
      type="button"
      onClick={onClick}
      className={cn(
        "portal-text-body flex flex-1 items-center justify-center gap-2 rounded-card px-3 py-2.5 font-semibold transition-colors",
        active ? "bg-surface-card text-accent shadow-sm" : "text-text-secondary hover:text-text-primary"
      )}
    >
      <PortalIcon n={icon} ctx={active ? "active" : "muted"} className="h-4 w-4" />
      {label}
      {count > 0 ? (
        <span
          className={cn(
            "tag text-fs-caption",
            active ? "bg-accent-light text-accent" : "bg-muted text-text-tertiary"
          )}
        >
          {count}
        </span>
      ) : null}
    </PortalButton>
  );
}
