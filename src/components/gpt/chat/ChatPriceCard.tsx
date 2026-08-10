"use client";

import { formatCurrencyEUR } from "@/lib/price-calc";
import type { BwCalculatePriceResult } from "@/lib/funnel/price-calc";
import type { GuidedFunnelDraft } from "@/lib/guided-chat/types";
import { cn } from "@/lib/utils";

type ChatPriceCardProps = {
  result: BwCalculatePriceResult;
  draft: GuidedFunnelDraft;
  onAnfrage?: () => void;
  onAnpassen?: () => void;
  disabled?: boolean;
  className?: string;
};

export function ChatPriceCard({
  result,
  draft,
  onAnfrage,
  onAnpassen,
  disabled,
  className,
}: ChatPriceCardProps) {
  const hasRange = result.min > 0 && result.max > 0;

  return (
    <div className={cn("gpt-guided-price-card", className)}>
      <p className="gpt-guided-price-kicker">Dein Preisrahmen</p>
      <p className="gpt-guided-price-headline">
        {hasRange
          ? `${formatCurrencyEUR(result.min)} – ${formatCurrencyEUR(result.max)}`
          : "Wir melden uns mit einer Einschätzung"}
      </p>
      <p className="gpt-guided-price-sub">
        Unverbindlich · inkl. GU-Koordination
        <br />
        München & Umgebung{draft.plz ? ` · PLZ ${draft.plz}` : ""}
      </p>

      {result.breakdown.length > 0 ? (
        <details className="gpt-guided-price-details">
          <summary>Was steckt drin?</summary>
          <ul className="gpt-guided-price-breakdown">
            {result.breakdown.slice(0, 6).map((row) => (
              <li key={`${row.gewerk}-${row.beschreibung}`}>
                <span>{row.beschreibung || row.gewerk}</span>
                <span>
                  {formatCurrencyEUR(row.min)} – {formatCurrencyEUR(row.max)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="gpt-guided-price-actions">
        {onAnfrage ? (
          <button
            type="button"
            className="gpt-guided-primary-btn"
            disabled={disabled}
            onClick={onAnfrage}
          >
            Anfrage senden
          </button>
        ) : null}
        {onAnpassen ? (
          <button
            type="button"
            className="gpt-guided-outline-btn"
            disabled={disabled}
            onClick={onAnpassen}
          >
            Angaben anpassen
          </button>
        ) : null}
      </div>
    </div>
  );
}
