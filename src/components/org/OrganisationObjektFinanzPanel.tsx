"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Download } from "lucide-react";

import type { ObjektFinanzPortalPayload } from "@/lib/org/objektakte/load-objekt-finanz-portal";
import { OrganisationVersammlungsberichtSheet } from "@/components/org/OrganisationVersammlungsberichtSheet";
import { EinstellungenSectionHeader } from "@/components/shared/PortalEinstellungenUi";
import {
  PORTAL_LIST_PAGE_SIZE,
  PortalListPagination,
} from "@/components/shared/PortalListPagination";
import { portalToastError } from "@/lib/shared/portal-toast";
import { PORTAL_VAR } from "@/lib/portal2/tokens";
import { cn } from "@/lib/utils";

type ZeitraumPreset = "laufendes_jahr" | "letztes_jahr" | "12_monate" | "custom";
type BelegFilter = "alle" | "rechnungen" | "protokolle" | "angebote";

type DocSlice = {
  id: string;
  name: string;
  datum?: string;
  href: string;
};

type Props = {
  objektId: string;
  dokumenteByLeadId?: Record<string, DocSlice[]>;
  onOpenVorgang?: (leadId: string) => void;
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

function docArt(name: string): "rechnung" | "angebot" | "protokoll" | "dokument" {
  if (/rechnung/i.test(name)) return "rechnung";
  if (/angebot/i.test(name)) return "angebot";
  if (/protokoll|abnahme|versicherungsakte/i.test(name)) return "protokoll";
  return "dokument";
}

export function OrganisationObjektFinanzPanel({
  objektId,
  dokumenteByLeadId = {},
  onOpenVorgang,
}: Props) {
  const [preset, setPreset] = useState<ZeitraumPreset>("laufendes_jahr");
  const [von, setVon] = useState(() => presetRange("laufendes_jahr").von);
  const [bis, setBis] = useState(() => presetRange("laufendes_jahr").bis);
  const [data, setData] = useState<ObjektFinanzPortalPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [berichtOpen, setBerichtOpen] = useState(false);
  const [belegFilter, setBelegFilter] = useState<BelegFilter>("alle");
  const [listPage, setListPage] = useState(1);

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

  const allBelege = useMemo(() => {
    const merged = [...(data?.belege ?? [])];
    const hrefSeen = new Set(merged.map((b) => b.href).filter(Boolean));
    for (const [leadId, docs] of Object.entries(dokumenteByLeadId)) {
      for (const d of docs) {
        if (d.href && hrefSeen.has(d.href)) continue;
        merged.push({
          id: d.id,
          datum: d.datum?.slice(0, 10) ?? "",
          name: d.name,
          leadId,
          vorgangTitel: "Vorgang",
          betragEuro: null,
          href: d.href?.trim() || null,
          art: docArt(d.name ?? ""),
        });
      }
    }
    return merged
      .filter((b) => {
        const day = b.datum?.slice(0, 10) ?? "";
        if (!day) return true;
        return day >= von && day <= bis;
      })
      .sort((a, b) => (b.datum ?? "").localeCompare(a.datum ?? ""));
  }, [data?.belege, dokumenteByLeadId, von, bis]);

  const filteredBelege = useMemo(() => {
    if (belegFilter === "rechnungen") return allBelege.filter((b) => b.art === "rechnung");
    if (belegFilter === "protokolle") return allBelege.filter((b) => b.art === "protokoll");
    if (belegFilter === "angebote") return allBelege.filter((b) => b.art === "angebot");
    return allBelege;
  }, [allBelege, belegFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredBelege.length / PORTAL_LIST_PAGE_SIZE));
  const safePage = Math.min(listPage, totalPages);
  const pageBelege = filteredBelege.slice(
    (safePage - 1) * PORTAL_LIST_PAGE_SIZE,
    safePage * PORTAL_LIST_PAGE_SIZE
  );

  const jahr = von.slice(0, 4);
  const gewerkHint =
    data && data.nachGewerk.length > 0
      ? data.nachGewerk.slice(0, 3).map((g) => `${g.gewerk} (${g.count})`).join(" · ")
      : "—";

  return (
    <div className="space-y-3">
      <EinstellungenSectionHeader
        title="Kosten & Belege"
        trailing={
          <div className="relative">
            <button
              type="button"
              className="portal-btn portal-btn-secondary inline-flex items-center gap-1.5 text-[13px]"
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
                    href={`/api/org/objekte/bericht?objektId=${encodeURIComponent(objektId)}&jahr=${encodeURIComponent(jahr)}`}
                    onClick={() => setExportOpen(false)}
                  >
                    Jahresbericht (PDF)
                  </a>
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
      />
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
                : "bg-muted text-text-secondary"
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
        <p className="portal-text-meta text-text-tertiary">Wird geladen …</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <KpiTile
              label={`Kosten ${jahr}`}
              value={fmtEuro(data?.gesamtKosten ?? 0)}
              muted={!data?.rechnungenAnzahl}
            />
            <KpiTile
              label="Rechnungen"
              value={String(data?.rechnungenAnzahl ?? 0)}
            />
            <KpiTile
              label="Offen / in Arbeit"
              value={String(data?.offenInArbeit ?? 0)}
            />
            <KpiTile
              label="Ohne Betrag"
              value={String(data?.ohneBetrag ?? 0)}
              muted={(data?.ohneBetrag ?? 0) === 0}
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
          <p className="portal-text-meta text-text-tertiary">
            Nach Gewerk: {gewerkHint}
          </p>
        </>
      )}

      <BelegSection
        belegFilter={belegFilter}
        setBelegFilter={(f) => {
          setBelegFilter(f);
          setListPage(1);
        }}
        pageBelege={pageBelege}
        filteredCount={filteredBelege.length}
        safePage={safePage}
        totalPages={totalPages}
        onPageChange={setListPage}
        onOpenVorgang={onOpenVorgang}
      />

      <OrganisationVersammlungsberichtSheet
        open={berichtOpen}
        onClose={() => setBerichtOpen(false)}
        objektId={objektId}
      />
    </div>
  );
}

