"use client";

import { GptZielbildCard } from "@/components/gpt/GptZielbildCard";
import type { GptVizRenderVersion } from "@/lib/gpt-viz/types";

type GptVizBeforeAfterProps = {
  istUrl: string;
  ergebnisUrl: string;
  historie: GptVizRenderVersion[];
  onVersionSelect: (url: string) => void;
  beschreibung?: string;
};

export function GptVizBeforeAfter({
  istUrl,
  ergebnisUrl,
  historie,
  onVersionSelect,
  beschreibung = "",
}: GptVizBeforeAfterProps) {
  return (
    <div className="gpt-viz-result-layout">
      <div className="gpt-viz-result-compare">
        {historie.length > 1 ? (
          <div className="gpt-viz-versions" style={{ marginBottom: "0.5rem" }}>
            {historie.map((v, i) => (
              <button
                key={v.created_at}
                type="button"
                className={
                  v.url === ergebnisUrl
                    ? "gpt-viz-version-btn gpt-viz-version-btn--active"
                    : "gpt-viz-version-btn"
                }
                onClick={() => onVersionSelect(v.url)}
              >
                Version {i + 1}
              </button>
            ))}
          </div>
        ) : null}
        <div className="gpt-viz-before-after">
          <figure>
            <figcaption>Vorher</figcaption>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={istUrl} alt="Ausgangszustand" />
          </figure>
          <figure>
            <figcaption>Nachher (Visualisierung)</figcaption>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ergebnisUrl} alt="Visualisierung" />
          </figure>
        </div>
      </div>

      <GptZielbildCard
        vorherUrl={istUrl}
        nachherUrl={ergebnisUrl}
        beschreibung={beschreibung}
        className="gpt-viz-result-zielbild"
      />
    </div>
  );
}
