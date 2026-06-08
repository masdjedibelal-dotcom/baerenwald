"use client";

import type { GptVizRenderVersion } from "@/lib/gpt-viz/types";

type GptVizBeforeAfterProps = {
  istUrl: string;
  ergebnisUrl: string;
  historie: GptVizRenderVersion[];
  onVersionSelect: (url: string) => void;
};

export function GptVizBeforeAfter({
  istUrl,
  ergebnisUrl,
  historie,
  onVersionSelect,
}: GptVizBeforeAfterProps) {
  return (
    <div>
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
  );
}
