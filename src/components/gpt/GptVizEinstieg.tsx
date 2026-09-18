"use client";

type GptVizEinstiegProps = {
  onMitPrompt: () => void;
  onMitInspiration: () => void;
};

export function GptVizEinstieg({ onMitPrompt, onMitInspiration }: GptVizEinstiegProps) {
  return (
    <div className="gpt-viz-cards">
      <p className="gpt-viz-muted">
        So könnte Ihr Raum aussehen — und so bauen wir ihn. Wählen Sie Ihren Einstieg:
      </p>
      <button type="button" className="gpt-viz-card" onClick={onMitPrompt}>
        <h3>Mit Prompt starten</h3>
        <p>Wunsch beschreiben → Raumfoto hochladen → visualisieren</p>
      </button>
      <button type="button" className="gpt-viz-card" onClick={onMitInspiration}>
        <h3>Mit Inspirationsbild starten</h3>
        <p>Stil-Foto hochladen → Wunsch wird erstellt → Ihr Raumfoto → visualisieren</p>
      </button>
    </div>
  );
}
