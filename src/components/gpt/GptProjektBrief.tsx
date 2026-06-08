"use client";

import { useGptProjekt } from "@/components/gpt/gpt-projekt-context";

type GptProjektBriefProps = {
  onAnfrage?: () => void;
  onVisualisieren?: () => void;
};

export function GptProjektBriefPanel({
  onAnfrage,
  onVisualisieren,
}: GptProjektBriefProps) {
  const { brief, loadingBrief, sessionId } = useGptProjekt();

  if (!sessionId) {
    return (
      <div className="gpt-projekt-brief">
        <p className="gpt-viz-muted">
          Starte in Beratung oder Raum visualisieren — dein Projekt-Brief wächst mit.
        </p>
      </div>
    );
  }

  if (loadingBrief && !brief) {
    return (
      <div className="gpt-projekt-brief">
        <p className="gpt-viz-muted">Projekt wird geladen …</p>
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="gpt-projekt-brief">
        <p className="gpt-viz-muted">Session abgelaufen — bitte neu starten.</p>
      </div>
    );
  }

  const hasContent =
    brief.ist_bilder_urls.length > 0 ||
    brief.wunsch_text ||
    brief.ergebnis_bild_url ||
    brief.ki_chat_verlauf.length > 0;

  return (
    <div className="gpt-projekt-brief">
      <h2 className="gpt-viz-step-title">Mein Projekt</h2>
      <p className="gpt-viz-muted" style={{ marginBottom: "0.75rem" }}>
        Das sendest du mit deiner Anfrage an Bärenwald.
      </p>

      {!hasContent ? (
        <p className="gpt-viz-muted">Noch leer — leg los in Beratung oder Visualisierung.</p>
      ) : null}

      {brief.raum_analyse ? (
        <div className="gpt-projekt-section">
          <h4>Raum</h4>
          <p>
            <strong>{brief.raum_analyse.raum_label}</strong>
            <br />
            {brief.raum_analyse.ist_beschreibung}
          </p>
        </div>
      ) : null}

      {brief.wunsch_text ? (
        <div className="gpt-projekt-section">
          <h4>Wunsch</h4>
          <p>{brief.wunsch_text}</p>
        </div>
      ) : null}

      {brief.ziel_bild_url ? (
        <div className="gpt-projekt-section">
          <h4>Inspirationsbild</h4>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brief.ziel_bild_url}
            alt="Inspirationsbild"
            className="gpt-viz-preview-img"
          />
        </div>
      ) : null}

      {brief.ist_bilder_urls[0] ? (
        <div className="gpt-projekt-section">
          <h4>Dein Raum (Ist)</h4>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brief.ist_bilder_urls[0]}
            alt="Raumfoto"
            className="gpt-viz-preview-img"
          />
        </div>
      ) : null}

      {brief.ergebnis_bild_url ? (
        <div className="gpt-projekt-section">
          <h4>Visualisierung (Ziel)</h4>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brief.ergebnis_bild_url}
            alt="Visualisierung"
            className="gpt-viz-preview-img"
          />
        </div>
      ) : null}

      {brief.gpt_erklaerung ? (
        <div className="gpt-projekt-section">
          <h4>Bau-Erklärung</h4>
          <p>{brief.gpt_erklaerung.zusammenfassung}</p>
        </div>
      ) : null}

      {brief.ki_chat_verlauf.length > 0 ? (
        <div className="gpt-projekt-section">
          <h4>Beratung ({brief.ki_chat_verlauf.length} Nachrichten)</h4>
          <p className="gpt-viz-muted">Chat-Verlauf wird mit der Anfrage übermittelt.</p>
        </div>
      ) : null}

      <div className="gpt-viz-actions">
        {onVisualisieren && !brief.ergebnis_bild_url ? (
          <button
            type="button"
            className="gpt-viz-btn gpt-viz-btn--outline"
            onClick={onVisualisieren}
          >
            Raum visualisieren
          </button>
        ) : null}
        {onAnfrage && brief.ergebnis_bild_url ? (
          <button
            type="button"
            className="gpt-viz-btn gpt-viz-btn--primary"
            onClick={onAnfrage}
          >
            Anfrage senden
          </button>
        ) : null}
      </div>
    </div>
  );
}