function KpiTile({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div
      className="rounded-[10px] px-3.5 py-3"
      style={{ background: "var(--p2-selected, #f0f2f0)" }}
    >
      <p className={cn("portal-text-title leading-none", muted && "text-text-tertiary")}>
        {value}
      </p>
      <p className="portal-text-label mt-1.5 normal-case tracking-normal">{label}</p>
    </div>
  );
}

function BelegSection(props: {
  belegFilter: BelegFilter;
  setBelegFilter: (f: BelegFilter) => void;
  pageBelege: ObjektFinanzPortalPayload["belege"];
  filteredCount: number;
  safePage: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onOpenVorgang?: (id: string) => void;
}) {
  const filters: Array<[BelegFilter, string]> = [["alle", "Alle"], ["rechnungen", "Rechnungen"], ["protokolle", "Protokolle"], ["angebote", "Angebote"]];
  return (
    <div className="space-y-3 border-t pt-4" style={{ borderColor: PORTAL_VAR.line }}>
      <div className="flex flex-wrap gap-1.5">
        {filters.map(([id, label]) => (
          <button key={id} type="button" onClick={() => props.setBelegFilter(id)} className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", props.belegFilter === id ? "bg-accent-light text-accent" : "bg-muted text-text-secondary")}>
            {label}
          </button>
        ))}
      </div>
      {props.filteredCount === 0 ? (
        <p className="portal-text-meta rounded-xl border border-dashed px-3 py-5 text-center text-text-secondary">Noch keine Belege in diesem Zeitraum.</p>
      ) : (
        <>
          <ul className="divide-y divide-border-light">
            {props.pageBelege.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-[13px]">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => props.onOpenVorgang?.(b.leadId)}>
                  <span className="font-medium">{b.name}</span>
                  <span className="portal-text-meta mt-0.5 block text-text-tertiary">{fmtDatum(b.datum)} · {b.vorgangTitel}</span>
                </button>
                <span className="font-semibold">{b.betragEuro != null ? fmtEuro(b.betragEuro) : "—"}</span>
                {b.href ? (
                  <a href={b.href} target="_blank" rel="noopener noreferrer" className="text-accent" title="Download"><Download className="h-4 w-4" /></a>
                ) : null}
              </li>
            ))}
          </ul>
          <PortalListPagination currentPage={props.safePage} totalPages={props.totalPages} totalItems={props.filteredCount} onPageChange={props.onPageChange} itemLabel="Belege" />
        </>
      )}
    </div>
  );
}
