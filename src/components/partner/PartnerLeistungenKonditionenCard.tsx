"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";

import { PartnerPreisBearbeitenDialog } from "@/components/partner/PartnerPreisBearbeitenDialog";
import { fmtPartnerEuro } from "@/lib/partner/partner-detail-format";
import {
  PARTNER_KONDITION_MWST,
  summeKonditionBrutto,
  summeKonditionNetto,
  type PartnerKonditionZeile,
} from "@/lib/partner/partner-konditionen";
import { PARTNER_LEISTUNGEN_ANGEBOTSPREIS_LABEL } from "@/lib/partner/partner-portal-display";
import { stripHtmlToPlainText } from "@/lib/portal/portal-display";
import { cn } from "@/lib/utils";

const GRID_COLS = "sm:grid-cols-[1fr_11rem]";

function angebotspreis(
  z: PartnerKonditionZeile,
  mode: Props["mode"],
  hwValues?: Record<string, string>
): string {
  if (mode === "readonly") {
    if (z.hwNetto != null && z.hwNetto > 0) return fmtPartnerEuro(z.hwNetto);
    if (z.vorschlagNetto != null && z.vorschlagNetto > 0) return fmtPartnerEuro(z.vorschlagNetto);
    return "Preis folgt";
  }
  const raw = hwValues?.[z.id] ?? "";
  if (raw.trim()) {
    const n = Number(raw.replace(",", "."));
    if (Number.isFinite(n) && n >= 0) return fmtPartnerEuro(n);
  }
  if (z.vorschlagNetto != null && z.vorschlagNetto > 0) return fmtPartnerEuro(z.vorschlagNetto);
  return "Preis folgt";
}

function isZeileGeaendert(z: PartnerKonditionZeile, hwValues?: Record<string, string>): boolean {
  const raw = hwValues?.[z.id] ?? "";
  if (!raw.trim()) return false;
  const hw = Number(raw.replace(",", "."));
  if (!Number.isFinite(hw)) return false;
  if (z.vorschlagNetto == null || z.vorschlagNetto <= 0) return hw > 0;
  return Math.abs(hw - z.vorschlagNetto) > 0.009;
}

function zeilenNotiz(
  z: PartnerKonditionZeile,
  mode: Props["mode"],
  hwNotizen?: Record<string, string>
): string | undefined {
  const fromState = hwNotizen?.[z.id]?.trim();
  if (fromState) return fromState;
  if (mode === "readonly" && z.hwNotiz?.trim()) return z.hwNotiz.trim();
  return undefined;
}

type Props = {
  zeilen: PartnerKonditionZeile[];
  /** `edit` = Preis per Popup; `readonly` = gleiche Ansicht ohne Bearbeitung */
  mode: "edit" | "readonly";
  hwValues?: Record<string, string>;
  hwNotizen?: Record<string, string>;
  onHwChange?: (id: string, value: string) => void;
  onHwNotizChange?: (id: string, value: string) => void;
  gesamtLabel?: string;
};

