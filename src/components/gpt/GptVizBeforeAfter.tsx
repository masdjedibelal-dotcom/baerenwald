"use client";

import { GptChatImageCard } from "@/components/gpt/GptChatImageCard";
import type { GptVizRenderVersion } from "@/lib/gpt-viz/types";

type GptVizBeforeAfterProps = {
  ergebnisUrl: string;
  historie: GptVizRenderVersion[];
  onVersionSelect: (url: string) => void;
};

export function GptVizBeforeAfter({
  ergebnisUrl,
  historie,
  onVersionSelect,
}: GptVizBeforeAfterProps) {
  return (
    <div className="gpt-viz-result-layout">
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
      <GptChatImageCard
        image={{
          url: ergebnisUrl,
          label: "Deine Visualisierung",
          downloadName: "baerenwald-visualisierung.jpg",
        }}
      />
    </div>
  );
}
