"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

import type { ObjektFinanzPortalPayload } from "@/lib/org/objektakte/load-objekt-finanz-portal";
import { OrganisationVersammlungsberichtSheet } from "@/components/org/OrganisationVersammlungsberichtSheet";
import { EinstellungenSectionCard } from "@/components/shared/PortalEinstellungenUi";
import { PortalInlineLoading } from "@/components/shared/PortalInlineLoading";
import { portalToastError } from "@/lib/shared/portal-toast";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { cn } from "@/lib/utils";

type ZeitraumPreset = "laufendes_jahr" | "letztes_jahr" | "12_monate" | "custom";

type Props = {
  objektId: string;
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function presetRange(preset: ZeitraumPreset): { von: string; bis: string } {
  const now = new Date();
  const y = now.getFullYear();
  if (preset === "laufendes_jahr") return { von: `${y}-01-01`, bis: isoDate(now) };
  if (preset === "letztes_jahr") return { von: `${y - 1}-01-01`, bis: `${y - 1}-12-31` };
  const bis = isoDate(now);
  const vonDate = new Date(now);
  vonDate.setFullYear(vonDate.getFullYear() - 1);
  vonDate.setDate(vonDate.getDate() + 1);
  return { von: isoDate(vonDate), bis };
}

function fmtEuro(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `${n.toLocaleString("de-DE")} €`;
}

function fmtDatum(iso: string): string {
  const d = iso?.slice(0, 10);
  if (!d) return "—";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString("de-DE");
}

/**
 * Stammdaten-Kennzahlen: Kosten + Vorgänge im Zeitraum.
 * Belege/Akten liegen unter Dokumente bzw. Vorgänge — hier keine Liste.
 */
export function OrganisationObjektFinanzPanel({ objektId }: Props) {
  const [preset, setPreset] = useState<ZeitraumPreset>("laufendes_jahr");
  const [von, setVon] = useState(() => presetRange("laufendes_jahr").von);
  const [bis, setBis] = useState(() => presetRange("laufendes_jahr").bis);
  const [data, setData] = useState<ObjektFinanzPortalPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [berichtOpen, setBerichtOpen] = useState(false);

  const load = useCallback(async () => {
    if (!objektId.trim() || !von.trim() || !bis.trim()) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ objektId, von, bis });
      const res = await fetch(`/api/org/objekte/finanz?${params}`);
      const json = (await res.json()) as ObjektFinanzPortalPayload & { error?: string };
      if (!res.ok) {
        portalToastError("Kosten konnten nicht geladen werden", json.error);
        setData(null);
        return;
      }
      setData(json);
    } catch {
      portalToastError("Kosten konnten nicht geladen werden");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [objektId, von, bis]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <EinstellungenSectionCard
      title="Kosten & Kennzahlen"
      trailing={
        <div className="relative">
          <button
            type="button"
            className="btn-pill-primary portal-btn inline-flex items-center gap-1.5 text-[13px]"
            onClick={() => setExportOpen((o) => !o)}
          >
            Export <ChevronDown className="h-4 w-4" />
          </button>
          {exportOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-10"
                aria-label="Schließen"
                onClick={() => setExportOpen(false)}
              />
              <div
                className="absolute right-0 z-20 mt-1 min-w-[220px] rounded-xl border bg-white py-1 shadow-lg"
                style={{ borderColor: PORTAL_VAR.line }}
              >
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-[13px] hover:bg-muted/60"
                  onClick={() => {
                    setExportOpen(false);
                    setBerichtOpen(true);
                  }}
                >
                  Versammlungsbericht (PDF)
                </button>
                <a
                  className="block px-3 py-2 text-[13px] hover:bg-muted/60"
                  href={`/api/org/objekte/kosten-csv?objektId=${encodeURIComponent(objektId)}&von=${encodeURIComponent(von)}&bis=${encodeURIComponent(bis)}`}
                  onClick={() => setExportOpen(false)}
                >
                  Kostenübersicht (CSV)
                </a>
              </div>
            </>
          ) : null}
        </div>
      }
    >
      <p className="portal-text-meta -mt-1 text-text-tertiary">
        Zeitraum: {fmtDatum(von)} – {fmtDatum(bis)}
      </p>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["laufendes_jahr", "Laufendes Jahr"],
            ["letztes_jahr", "Letztes Jahr"],
            ["12_monate", "12 Monate"],
            ["custom", "Benutzerdefiniert"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setPreset(id);
              if (id !== "custom") {
                const r = presetRange(id);
                setVon(r.von);
                setBis(r.bis);
              }
            }}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold",
              preset === id
                ? "bg-accent-light text-accent"
                : "border border-border-default bg-white text-text-secondary"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {preset === "custom" ? (
        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            className="portal-field text-[13px]"
            value={von}
            onChange={(e) => setVon(e.target.value)}
          />
          <input
            type="date"
            className="portal-field text-[13px]"
            value={bis}
            onChange={(e) => setBis(e.target.value)}
          />
        </div>
      ) : null}

      {loading ? (
        <PortalInlineLoading label="Kosten werden geladen" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <KpiTile
              label="Gesamtkosten"
              value={fmtEuro(data?.gesamtKosten ?? 0)}
              muted={!data?.rechnungenAnzahl}
            />
            <KpiTile
              label="Vorgänge"
              value={String(data?.vorgaengeAnzahl ?? 0)}
            />
            <KpiTile
              label="Offen / in Arbeit"
              value={String(data?.offenInArbeit ?? 0)}
            />
            <KpiTile
              label="Rechnungen"
              value={String(data?.rechnungenAnzahl ?? 0)}
            />
          </div>
          {(data?.ohneBetrag ?? 0) > 0 ? (
            <p className="portal-text-meta text-text-tertiary">
              {data?.ohneBetrag} Maßnahme
              {data?.ohneBetrag === 1 ? "" : "n"} ohne Kostenangabe — nicht in
              der Summe enthalten.
            </p>
          ) : null}
          {data && data.nachTraeger.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {data.nachTraeger.map((t) => (
                <li key={t.traeger} className="flex justify-between gap-2">
                  <span className="text-text-secondary">{t.traeger}</span>
                  <span className="font-medium">{fmtEuro(t.summe)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}

      <OrganisationVersammlungsberichtSheet
        open={berichtOpen}
        onClose={() => setBerichtOpen(false)}
        objektId={objektId}
      />
    </EinstellungenSectionCard>
  );
}

function KpiTile({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="portal-kpi-card">
      <p className={cn("portal-text-title leading-none", muted && "text-text-tertiary")}>
        {value}
      </p>
      <p className="portal-text-label mt-1.5 normal-case tracking-normal">{label}</p>
    </div>
  );
}
