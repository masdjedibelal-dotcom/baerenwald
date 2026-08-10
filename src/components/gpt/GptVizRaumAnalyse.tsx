"use client";

import type { GptVizRaumAnalyse } from "@/lib/gpt-viz/types";

type GptVizRaumAnalyseProps = {
  analyse: GptVizRaumAnalyse;
  istBeschreibung: string;
  onIstChange: (v: string) => void;
  wunschText: string;
  onWunschChange: (v: string) => void;
  onStilWaehlen: (promptDe: string) => void;
};

export function GptVizRaumAnalysePanel({
  analyse,
  istBeschreibung,
  onIstChange,
  wunschText,
  onWunschChange,
  onStilWaehlen,
}: GptVizRaumAnalyseProps) {
  return (
    <div className="gpt-viz-root" style={{ padding: 0 }}>
      <p className="gpt-viz-muted">
        <strong>{analyse.raum_label}</strong>
        {analyse.einschaetzung ? ` — ${analyse.einschaetzung}` : null}
      </p>

      <div className="gpt-viz-field">
        <label htmlFor="gpt-ist">So sehen wir deinen Raum</label>
        <textarea
          id="gpt-ist"
          value={istBeschreibung}
          onChange={(e) => onIstChange(e.target.value)}
        />
      </div>

      {analyse.stil_vorschlaege.length > 0 ? (
        <div>
          <p className="gpt-viz-muted" style={{ marginBottom: "0.5rem" }}>
            Stil-Richtungen — antippen zum Übernehmen:
          </p>
          <div className="gpt-viz-stil-grid">
            {analyse.stil_vorschlaege.map((s) => (
              <button
                key={s.titel}
                type="button"
                className="gpt-viz-stil"
                onClick={() => onStilWaehlen(s.prompt_de)}
              >
                <strong>{s.titel}</strong>
                <span>{s.kurz}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="gpt-viz-field">
        <label htmlFor="gpt-wunsch">Dein Visualisierungswunsch</label>
        <textarea
          id="gpt-wunsch"
          value={wunschText}
          onChange={(e) => onWunschChange(e.target.value)}
        />
      </div>
    </div>
  );
}
