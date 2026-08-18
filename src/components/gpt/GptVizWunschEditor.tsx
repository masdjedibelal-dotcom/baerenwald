"use client";

import { VIZ_NACHPROMPT_TAGS } from "@/lib/gpt-viz/constants";

type GptVizWunschEditorProps = {
  wunschText: string;
  onWunschChange: (v: string) => void;
  showNachprompt?: boolean;
  onNachprompt?: (tag: string) => void;
  hasPhoto: boolean;
};

export function GptVizWunschEditor({
  wunschText,
  onWunschChange,
  showNachprompt,
  onNachprompt,
  hasPhoto,
}: GptVizWunschEditorProps) {
  return (
    <div className="gpt-viz-field">
      <label htmlFor="gpt-wunsch-edit">Dein Wunsch (jederzeit änderbar)</label>
      <textarea
        id="gpt-wunsch-edit"
        value={wunschText}
        onChange={(e) => onWunschChange(e.target.value)}
        placeholder="z. B. helles Bad, Walk-in-Dusche, großformatige Fliesen …"
      />
      {!hasPhoto ? (
        <p className="gpt-viz-muted" style={{ marginTop: "0.5rem" }}>
          Für die Visualisierung wird noch ein Foto benötigt.
        </p>
      ) : null}
      {showNachprompt && onNachprompt ? (
        <div style={{ marginTop: "0.65rem" }}>
          <p className="gpt-viz-muted">Feintuning:</p>
          <div className="gpt-viz-chips">
            {VIZ_NACHPROMPT_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className="gpt-viz-chip"
                onClick={() => onNachprompt(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
