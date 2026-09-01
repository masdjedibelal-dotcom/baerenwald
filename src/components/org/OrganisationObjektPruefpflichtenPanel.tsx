"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { PortalActionMenu } from "@/components/shared/PortalActionMenu";
import { PortalDetailCard } from "@/components/shared/PortalDetailCard";
import { PortalEntityCard } from "@/components/shared/PortalEntityCard";
import { PortalInboxEmpty } from "@/components/shared/PortalEmptyState";
import { PortalInlineLoading } from "@/components/shared/PortalInlineLoading";
import { PortalModalShell } from "@/components/shared/PortalModalShell";
import {
  PRUEFPFLICHT_BADGE_LABEL,
  PRUEFPFLICHT_TYPEN,
  addMonthsIso,
  pruefpflichtTypBySchluessel,
  resolvePruefpflichtBadge,
  type PruefpflichtBadgeStatus,
} from "@/lib/org/pruefpflichten-catalog";
import { portalToastError, portalToastSaved } from "@/lib/shared/portal-toast";
import { cn } from "@/lib/utils";

type Pruefpflicht = {
  id: string;
  typ: string;
  typ_schluessel?: string | null;
  intervall_monate?: number | null;
  letzte_pruefung?: string | null;
  naechste_faellig?: string | null;
  notiz?: string | null;
  geaendert_am?: string | null;
  geaendert_von_name?: string | null;
};

const BADGE_CLASS: Record<PruefpflichtBadgeStatus, string> = {
  ueberfaellig: "bg-red-100 text-red-800",
  bald_faellig: "bg-amber-100 text-amber-900",
  ok: "bg-emerald-50 text-emerald-800",
  kein_datum: "bg-muted text-text-secondary",
};

const GROUP_ORDER: PruefpflichtBadgeStatus[] = [
  "ueberfaellig",
  "bald_faellig",
  "ok",
  "kein_datum",
];

function fmtDatum(iso: string | null | undefined): string {
  const d = iso?.trim()?.slice(0, 10);
  if (!d) return "";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString("de-DE");
}

