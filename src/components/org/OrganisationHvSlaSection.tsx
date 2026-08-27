"use client";

import { useEffect, useState } from "react";

import { InfoTip } from "@/components/ui/InfoTip";
import {
  formatTypischDauerStunden,
  formatTypischDauerTage,
  type OrgSlaKpis,
} from "@/lib/org/compute-org-sla-kpis";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { cn } from "@/lib/utils";

const REAKTION_TIP =
  "Typische Zeit bis zur ersten Bearbeitung bei bearbeiteten Meldungen (letzte 90 Tage). Keine vertragliche Garantie.";

const ERLEDIGUNG_TIP =
  "Typische Dauer von Meldeeingang bis Abschluss bei abgeschlossenen Vorgängen (letzte 90 Tage). Median — keine vertragliche Garantie.";

function basisFootnote(
  basis: number,
  wenigDaten: boolean,
  leer: boolean,
  label: string
): string {
  if (leer) return "Noch keine ausreichenden Daten";
  if (wenigDaten) return `Noch wenig Daten (${basis} ${label})`;
  return `Basis: ${basis} ${label}`;
}

function SlaTile({
  title,
  value,
  footnote,
  tip,
}: {
  title: string;
  value: string;
  footnote: string;
  tip: string;
}) {
  return (
    <div
      className="rounded-[12px] border bg-white p-3.5 sm:p-4"
      style={{ borderColor: PORTAL_VAR.line }}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="portal-text-label normal-case tracking-normal text-text-secondary">
          {title}
        </p>
        <InfoTip tip={tip} label="Erklärung" />
      </div>
      <p className="portal-text-title leading-none">{value}</p>
      <p className="portal-text-meta mt-2 text-text-tertiary">{footnote}</p>
    </div>
  );
}

export function OrganisationHvSlaSection() {
  const [data, setData] = useState<OrgSlaKpis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/org/dashboard/sla?days=90")
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as OrgSlaKpis;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const reaktionValue =
    data && !data.reaktionszeit.leer && data.reaktionszeit.medianStunden != null
      ? `Typisch: ${formatTypischDauerStunden(data.reaktionszeit.medianStunden)}`
      : "—";

  const erledigungValue =
    data &&
    !data.erledigungsdauer.leer &&
    data.erledigungsdauer.medianTage != null
      ? `Typisch: ${formatTypischDauerTage(data.erledigungsdauer.medianTage)}`
      : "—";

  return (
    <section className="mb-1" aria-labelledby="hv-sla-heading">
      <h2
        id="hv-sla-heading"
        className="portal-text-section mb-3 px-0.5"
      >
        Verlässlichkeit (letzte 90 Tage)
      </h2>
      {loading ? (
        <p className="portal-text-meta px-0.5 text-text-tertiary">
          Kennzahlen werden geladen …
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
            <SlaTile
              title="Typische Reaktionszeit"
              value={reaktionValue}
              tip={REAKTION_TIP}
              footnote={basisFootnote(
                data?.reaktionszeit.basis ?? 0,
                data?.reaktionszeit.wenigDaten ?? false,
                data?.reaktionszeit.leer ?? true,
                data?.reaktionszeit.basis === 1 ? "Vorgang" : "Vorgänge"
              )}
            />
            <SlaTile
              title="Typische Erledigungsdauer"
              value={erledigungValue}
              tip={ERLEDIGUNG_TIP}
              footnote={basisFootnote(
                data?.erledigungsdauer.basis ?? 0,
                data?.erledigungsdauer.wenigDaten ?? false,
                data?.erledigungsdauer.leer ?? true,
                data?.erledigungsdauer.basis === 1 ? "Vorgang" : "Vorgänge"
              )}
            />
          </div>
          <p
            className={cn(
              "portal-text-meta mt-3 px-0.5 text-text-tertiary"
            )}
          >
            Offene, noch nicht bearbeitete Meldungen fließen nicht in die
            Reaktionszeit ein — siehe Kachel „Offen“.
          </p>
        </>
      )}
    </section>
  );
}