export function PartnerLeistungenKonditionenCard({
  zeilen,
  mode,
  hwValues,
  hwNotizen,
  onHwChange,
  onHwNotizChange,
  gesamtLabel = "Vergütung Brutto inkl. MwSt.",
}: Props) {
  const [editId, setEditId] = useState<string | null>(null);
  const [draftPreis, setDraftPreis] = useState("");
  const [draftNotiz, setDraftNotiz] = useState("");

  if (!zeilen.length) return null;

  const useHwForSum = true;
  const sumZeilen = zeilen.map((z) => {
    if (mode === "edit" && hwValues) {
      const raw = hwValues[z.id] ?? "";
      const n = raw.trim() ? Number(raw.replace(",", ".")) : null;
      const hwNetto = n != null && Number.isFinite(n) ? n : z.hwNetto ?? z.vorschlagNetto;
      return { ...z, hwNetto };
    }
    return z;
  });
  const sumNetto = summeKonditionNetto(sumZeilen, useHwForSum);
  const sumBrutto = summeKonditionBrutto(sumZeilen, useHwForSum);
  const sumMwst = Math.round((sumBrutto - sumNetto) * 100) / 100;

  const editZeile = editId ? zeilen.find((z) => z.id === editId) : null;

  function openEdit(z: PartnerKonditionZeile) {
    const current = hwValues?.[z.id] ?? "";
    setEditId(z.id);
    setDraftPreis(
      current ||
        (z.vorschlagNetto != null && z.vorschlagNetto > 0
          ? String(z.vorschlagNetto).replace(".", ",")
          : "")
    );
    setDraftNotiz(hwNotizen?.[z.id] ?? z.hwNotiz ?? "");
  }

  function confirmEdit() {
    if (!editId) return;
    onHwChange?.(editId, draftPreis.trim());
    onHwNotizChange?.(editId, draftNotiz.trim());
    setEditId(null);
    setDraftPreis("");
    setDraftNotiz("");
  }

  function cancelEdit() {
    setEditId(null);
    setDraftPreis("");
    setDraftNotiz("");
  }

  return (
    <>
      <div className="portal-text-body overflow-hidden rounded-xl border border-border-light bg-muted/20">
        <div
          className={cn(
            "hidden gap-3 border-b border-border-light bg-muted/30 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-tertiary sm:grid",
            GRID_COLS
          )}
        >
          <span>Leistung</span>
          <span className="text-right">{PARTNER_LEISTUNGEN_ANGEBOTSPREIS_LABEL}</span>
        </div>

        <ul>
          {zeilen.map((z) => {
            const title = stripHtmlToPlainText(z.title) || z.title;
            const geaendert =
              mode === "readonly" ? z.geaendert : isZeileGeaendert(z, hwValues);
            const preis = angebotspreis(z, mode, hwValues);
            const notiz = zeilenNotiz(z, mode, hwNotizen);
            const preisFolgt = preis === "Preis folgt";

            return (
              <li
                key={z.id}
                className={cn(
                  "border-b border-border-light px-4 py-3.5 last:border-b-0",
                  geaendert && "bg-amber-50/60"
                )}
              >
                <div className={cn("grid gap-3 sm:items-start", GRID_COLS)}>
                  <div className="min-w-0">
                    <p className="font-medium text-text-primary">{title}</p>
                    {z.beschreibung ? (
                      <p className="portal-text-meta mt-0.5 text-text-secondary">
                        {stripHtmlToPlainText(z.beschreibung)}
                      </p>
                    ) : null}
                  </div>

                  <div className="sm:text-right">
                    <p className="text-sm text-text-tertiary sm:hidden">
                      {PARTNER_LEISTUNGEN_ANGEBOTSPREIS_LABEL}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-lg font-bold tabular-nums sm:text-right",
                        preisFolgt
                          ? "text-sm font-normal italic text-text-tertiary"
                          : geaendert
                            ? "text-amber-800"
                            : "text-text-primary"
                      )}
                    >
                      {preis}
                    </p>
                    {z.vorherNetto != null &&
                    z.vorherNetto > 0 &&
                    preis !== "Preis folgt" &&
                    Math.abs(z.vorherNetto - (mode === "edit"
                      ? Number((hwValues?.[z.id] ?? "").replace(",", ".")) || z.vorschlagNetto || 0
                      : z.hwNetto ?? z.vorschlagNetto ?? 0)) > 0.009 ? (
                      <p className="mt-0.5 text-sm tabular-nums text-text-tertiary line-through sm:text-right">
                        vorher {fmtPartnerEuro(z.vorherNetto)}
                      </p>
                    ) : null}
                    {geaendert ? (
                      <span className="mt-0.5 block text-xs font-medium text-amber-700 sm:text-right">
                        Geändert
                      </span>
                    ) : null}
                    {notiz ? (
                      <p className="portal-text-meta mt-1.5 text-text-secondary sm:text-right">
                        „{notiz}"
                      </p>
                    ) : null}

                    {mode === "edit" ? (
                      <button
                        type="button"
                        onClick={() => openEdit(z)}
                        className="portal-touch-target mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent-light/20 px-3 py-2.5 text-sm font-semibold text-accent hover:bg-accent-light/40 sm:mt-2 sm:w-auto sm:justify-end"
                      >
                        <Pencil className="h-4 w-4 shrink-0" aria-hidden />
                        Preis bearbeiten
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {sumNetto > 0 ? (
          <div className="border-t border-border-default bg-muted/40 px-4 py-3.5">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-text-tertiary">Summe netto</span>
              <span className="font-medium tabular-nums text-text-primary">
                {fmtPartnerEuro(sumNetto)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-4 text-sm">
              <span className="text-text-tertiary">MwSt. ({PARTNER_KONDITION_MWST} %)</span>
              <span className="tabular-nums text-text-secondary">{fmtPartnerEuro(sumMwst)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-4 border-t border-border-light pt-2">
              <span className="font-semibold text-text-primary">{gesamtLabel}</span>
              <span className="text-lg font-bold tabular-nums text-text-primary">
                {fmtPartnerEuro(sumBrutto)}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {editZeile ? (
        <PartnerPreisBearbeitenDialog
          open
          leistungTitle={stripHtmlToPlainText(editZeile.title) || editZeile.title}
          vorschlagNetto={editZeile.vorschlagNetto}
          value={draftPreis}
          onChange={setDraftPreis}
          notiz={draftNotiz}
          onNotizChange={setDraftNotiz}
          onConfirm={confirmEdit}
          onCancel={cancelEdit}
        />
      ) : null}
    </>
  );
}