export function OrganisationObjektPruefpflichtenPanel({ objektId }: { objektId: string }) {
  const [items, setItems] = useState<Pruefpflicht[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [typSchluessel, setTypSchluessel] = useState("legionellen");
  const [sonstigesLabel, setSonstigesLabel] = useState("");
  const [naechste, setNaechste] = useState("");
  const [letzte, setLetzte] = useState("");
  const [intervall, setIntervall] = useState("");
  const [notiz, setNotiz] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/org/objekte/pruefpflichten?objektId=${objektId}`);
      const json = (await res.json()) as { items?: Pruefpflicht[] };
      setItems(json.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [objektId]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<PruefpflichtBadgeStatus, Pruefpflicht[]>();
    for (const g of GROUP_ORDER) map.set(g, []);
    for (const p of items) {
      const b = resolvePruefpflichtBadge(p.naechste_faellig);
      map.get(b)?.push(p);
    }
    for (const g of GROUP_ORDER) {
      map.get(g)?.sort((a, b) => {
        const da = a.naechste_faellig ?? "9999";
        const db = b.naechste_faellig ?? "9999";
        return da.localeCompare(db);
      });
    }
    return map;
  }, [items]);

  function openCreate() {
    setEditId(null);
    setTypSchluessel("legionellen");
    setSonstigesLabel("");
    setNaechste("");
    setLetzte("");
    setIntervall(String(pruefpflichtTypBySchluessel("legionellen")?.intervallMonate ?? ""));
    setNotiz("");
    setSheetOpen(true);
  }

  function openEdit(p: Pruefpflicht) {
    setEditId(p.id);
    setTypSchluessel(p.typ_schluessel ?? "sonstiges");
    setSonstigesLabel(p.typ_schluessel ? "" : p.typ);
    setNaechste(p.naechste_faellig?.slice(0, 10) ?? "");
    setLetzte(p.letzte_pruefung?.slice(0, 10) ?? "");
    setIntervall(p.intervall_monate != null ? String(p.intervall_monate) : "");
    setNotiz(p.notiz ?? "");
    setSheetOpen(true);
  }

  async function save() {
    const def = pruefpflichtTypBySchluessel(typSchluessel);
    if (!def) return;
    if (typSchluessel === "sonstiges" && !sonstigesLabel.trim()) {
      portalToastError("Bitte Bezeichnung für Sonstiges angeben.");
      return;
    }
    setBusy(true);
    try {
      const body = {
        objektId,
        typSchluessel,
        typLabel: typSchluessel === "sonstiges" ? sonstigesLabel.trim() : undefined,
        naechsteFaellig: naechste || undefined,
        letztePruefung: letzte || undefined,
        intervallMonate: intervall ? Number(intervall) : undefined,
        notiz: notiz.trim() || undefined,
      };
      const res = editId
        ? await fetch(`/api/org/objekte/pruefpflichten/${editId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/org/objekte/pruefpflichten", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        portalToastError(json.error ?? "Speichern fehlgeschlagen");
        return;
      }
      portalToastSaved();
      setSheetOpen(false);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function archivieren(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/org/objekte/pruefpflichten/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archiviert" }),
      });
      if (res.ok) await load();
    } finally {
      setBusy(false);
    }
  }

  const vorschlagNaechste =
    letzte && intervall && !naechste
      ? addMonthsIso(letzte, Number(intervall))
      : "";

  return (
    <PortalDetailCard
      title="Prüfpflichten & Wartung"
      onAdd={openCreate}
      addLabel="Prüfpflicht hinzufügen"
    >
      {loading ? (
        <PortalInlineLoading label="Prüfpflichten werden geladen" />
      ) : items.length === 0 ? (
        <PortalInboxEmpty
          title="Noch keine Prüfpflichten"
          description="Tragen Sie wiederkehrende Prüfungen ein — z. B. Legionellen, Rauchmelder, Heizungswartung."
          compact
        />
      ) : (
        <div className="space-y-2">
          {GROUP_ORDER.map((group) => {
            const rows = grouped.get(group) ?? [];
            if (!rows.length) return null;
            return rows.map((p) => {
              const badge = resolvePruefpflichtBadge(p.naechste_faellig);
              return (
                <PortalEntityCard
                  key={p.id}
                  title={p.typ}
                  badge={
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        BADGE_CLASS[badge]
                      )}
                    >
                      {PRUEFPFLICHT_BADGE_LABEL[badge]}
                    </span>
                  }
                  meta={
                    <p className="text-[13px] text-text-secondary">
                      {p.naechste_faellig
                        ? `Fällig ${fmtDatum(p.naechste_faellig)}`
                        : "Kein Fälligkeitsdatum"}
                    </p>
                  }
                  menu={
                    <PortalActionMenu
                      title={p.typ}
                      triggerLabel="Prüfpflicht-Menü"
                      variant="popover"
                      items={[
                        {
                          label: "Bearbeiten",
                          onClick: () => openEdit(p),
                        },
                        {
                          label: "Archivieren",
                          danger: true,
                          dividerBefore: true,
                          onClick: () => void archivieren(p.id),
                        },
                      ]}
                    />
                  }
                />
              );
            });
          })}
        </div>
      )}

      <PortalModalShell
        open={sheetOpen}
        onClose={() => !busy && setSheetOpen(false)}
        title={editId ? "Prüfpflicht bearbeiten" : "Prüfpflicht hinzufügen"}
        confirmLabel={busy ? "Speichern …" : "Speichern"}
        onConfirm={() => void save()}
        confirmDisabled={busy}
        dirty
        busy={busy}
      >
        <div className="space-y-3">
          <label className="block text-[13px]">
            <span className="portal-text-label mb-1 block">Typ</span>
            <select
              className="portal-field w-full"
              value={typSchluessel}
              disabled={Boolean(editId)}
              onChange={(e) => {
                const v = e.target.value;
                setTypSchluessel(v);
                const t = pruefpflichtTypBySchluessel(v);
                if (t?.intervallMonate) setIntervall(String(t.intervallMonate));
              }}
            >
              {PRUEFPFLICHT_TYPEN.map((t) => (
                <option key={t.schluessel} value={t.schluessel}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          {typSchluessel === "sonstiges" ? (
            <input
              className="portal-field w-full"
              placeholder="Bezeichnung"
              value={sonstigesLabel}
              onChange={(e) => setSonstigesLabel(e.target.value)}
            />
          ) : null}
          <label className="block text-[13px]">
            <span className="portal-text-label mb-1 block">Nächste Fälligkeit</span>
            <input type="date" className="portal-field w-full" value={naechste} onChange={(e) => setNaechste(e.target.value)} />
          </label>
          {vorschlagNaechste ? (
            <button
              type="button"
              className="text-xs font-semibold text-accent"
              onClick={() => setNaechste(vorschlagNaechste)}
            >
              Vorschlag übernehmen: {fmtDatum(vorschlagNaechste)}
            </button>
          ) : null}
          <label className="block text-[13px]">
            <span className="portal-text-label mb-1 block">Letzte Prüfung</span>
            <input type="date" className="portal-field w-full" value={letzte} onChange={(e) => setLetzte(e.target.value)} />
          </label>
          <label className="block text-[13px]">
            <span className="portal-text-label mb-1 block">Intervall (Monate)</span>
            <select className="portal-field w-full" value={intervall} onChange={(e) => setIntervall(e.target.value)}>
              <option value="">Keins</option>
              {[6, 12, 24, 36, 48].map((m) => (
                <option key={m} value={m}>
                  {m} Monate
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[13px]">
            <span className="portal-text-label mb-1 block">Notiz</span>
            <textarea className="portal-field w-full min-h-[72px]" value={notiz} onChange={(e) => setNotiz(e.target.value)} maxLength={500} />
          </label>
        </div>
      </PortalModalShell>
    </PortalDetailCard>
  );
}
