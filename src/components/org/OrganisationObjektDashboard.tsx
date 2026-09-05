"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type DashboardData = {
  jahr: number;
  bruttoJahr: number;
  nachTraeger: Record<string, number>;
  offeneVorgaenge: number;
  pruefpflichtenFaellig: number;
  fremdVorgaenge?: number;
};

function fmtEur(n: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
}

/** S3 Objekt-Dashboard */
export function OrganisationObjektDashboard({ objektId }: { objektId: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/org/objekte/dashboard?objektId=${objektId}`);
      const json = (await res.json()) as DashboardData & { error?: string };
      if (!cancelled && res.ok) setData(json);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [objektId]);

  if (loading) {
    return <p className="text-sm text-text-secondary">Dashboard lädt…</p>;
  }
  if (!data) {
    return <p className="text-sm text-text-secondary">Keine Dashboard-Daten.</p>;
  }

  const traeger = Object.entries(data.nachTraeger);

  return (
    <div className="space-y-4 rounded-xl border border-border-default p-4 bg-muted/30">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-text-primary">
          Objekt-Dashboard {data.jahr}
        </p>
        <a
          href={`/api/org/objekte/bericht?objektId=${objektId}&jahr=${data.jahr}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent"
        >
          <Download className="h-3.5 w-3.5" />
          Jahresbericht PDF
        </a>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <article className="portal-kpi-card">
          <p className="portal-kpi-label">Kosten {data.jahr}</p>
          <p className="portal-kpi-value text-lg">{fmtEur(data.bruttoJahr)}</p>
        </article>
        <article className="portal-kpi-card">
          <p className="portal-kpi-label">Offene Vorgänge</p>
          <p className="portal-kpi-value">{data.offeneVorgaenge}</p>
        </article>
        <article className="portal-kpi-card">
          <p className="portal-kpi-label">Prüfpflichten fällig</p>
          <p className="portal-kpi-value">{data.pruefpflichtenFaellig}</p>
        </article>
        {(data.fremdVorgaenge ?? 0) > 0 ? (
          <article className="portal-kpi-card">
            <p className="portal-kpi-label">Fremd (extern)</p>
            <p className="portal-kpi-value">{data.fremdVorgaenge}</p>
          </article>
        ) : null}
      </div>

      {traeger.length > 0 ? (
        <div>
          <p className="text-xs font-medium uppercase text-text-tertiary mb-2">
            Nach Kostenträger
          </p>
          <ul className="space-y-1 text-sm">
            {traeger.map(([key, val]) => (
              <li key={key} className="flex justify-between gap-2">
                <span className="text-text-secondary">{key}</span>
                <span className="font-medium">{fmtEur(val)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
