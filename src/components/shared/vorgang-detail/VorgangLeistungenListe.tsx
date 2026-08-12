"use client";

import { cn } from "@/lib/utils";
import { moneyEur } from "@/lib/portal2/hv-detail";
import type {
  LeistungenMode,
  VorgangLeistungZeile,
} from "@/lib/vorgang/vorgang-detail-vm";

type Props = {
  items: VorgangLeistungZeile[];
  mode: LeistungenMode;
  summeBrutto?: number | null;
  summeEkNetto?: number | null;
  className?: string;
};

/**
 * Einheitliche Leistungsliste — Modi: vk (HV/Kunde) · ek (Partner) · plain (Mieter).
 */
export function VorgangLeistungenListe({
  items,
  mode,
  summeBrutto,
  summeEkNetto,
  className,
}: Props) {
  if (mode === "hidden" || items.length === 0) return null;

  const showVk = mode === "vk";
  const showEk = mode === "ek";
  const showPlain = mode === "plain";

  const gesamt =
    showVk && typeof summeBrutto === "number" && summeBrutto > 0
      ? summeBrutto
      : showEk && typeof summeEkNetto === "number" && summeEkNetto > 0
        ? summeEkNetto
        : showVk
          ? items.reduce((a, z) => a + (z.preisBrutto ?? 0), 0)
          : showEk
            ? items.reduce((a, z) => a + (z.preisEkNetto ?? 0), 0)
            : 0;

  return (
    <div className={cn("overflow-hidden", className)}>
      <ul className="divide-y divide-border-light">
        {items.map((p) => {
          const removed = p.aenderungBadge === "entfernt";
          const price =
            showVk && typeof p.preisBrutto === "number" && p.preisBrutto > 0
              ? moneyEur(p.preisBrutto)
              : showEk && typeof p.preisEkNetto === "number" && p.preisEkNetto > 0
                ? moneyEur(p.preisEkNetto)
                : showVk || showEk
                  ? "Preis folgt"
                  : null;

          return (
            <li
              key={p.id}
              className={cn(
                "flex items-start gap-4 px-0 py-3",
                removed && "bg-red-50/70"
              )}
            >
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-[13.5px] font-medium text-text-primary",
                    removed && "text-text-secondary line-through"
                  )}
                >
                  {p.title}
                </p>
                {(p.gewerk || p.menge || p.einheit) && !showPlain ? (
                  <p className="portal-text-meta mt-0.5 text-text-secondary">
                    {[p.gewerk, [p.menge, p.einheit].filter(Boolean).join(" ")]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
                {p.beschreibung ? (
                  <p className="portal-text-meta mt-0.5 text-text-secondary">
                    {p.beschreibung}
                  </p>
                ) : null}
                {p.aenderungBadge && p.aenderungBadge !== "entfernt" ? (
                  <p className="portal-text-meta mt-1 text-amber-800">
                    {p.aenderungBadge === "neu" ? "Neu" : "Geändert"}
                  </p>
                ) : null}
              </div>
              {price ? (
                <p className="shrink-0 text-[13px] font-semibold tabular-nums text-text-primary">
                  {price}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
      {gesamt > 0 && (showVk || showEk) ? (
        <div className="flex items-center justify-between border-t border-border-light px-0 py-2.5">
          <span className="text-[12.5px] font-semibold text-text-secondary">
            {showEk ? "Summe netto (Ihre Vergütung)" : "Gesamt brutto"}
          </span>
          <span className="text-[14px] font-bold tabular-nums text-text-primary">
            {moneyEur(gesamt)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
