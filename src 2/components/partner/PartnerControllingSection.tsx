"use client";

import { useMemo } from "react";

import type { PartnerVorgangItem } from "@/lib/partner/build-partner-vorgaenge";

/** S9 Partner-Controlling (Übersicht-KPIs) */
export function PartnerControllingSection({
  vorgaenge,
}: {
  vorgaenge: PartnerVorgangItem[];
}) {
  const stats = useMemo(() => {
    const offen = vorgaenge.filter((v) => v.state !== "erledigt").length;
    const erledigt = vorgaenge.filter((v) => v.state === "erledigt").length;
    const inBearbeitung = vorgaenge.filter(
      (v) => v.state === "in_bearbeitung"
    ).length;
    return { offen, erledigt, inBearbeitung, gesamt: vorgaenge.length };
  }, [vorgaenge]);

  return (
    <section className="space-y-3">
      <div>
        <p className="portal-text-section text-text-primary">Controlling</p>
        <p className="portal-text-body text-text-secondary">
          Auftragslage auf einen Blick
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <article className="portal-kpi-card">
          <p className="portal-kpi-label">Offen</p>
          <p className="portal-kpi-value">{stats.offen}</p>
        </article>
        <article className="portal-kpi-card">
          <p className="portal-kpi-label">In Bearbeitung</p>
          <p className="portal-kpi-value">{stats.inBearbeitung}</p>
        </article>
        <article className="portal-kpi-card">
          <p className="portal-kpi-label">Erledigt</p>
          <p className="portal-kpi-value">{stats.erledigt}</p>
        </article>
        <article className="portal-kpi-card">
          <p className="portal-kpi-label">Gesamt</p>
          <p className="portal-kpi-value">{stats.gesamt}</p>
        </article>
      </div>
    </section>
  );
}
