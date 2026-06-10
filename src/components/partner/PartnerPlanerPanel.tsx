"use client";

import { useState } from "react";
import { CalendarDays, ListTodo } from "lucide-react";

import {
  groupPartnerTermine,
  type PartnerTerminItem,
} from "@/lib/partner/build-partner-termine";
import type { PartnerAufgabeItem } from "@/lib/partner/build-partner-aufgaben";
import { cn } from "@/lib/utils";

type PlanerTab = "termine" | "aufgaben";

export function PartnerPlanerPanel({
  termine,
  aufgaben,
  onNavigate,
}: {
  termine: PartnerTerminItem[];
  aufgaben: PartnerAufgabeItem[];
  onNavigate: (section: PartnerTerminItem["section"], selectedId?: string) => void;
}) {
  const [tab, setTab] = useState<PlanerTab>("termine");

  const terminGroups = groupPartnerTermine(termine);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="portal-text-section text-text-primary">Planer</h2>
        <p className="portal-text-body text-text-secondary">
          Termine aus zugewiesenen Leistungen und offene Aufgaben aus deinen Projekten.
        </p>
      </div>

      <div className="flex gap-1 rounded-xl border border-border-light bg-muted/30 p-1">
        <TabButton
          active={tab === "termine"}
          onClick={() => setTab("termine")}
          icon={CalendarDays}
          label="Termine"
          count={termine.length}
        />
        <TabButton
          active={tab === "aufgaben"}
          onClick={() => setTab("aufgaben")}
          icon={ListTodo}
          label="Aufgaben"
          count={aufgaben.length}
        />
      </div>

      {tab === "termine" ? (
        <div className="space-y-4">
          {termine.length === 0 ? (
            <p className="portal-text-body rounded-xl border border-dashed border-border-light bg-muted/20 px-4 py-10 text-center text-text-secondary">
              Keine Termine — sobald im CRM Leistungen mit Start- oder Enddatum zugewiesen sind,
              erscheinen sie hier.
            </p>
          ) : (
            terminGroups.map((group) => (
              <section key={group.label} className="space-y-2">
                <p className="portal-text-label text-text-tertiary">{group.label}</p>
                <ul className="space-y-2">
                  {group.items.map((termin) => (
                    <li key={termin.id}>
                      <button
                        type="button"
                        onClick={() => onNavigate(termin.section, termin.selectedId)}
                        className="w-full rounded-xl border border-border-light bg-surface-card px-4 py-3 text-left transition-colors hover:border-accent/30 hover:bg-accent-light/20"
                      >
                        <p className="portal-text-body font-semibold text-text-primary">
                          {termin.titel}
                        </p>
                        {termin.untertitel ? (
                          <p className="portal-text-meta mt-0.5 text-text-secondary">
                            {termin.untertitel}
                          </p>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {aufgaben.length === 0 ? (
            <p className="portal-text-body rounded-xl border border-dashed border-border-light bg-muted/20 px-4 py-10 text-center text-text-secondary">
              Keine offenen Aufgaben — alles erledigt.
            </p>
          ) : (
            <ul className="space-y-2">
              {aufgaben.map((aufgabe) => (
                <li key={aufgabe.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate(aufgabe.section, aufgabe.selectedId)}
                    className={cn(
                      "w-full rounded-xl border border-border-light bg-surface-card px-4 py-3 text-left transition-colors hover:border-accent/30 hover:bg-accent-light/20",
                      aufgabe.dringend && "border-amber-200 bg-amber-50/40"
                    )}
                  >
                    <p className="portal-text-body font-semibold text-text-primary">
                      {aufgabe.titel}
                    </p>
                    {aufgabe.untertitel ? (
                      <p className="portal-text-meta mt-0.5 text-text-secondary">
                        {aufgabe.untertitel}
                      </p>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof CalendarDays;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "portal-text-body flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 font-semibold transition-colors",
        active ? "bg-surface-card text-accent shadow-sm" : "text-text-secondary hover:text-text-primary"
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
      {count > 0 ? (
        <span className={cn("tag text-[11px]", active ? "bg-accent-light text-accent" : "bg-muted text-text-tertiary")}>
          {count}
        </span>
      ) : null}
    </button>
  );
}
