"use client";

type GptVizEinstiegProps = {
  onMitFoto: () => void;
  onMitIdee: () => void;
};

export function GptVizEinstieg({ onMitFoto, onMitIdee }: GptVizEinstiegProps) {
  return (
    <div className="gpt-viz-cards">
      <p className="gpt-viz-muted">
        So könnte dein Raum aussehen — und so bauen wir ihn. Wähle deinen Einstieg:
      </p>
      <button type="button" className="gpt-viz-card" onClick={onMitFoto}>
        <h3>Mit Foto starten</h3>
        <p>Foto hochladen → Raum erkennen → Stil wählen → visualisieren</p>
      </button>
      <button type="button" className="gpt-viz-card" onClick={onMitIdee}>
        <h3>Mit Idee starten</h3>
        <p>Wunsch beschreiben → optional Foto nachreichen → visualisieren</p>
      </button>
    </div>
  );
}
